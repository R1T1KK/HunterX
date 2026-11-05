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

  it("should create a room with the caller assigned as host and standard defaults", () => {
    const start = performance.now();
    const room = manager.createRoom({
      hostPlayerId: "player-1",
      callsign: "Ritik_Hunter",
      socketId: "socket-1",
    });
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(200);
    expect(room.roomCode).toHaveLength(6);
    expect(room.hostPlayerId).toBe("player-1");
    expect(room.status).toBe("WAITING");
    expect(room.maxPlayers).toBe(15);
    expect(room.rules.preset).toBe("STANDARD");
    expect(room.rules.roundLengthMinutes).toBe(10);
    expect(room.roleSettings.hunterCount).toBe(1);
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

    for (let i = 2; i <= 15; i++) {
      manager.joinRoom({
        roomCode: room.roomCode,
        playerId: `player-${i}`,
        callsign: `Runner_${i}`,
        socketId: `socket-${i}`,
      });
    }

    expect(room.players).toHaveLength(15);

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

  // DAY 3 SPECIFIC TESTS
  it("should allow host to regenerate room code and invalidate old code", () => {
    const room = manager.createRoom({
      hostPlayerId: "host-1",
      callsign: "HostPlayer",
      socketId: "socket-1",
    });
    const oldCode = room.roomCode;

    manager.joinRoom({
      roomCode: oldCode,
      playerId: "player-2",
      callsign: "Joiner",
      socketId: "socket-2",
    });

    const res = manager.regenerateRoomCode(oldCode, "host-1");
    expect(res.newCode).not.toBe(oldCode);
    expect(res.newCode).toHaveLength(6);
    expect(manager.findRoom(oldCode)).toBeUndefined();
    expect(manager.findRoom(res.newCode)).toBeDefined();
    expect(manager.findRoom(res.newCode)?.players).toHaveLength(2);

    // Non-host cannot regenerate
    expect(() => manager.regenerateRoomCode(res.newCode, "player-2")).toThrowError(/host/i);
  });

  it("should update house rules presets (QUICK, STANDARD, BIG_PARK, CUSTOM)", () => {
    const room = manager.createRoom({
      hostPlayerId: "host-1",
      callsign: "HostPlayer",
      socketId: "socket-1",
    });

    // Host updates to QUICK
    manager.updateHouseRules(room.roomCode, "host-1", { preset: "QUICK" });
    expect(room.rules.preset).toBe("QUICK");
    expect(room.rules.roundLengthMinutes).toBe(5);
    expect(room.rules.headStartSeconds).toBe(15);
    expect(room.rules.pingIntervalSeconds).toBe(30);

    // Host updates to BIG_PARK
    manager.updateHouseRules(room.roomCode, "host-1", { preset: "BIG_PARK" });
    expect(room.rules.preset).toBe("BIG_PARK");
    expect(room.rules.roundLengthMinutes).toBe(20);
    expect(room.rules.zoneShrinks).toBe(true);

    // Host custom overrides
    manager.updateHouseRules(room.roomCode, "host-1", {
      preset: "CUSTOM",
      roundLengthMinutes: 15,
      headStartSeconds: 45,
    });
    expect(room.rules.preset).toBe("CUSTOM");
    expect(room.rules.roundLengthMinutes).toBe(15);
    expect(room.rules.headStartSeconds).toBe(45);
  });

  it("should enforce mandatory 2 confirmed GPS locks before allowing game start", () => {
    const room = manager.createRoom({
      hostPlayerId: "host-1",
      callsign: "HostPlayer",
      socketId: "socket-1",
    });

    manager.joinRoom({
      roomCode: room.roomCode,
      playerId: "player-2",
      callsign: "Joiner",
      socketId: "socket-2",
    });

    // 0 GPS locks
    expect(manager.canStartGame(room.roomCode, "host-1").canStart).toBe(false);

    // 1 GPS lock
    manager.updatePlayerGPSStatus(room.roomCode, "host-1", "LOCKED");
    const check1 = manager.canStartGame(room.roomCode, "host-1");
    expect(check1.canStart).toBe(false);
    expect(check1.lockedGpsCount).toBe(1);

    // 2 GPS locks -> Can start!
    manager.updatePlayerGPSStatus(room.roomCode, "player-2", "LOCKED");
    const check2 = manager.canStartGame(room.roomCode, "host-1");
    expect(check2.canStart).toBe(true);
    expect(check2.lockedGpsCount).toBe(2);

    // Non-host cannot start game
    expect(manager.canStartGame(room.roomCode, "player-2").canStart).toBe(false);

    // Starting game transitions status
    const started = manager.startGame(room.roomCode, "host-1");
    expect(started.status).toBe("STARTING");
  });
});
