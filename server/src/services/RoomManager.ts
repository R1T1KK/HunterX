import crypto from "node:crypto";
import { z } from "zod";
import { Room, Player, RoomOperationResult } from "../types/index.js";

// Input validation schemas
export const callsignSchema = z
  .string()
  .trim()
  .min(3, "Callsign must be at least 3 characters")
  .max(16, "Callsign cannot exceed 16 characters")
  .regex(/^[a-zA-Z0-9_-]+$/, "Callsign can only contain letters, numbers, underscores and dashes");

export const roomCodeSchema = z
  .string()
  .trim()
  .length(6, "Room code must be exactly 6 characters")
  .regex(/^[A-Z0-9]+$/, "Room code must be uppercase alphanumeric");

export const createRoomInputSchema = z.object({
  hostPlayerId: z.string().min(1, "Player ID is required"),
  callsign: callsignSchema,
  socketId: z.string().min(1, "Socket ID is required"),
});

export const joinRoomInputSchema = z.object({
  roomCode: roomCodeSchema,
  playerId: z.string().min(1, "Player ID is required"),
  callsign: callsignSchema,
  socketId: z.string().min(1, "Socket ID is required"),
});

export class RoomError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = "RoomError";
  }
}

// Unambiguous character set for high-contrast mobile readability
const ROOM_CODE_CHARSET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export class RoomManager {
  private rooms: Map<string, Room> = new Map();
  // Reverse lookup: socketId -> roomCode
  private socketToRoom: Map<string, string> = new Map();
  // Reverse lookup: playerId -> roomCode
  private playerToRoom: Map<string, string> = new Map();

  /**
   * Generates a cryptographically secure 6-character uppercase room code.
   */
  public generateRoomCode(): string {
    const maxAttempts = 100;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const bytes = crypto.randomBytes(6);
      let code = "";
      for (let i = 0; i < 6; i++) {
        const randomIndex = bytes[i] % ROOM_CODE_CHARSET.length;
        code += ROOM_CODE_CHARSET[randomIndex];
      }

      if (!this.rooms.has(code)) {
        return code;
      }
    }

    throw new RoomError("CODE_GENERATION_FAILED", "Unable to generate unique room code. Try again.");
  }

  /**
   * Creates a new room and assigns the caller as host.
   */
  public createRoom(input: z.infer<typeof createRoomInputSchema>): Room {
    const validated = createRoomInputSchema.parse(input);

    // If player already in a room, remove them first
    if (this.playerToRoom.has(validated.hostPlayerId)) {
      const existingCode = this.playerToRoom.get(validated.hostPlayerId)!;
      this.leaveRoom(existingCode, validated.hostPlayerId);
    }

    const roomCode = this.generateRoomCode();
    const now = new Date().toISOString();

    const hostPlayer: Player = {
      playerId: validated.hostPlayerId,
      socketId: validated.socketId,
      callsign: validated.callsign,
      joinedAt: now,
      isHost: true,
    };

    const room: Room = {
      roomCode,
      hostPlayerId: validated.hostPlayerId,
      createdAt: now,
      updatedAt: now,
      status: "WAITING",
      maxPlayers: 15,
      players: [hostPlayer],
    };

    this.rooms.set(roomCode, room);
    this.socketToRoom.set(validated.socketId, roomCode);
    this.playerToRoom.set(validated.hostPlayerId, roomCode);

    return room;
  }

  /**
   * Joins an existing room by 6-character room code.
   */
  public joinRoom(input: z.infer<typeof joinRoomInputSchema>): Room {
    const validated = joinRoomInputSchema.parse({
      ...input,
      roomCode: input.roomCode.toUpperCase().trim(),
    });

    const room = this.rooms.get(validated.roomCode);
    if (!room) {
      throw new RoomError("ROOM_NOT_FOUND", `Room with code '${validated.roomCode}' does not exist.`);
    }

    if (room.status !== "WAITING") {
      throw new RoomError("GAME_IN_PROGRESS", "This room has already started or completed.");
    }

    // Check if player is already in this room (reconnection / tab reload)
    const existingPlayerIndex = room.players.findIndex((p) => p.playerId === validated.playerId);
    if (existingPlayerIndex !== -1) {
      // Update socket ID and callsign
      const oldSocketId = room.players[existingPlayerIndex].socketId;
      this.socketToRoom.delete(oldSocketId);

      room.players[existingPlayerIndex].socketId = validated.socketId;
      room.players[existingPlayerIndex].callsign = validated.callsign;
      room.updatedAt = new Date().toISOString();

      this.socketToRoom.set(validated.socketId, validated.roomCode);
      return room;
    }

    // Capacity validation
    if (room.players.length >= room.maxPlayers) {
      throw new RoomError("ROOM_FULL", `Room has reached maximum capacity of ${room.maxPlayers} players.`);
    }

    const newPlayer: Player = {
      playerId: validated.playerId,
      socketId: validated.socketId,
      callsign: validated.callsign,
      joinedAt: new Date().toISOString(),
      isHost: false,
    };

    room.players.push(newPlayer);
    room.updatedAt = new Date().toISOString();

    this.socketToRoom.set(validated.socketId, validated.roomCode);
    this.playerToRoom.set(validated.playerId, validated.roomCode);

    return room;
  }

  /**
   * Removes a player from a room. Handles host reassignment and room cleanup.
   */
  public leaveRoom(roomCode: string, playerId: string): RoomOperationResult {
    const formattedCode = roomCode.toUpperCase().trim();
    const room = this.rooms.get(formattedCode);

    if (!room) {
      return { room: null, player: null, wasHost: false, isEmpty: true };
    }

    const playerIndex = room.players.findIndex((p) => p.playerId === playerId);
    if (playerIndex === -1) {
      return { room, player: null, wasHost: false, isEmpty: room.players.length === 0 };
    }

    const [removedPlayer] = room.players.splice(playerIndex, 1);
    this.socketToRoom.delete(removedPlayer.socketId);
    this.playerToRoom.delete(removedPlayer.playerId);

    const wasHost = room.hostPlayerId === playerId;
    let newHostId: string | undefined;

    if (room.players.length === 0) {
      // Room is empty, clean it up
      this.rooms.delete(formattedCode);
      return { room: null, player: removedPlayer, wasHost, isEmpty: true };
    }

    // If host left, promote the next oldest connected player
    if (wasHost) {
      room.players[0].isHost = true;
      room.hostPlayerId = room.players[0].playerId;
      newHostId = room.players[0].playerId;
    }

    room.updatedAt = new Date().toISOString();

    return {
      room,
      player: removedPlayer,
      wasHost,
      newHostId,
      isEmpty: false,
    };
  }

  /**
   * Removes player by their socket ID (for disconnect events).
   */
  public removeSocket(socketId: string): RoomOperationResult {
    const roomCode = this.socketToRoom.get(socketId);
    if (!roomCode) {
      return { room: null, player: null, wasHost: false, isEmpty: true };
    }

    const room = this.rooms.get(roomCode);
    if (!room) {
      this.socketToRoom.delete(socketId);
      return { room: null, player: null, wasHost: false, isEmpty: true };
    }

    const player = room.players.find((p) => p.socketId === socketId);
    if (!player) {
      this.socketToRoom.delete(socketId);
      return { room, player: null, wasHost: false, isEmpty: false };
    }

    return this.leaveRoom(roomCode, player.playerId);
  }

  public findRoom(roomCode: string): Room | undefined {
    return this.rooms.get(roomCode.toUpperCase().trim());
  }

  public findRoomByPlayerId(playerId: string): Room | undefined {
    const code = this.playerToRoom.get(playerId);
    return code ? this.rooms.get(code) : undefined;
  }

  public findRoomBySocketId(socketId: string): Room | undefined {
    const code = this.socketToRoom.get(socketId);
    return code ? this.rooms.get(code) : undefined;
  }

  public getRoomCount(): number {
    return this.rooms.size;
  }

  public clearAll(): void {
    this.rooms.clear();
    this.socketToRoom.clear();
    this.playerToRoom.clear();
  }
}

// Global Singleton Instance
export const roomManager = new RoomManager();

