import crypto from "node:crypto";
import { z } from "zod";
import {
  Room,
  Player,
  RoomOperationResult,
  HouseRules,
  RoleSettings,
  RulesPreset,
  GPSStatus,
  PlayerLocation,
} from "../types/index.js";

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

export const updateRulesSchema = z.object({
  roomCode: roomCodeSchema,
  requesterPlayerId: z.string().min(1),
  rules: z.object({
    preset: z.enum(["QUICK", "STANDARD", "BIG_PARK", "CUSTOM"]),
    roundLengthMinutes: z.number().min(1).max(60).optional(),
    headStartSeconds: z.number().min(5).max(300).optional(),
    pingIntervalSeconds: z.number().min(10).max(300).optional(),
    playZoneEnabled: z.boolean().optional(),
    zoneSizeMeters: z.number().min(100).max(5000).optional(),
    zoneShrinks: z.boolean().optional(),
    zoneShrinkIntervalMinutes: z.number().min(1).max(30).optional(),
    huntersCanTalk: z.boolean().optional(),
  }),
});

export const updateRoleSettingsSchema = z.object({
  roomCode: roomCodeSchema,
  requesterPlayerId: z.string().min(1),
  roleSettings: z.object({
    hunterCount: z.number().int().min(1).max(3),
    mode: z.enum(["HUNTER", "RUNNER", "RANDOM"]),
  }),
});

export class RoomError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = "RoomError";
  }
}

// Unambiguous character set for high-contrast mobile readability
const ROOM_CODE_CHARSET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export const HOUSE_RULES_PRESETS: Record<
  Exclude<RulesPreset, "CUSTOM">,
  Omit<HouseRules, "preset">
> = {
  QUICK: {
    roundLengthMinutes: 5,
    headStartSeconds: 15,
    pingIntervalSeconds: 30,
    playZoneEnabled: true,
    zoneSizeMeters: 250,
    zoneShrinks: false,
    zoneShrinkIntervalMinutes: 5,
    huntersCanTalk: true,
  },
  STANDARD: {
    roundLengthMinutes: 10,
    headStartSeconds: 30,
    pingIntervalSeconds: 60,
    playZoneEnabled: true,
    zoneSizeMeters: 500,
    zoneShrinks: false,
    zoneShrinkIntervalMinutes: 5,
    huntersCanTalk: true,
  },
  BIG_PARK: {
    roundLengthMinutes: 20,
    headStartSeconds: 60,
    pingIntervalSeconds: 90,
    playZoneEnabled: true,
    zoneSizeMeters: 1000,
    zoneShrinks: true,
    zoneShrinkIntervalMinutes: 5,
    huntersCanTalk: true,
  },
};

