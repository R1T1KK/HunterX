import { describe, it, expect, beforeEach } from "vitest";
import { RoomManager, RoomError } from "../services/RoomManager.js";

describe("RoomManager Core Unit Tests", () => {
  let manager: RoomManager;

  beforeEach(() => {
    manager = new RoomManager();
  });

  it("should generate a valid 6-character alphanumeric room code", () => {
    const code = manager.generateRoomCode();
    expect(code).toHaveLength(6);
    expect(code).toMatch(/^[A-Z0-9]{6}$/);
  });

  it("should create a room with the caller assigned as host", () => {
    const start = performance.now();
    const room = manager.createRoom({
      hostPlayerId: "player-1",
      callsign: "Ritik_Hunter",
      socketId: "socket-1",
    });
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(200); // Benchmark: <200ms
    expect(room.roomCode).toHaveLength(6);
    expect(room.hostPlayerId).toBe("player-1");
    expect(room.status).toBe("WAITING");
    expect(room.maxPlayers).toBe(15);
    expect(room.players).toHaveLength(1);
    expect(room.players[0].isHost).toBe(true);
    expect(room.players[0].callsign).toBe("Ritik_Hunter");
  });

  it("should allow a second player to join the room", () => {
    const room = manager.createRoom({
      hostPlayerId: "player-1",
      callsign: "HostPlayer",
      socketId: "socket-1",
    });

    const updatedRoom = manager.joinRoom({
      roomCode: room.roomCode,
      playerId: "player-2",
      callsign: "SecondPlayer",
      socketId: "socket-2",
    });

    expect(updatedRoom.players).toHaveLength(2);
    expect(updatedRoom.players[1].playerId).toBe("player-2");
    expect(updatedRoom.players[1].isHost).toBe(false);
  });

  it("should reject joining a non-existent room with ROOM_NOT_FOUND", () => {
    expect(() =>
      manager.joinRoom({
        roomCode: "NOPE99",
        playerId: "player-2",
        callsign: "Ghost",
        socketId: "socket-2",
      })
    ).toThrowError(RoomError);
  });

  it("should enforce the 15-player maximum capacity", () => {
    const room = manager.createRoom({
      hostPlayerId: "player-host",
      callsign: "Host",
      socketId: "socket-host",
    });

    // Fill room to 15 players
    for (let i = 2; i <= 15; i++) {
      manager.joinRoom({
        roomCode: room.roomCode,
        playerId: `player-${i}`,
        callsign: `Runner_${i}`,
        socketId: `socket-${i}`,
      });
    }

    expect(room.players).toHaveLength(15);

    // 16th player attempt must throw ROOM_FULL
    expect(() =>
      manager.joinRoom({
        roomCode: room.roomCode,
        playerId: "player-16",
        callsign: "OverflowRunner",
        socketId: "socket-16",
      })
    ).toThrowError(/capacity/i);
  });

  it("should handle host leaving and reassign host to next player", () => {
    const room = manager.createRoom({
      hostPlayerId: "player-1",
      callsign: "OriginalHost",
      socketId: "socket-1",
    });

    manager.joinRoom({
      roomCode: room.roomCode,
      playerId: "player-2",
      callsign: "NextHost",
      socketId: "socket-2",
    });

    const result = manager.leaveRoom(room.roomCode, "player-1");

    expect(result.wasHost).toBe(true);
    expect(result.newHostId).toBe("player-2");
    expect(result.room?.players).toHaveLength(1);
    expect(result.room?.players[0].isHost).toBe(true);
    expect(result.room?.hostPlayerId).toBe("player-2");
  });

  it("should destroy room when all players leave", () => {
    const room = manager.createRoom({
      hostPlayerId: "player-1",
      callsign: "Solo",
      socketId: "socket-1",
    });

    const result = manager.leaveRoom(room.roomCode, "player-1");
    expect(result.isEmpty).toBe(true);
    expect(result.room).toBeNull();
    expect(manager.findRoom(room.roomCode)).toBeUndefined();
  });

  it("should reject invalid callsigns (length < 3 or invalid characters)", () => {
    expect(() =>
      manager.createRoom({
        hostPlayerId: "player-1",
        callsign: "ab", // Too short (< 3)
        socketId: "socket-1",
      })
    ).toThrow();

    expect(() =>
      manager.createRoom({
        hostPlayerId: "player-1",
        callsign: "Invalid Space!", // Invalid chars
        socketId: "socket-1",
      })
    ).toThrow();
  });
});