export class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private socketToRoom: Map<string, string> = new Map();
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
      isReady: false,
      gpsStatus: "ACQUIRING",
    };

    const room: Room = {
      roomCode,
      hostPlayerId: validated.hostPlayerId,
      createdAt: now,
      updatedAt: now,
      status: "WAITING",
      maxPlayers: 15,
      players: [hostPlayer],
      rules: {
        preset: "STANDARD",
        ...HOUSE_RULES_PRESETS.STANDARD,
      },
      roleSettings: {
        hunterCount: 1,
        mode: "RANDOM",
      },
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

    const existingPlayerIndex = room.players.findIndex((p) => p.playerId === validated.playerId);
    if (existingPlayerIndex !== -1) {
      // Reconnecting player: update socket and allow reconnect in ANY game state (LOBBY, COUNTDOWN, IN_PROGRESS)
      const oldSocketId = room.players[existingPlayerIndex].socketId;
      this.socketToRoom.delete(oldSocketId);

      room.players[existingPlayerIndex].socketId = validated.socketId;
      room.players[existingPlayerIndex].callsign = validated.callsign;
      room.updatedAt = new Date().toISOString();

      this.socketToRoom.set(validated.socketId, validated.roomCode);
      return room;
    }

    if (room.status !== "WAITING" && (room.status as string) !== "LOBBY") {
      throw new RoomError("GAME_IN_PROGRESS", "This room has already started or completed.");
    }

    if (room.players.length >= room.maxPlayers) {
      throw new RoomError("ROOM_FULL", `Room has reached maximum capacity of ${room.maxPlayers} players.`);
    }

    const newPlayer: Player = {
      playerId: validated.playerId,
      socketId: validated.socketId,
      callsign: validated.callsign,
      joinedAt: new Date().toISOString(),
      isHost: false,
      isReady: false,
      gpsStatus: "ACQUIRING",
    };

    room.players.push(newPlayer);
    room.updatedAt = new Date().toISOString();

    this.socketToRoom.set(validated.socketId, validated.roomCode);
    this.playerToRoom.set(validated.playerId, validated.roomCode);

    return room;
  }

  /**
   * Host regenerates the 6-character room code.
   * All existing players remain in the room; old code is invalidated.
   */
  public regenerateRoomCode(oldCode: string, requesterPlayerId: string): { oldCode: string; newCode: string; room: Room } {
    const formattedOld = oldCode.toUpperCase().trim();
    const room = this.rooms.get(formattedOld);

    if (!room) {
      throw new RoomError("ROOM_NOT_FOUND", "Room not found.");
    }

    if (room.hostPlayerId !== requesterPlayerId) {
      throw new RoomError("NOT_HOST", "Only the host can regenerate the room code.");
    }

    if (room.status !== "WAITING") {
      throw new RoomError("INVALID_STATE", "Cannot regenerate room code after game has started.");
    }

    const newCode = this.generateRoomCode();

    // Remove old code from rooms map, set new code
    this.rooms.delete(formattedOld);
    room.roomCode = newCode;
    room.updatedAt = new Date().toISOString();
    this.rooms.set(newCode, room);

    // Update reverse lookups for all players in this room
    for (const player of room.players) {
      this.playerToRoom.set(player.playerId, newCode);
      this.socketToRoom.set(player.socketId, newCode);
    }

    return { oldCode: formattedOld, newCode, room };
  }

  /**
   * Updates House Rules. If preset is selected, applies preset defaults.
   * If individual rules are changed, sets preset to CUSTOM.
   */
  public updateHouseRules(
    roomCode: string,
    requesterPlayerId: string,
    rulesUpdate: {
      preset: RulesPreset;
      roundLengthMinutes?: number;
      headStartSeconds?: number;
      pingIntervalSeconds?: number;
      playZoneEnabled?: boolean;
      zoneSizeMeters?: number;
      zoneShrinks?: boolean;
      zoneShrinkIntervalMinutes?: number;
      huntersCanTalk?: boolean;
    }
  ): Room {
    const formatted = roomCode.toUpperCase().trim();
    const room = this.rooms.get(formatted);

    if (!room) {
      throw new RoomError("ROOM_NOT_FOUND", "Room not found.");
    }

    if (room.hostPlayerId !== requesterPlayerId) {
      throw new RoomError("NOT_HOST", "Only the host can modify house rules.");
    }

    if (room.status !== "WAITING") {
      throw new RoomError("INVALID_STATE", "Cannot modify rules while game is starting or in progress.");
    }

    if (rulesUpdate.preset !== "CUSTOM") {
      // Apply exact preset defaults
      const presetDefaults = HOUSE_RULES_PRESETS[rulesUpdate.preset];
      room.rules = {
        preset: rulesUpdate.preset,
        ...presetDefaults,
      };
    } else {
      // Custom overrides
      room.rules = {
        ...room.rules,
        preset: "CUSTOM",
        ...(rulesUpdate.roundLengthMinutes !== undefined && { roundLengthMinutes: rulesUpdate.roundLengthMinutes }),
        ...(rulesUpdate.headStartSeconds !== undefined && { headStartSeconds: rulesUpdate.headStartSeconds }),
        ...(rulesUpdate.pingIntervalSeconds !== undefined && { pingIntervalSeconds: rulesUpdate.pingIntervalSeconds }),
        ...(rulesUpdate.playZoneEnabled !== undefined && { playZoneEnabled: rulesUpdate.playZoneEnabled }),
        ...(rulesUpdate.zoneSizeMeters !== undefined && { zoneSizeMeters: rulesUpdate.zoneSizeMeters }),
        ...(rulesUpdate.zoneShrinks !== undefined && { zoneShrinks: rulesUpdate.zoneShrinks }),
        ...(rulesUpdate.zoneShrinkIntervalMinutes !== undefined && { zoneShrinkIntervalMinutes: rulesUpdate.zoneShrinkIntervalMinutes }),
        ...(rulesUpdate.huntersCanTalk !== undefined && { huntersCanTalk: rulesUpdate.huntersCanTalk }),
      };
    }

    room.updatedAt = new Date().toISOString();
    return room;
  }

  /**
   * Updates Hunter headcount and role mode.
   */
  public updateRoleSettings(
    roomCode: string,
    requesterPlayerId: string,
    roleSettings: RoleSettings
  ): Room {
    const formatted = roomCode.toUpperCase().trim();
    const room = this.rooms.get(formatted);

    if (!room) {
      throw new RoomError("ROOM_NOT_FOUND", "Room not found.");
    }

    if (room.hostPlayerId !== requesterPlayerId) {
      throw new RoomError("NOT_HOST", "Only the host can configure role settings.");
    }

    if (room.status !== "WAITING") {
      throw new RoomError("INVALID_STATE", "Cannot configure roles while match is starting or active.");
    }

    if (roleSettings.hunterCount < 1 || roleSettings.hunterCount > 3) {
      throw new RoomError("INVALID_HUNTER_COUNT", "Hunter count must be 1, 2, or 3.");
    }

    room.roleSettings = {
      hunterCount: roleSettings.hunterCount,
      mode: roleSettings.mode,
    };

    room.updatedAt = new Date().toISOString();
    return room;
  }

  /**
   * Updates player ready/not-ready status.
   */
  public updatePlayerReady(roomCode: string, playerId: string, isReady: boolean): Room {
    const formatted = roomCode.toUpperCase().trim();
    const room = this.rooms.get(formatted);

    if (!room) {
      throw new RoomError("ROOM_NOT_FOUND", "Room not found.");
    }

    const player = room.players.find((p) => p.playerId === playerId);
    if (!player) {
      throw new RoomError("PLAYER_NOT_IN_ROOM", "Player is not in this room.");
    }

    player.isReady = isReady;
    room.updatedAt = new Date().toISOString();
    return room;
  }

  /**
   * Updates player GPS lock status.
   */
  public updatePlayerGPSStatus(roomCode: string, playerId: string, gpsStatus: GPSStatus): Room {
    const formatted = roomCode.toUpperCase().trim();
    const room = this.rooms.get(formatted);

    if (!room) {
      throw new RoomError("ROOM_NOT_FOUND", "Room not found.");
    }

    const player = room.players.find((p) => p.playerId === playerId);
    if (!player) {
      throw new RoomError("PLAYER_NOT_IN_ROOM", "Player is not in this room.");
    }

    player.gpsStatus = gpsStatus;
    room.updatedAt = new Date().toISOString();
    return room;
  }

  /**
   * Updates player's last validated location.
   */
  public updatePlayerLocation(
    roomCode: string,
    playerId: string,
    location: PlayerLocation
  ): Room {
    const formatted = roomCode.toUpperCase().trim();
    const room = this.rooms.get(formatted);

    if (!room) {
      throw new RoomError("ROOM_NOT_FOUND", "Room not found.");
    }

    const player = room.players.find((p) => p.playerId === playerId);
    if (!player) {
      throw new RoomError("PLAYER_NOT_IN_ROOM", "Player is not in this room.");
    }

    player.lastLocation = location;
    room.updatedAt = new Date().toISOString();
    return room;
  }

  /**
   * Evaluates if the match can be started.
   * MANDATORY ACCEPTANCE RULE: Must have at least 2 players with confirmed GPS locks ("LOCKED").
   */
  public canStartGame(roomCode: string, requesterPlayerId: string): { canStart: boolean; reason?: string; lockedGpsCount: number } {
    const formatted = roomCode.toUpperCase().trim();
    const room = this.rooms.get(formatted);

    if (!room) {
      return { canStart: false, reason: "Room not found.", lockedGpsCount: 0 };
    }

    if (room.hostPlayerId !== requesterPlayerId) {
      return { canStart: false, reason: "Only the room host can start the game.", lockedGpsCount: 0 };
    }

    if (room.status !== "WAITING" && (room.status as string) !== "LOBBY") {
      return { canStart: false, reason: "Game is already starting or in progress.", lockedGpsCount: 0 };
    }

    if (room.players.length < 2) {
      return { canStart: false, reason: "At least 2 players are required to start a match.", lockedGpsCount: 0 };
    }

    const lockedGpsCount = room.players.filter((p) => p.gpsStatus === "LOCKED").length;

    // MANDATORY ACCEPTANCE RULE: Minimum 2 confirmed GPS locks
    if (lockedGpsCount < 2) {
      return {
        canStart: false,
        reason: `GPS lock required for at least 2 players. Currently locked: ${lockedGpsCount}/2.`,
        lockedGpsCount,
      };
    }

    return { canStart: true, lockedGpsCount };
  }

  /**
   * Assigns Hunter and Runner roles to players before starting match if not already assigned.
   */
  public assignRolesIfPending(roomCode: string): Room {
    const formatted = roomCode.toUpperCase().trim();
    const room = this.rooms.get(formatted);
    if (!room) throw new RoomError("ROOM_NOT_FOUND", "Room not found.");

    const hunterTargetCount = Math.min(
      Math.max(1, room.roleSettings?.hunterCount || 1),
      Math.max(1, room.players.length - 1)
    );

    const hasAssignedRoles = room.players.some((p) => p.role === "HUNTER");
    if (!hasAssignedRoles) {
      const mode = room.roleSettings?.mode || "RANDOM";
      let hunterIndices: number[] = [];

      if (mode === "HUNTER") {
        const hostIdx = room.players.findIndex((p) => p.playerId === room.hostPlayerId);
        hunterIndices.push(hostIdx !== -1 ? hostIdx : 0);
        let idx = 0;
        while (hunterIndices.length < hunterTargetCount && idx < room.players.length) {
          if (!hunterIndices.includes(idx)) hunterIndices.push(idx);
          idx++;
        }
      } else if (mode === "RUNNER") {
        const nonHostIndices = room.players
          .map((p, idx) => (p.playerId !== room.hostPlayerId ? idx : -1))
          .filter((idx) => idx !== -1);

        while (hunterIndices.length < hunterTargetCount && nonHostIndices.length > 0) {
          const randPos = Math.floor(Math.random() * nonHostIndices.length);
          hunterIndices.push(nonHostIndices.splice(randPos, 1)[0]);
        }
        if (hunterIndices.length === 0) {
          hunterIndices.push(0);
        }
      } else {
        // RANDOM
        const indices = room.players.map((_, idx) => idx);
        for (let i = indices.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [indices[i], indices[j]] = [indices[j], indices[i]];
        }
        hunterIndices = indices.slice(0, hunterTargetCount);
      }

      room.players.forEach((player, idx) => {
        player.role = hunterIndices.includes(idx) ? "HUNTER" : "RUNNER";
      });
      room.updatedAt = new Date().toISOString();
    }

    return room;
  }

  /**
   * Transitions room to COUNTDOWN if all start criteria are met.
   */
  public startGame(roomCode: string, requesterPlayerId: string): Room {
    const check = this.canStartGame(roomCode, requesterPlayerId);
    if (!check.canStart) {
      throw new RoomError("CANNOT_START_GAME", check.reason || "Start conditions not met.");
    }

    const formatted = roomCode.toUpperCase().trim();
    const room = this.rooms.get(formatted)!;

    this.assignRolesIfPending(formatted);
    room.status = "COUNTDOWN";
    room.updatedAt = new Date().toISOString();
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
      this.rooms.delete(formattedCode);
      return { room: null, player: removedPlayer, wasHost, isEmpty: true };
    }

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

  public resetAll(): void {
    this.clearAll();
  }
}

// Global Singleton Instance
export const roomManager = new RoomManager();
