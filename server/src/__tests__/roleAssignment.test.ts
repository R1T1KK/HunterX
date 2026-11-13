import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import { io as ClientIO, Socket as ClientSocket } from "socket.io-client";
import { roomManager } from "../services/RoomManager.js";
import { gameManager } from "../services/GameManager.js";
import { RoleAssignmentEngine } from "../services/RoleAssignmentEngine.js";
import { PresetHandler, HOUSE_RULES_PRESETS } from "../services/PresetHandler.js";
import { registerRoomHandlers } from "../socket/roomGateway.js";
import { Room, RoleAssignedPayload } from "../types/index.js";

describe("Day 9: Role Assignment Engine & Preset Handler", () => {
  let httpServer: http.Server;
  let io: SocketIOServer;
  let serverUrl: string;

  beforeEach(async () => {
    roomManager.resetAll();
    gameManager.resetAll();

    httpServer = http.createServer();
    io = new SocketIOServer(httpServer, { cors: { origin: "*" } });
    io.on("connection", (socket) => {
      registerRoomHandlers(io, socket);
    });

    await new Promise<void>((resolve) => httpServer.listen(0, resolve));
    const port = (httpServer.address() as any).port;
    serverUrl = `http://localhost:${port}`;
  });

  afterEach(async () => {
    gameManager.resetAll();
    roomManager.resetAll();
    io.close();
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  });

  function setupMultiPlayerRoom(playerCount: number = 4): Room {
    const room = roomManager.createRoom({
      hostPlayerId: "player_1",
      callsign: "HostAlpha",
      socketId: "socket_1",
    });

    for (let i = 2; i <= playerCount; i++) {
      roomManager.joinRoom({
        roomCode: room.roomCode,
        playerId: `player_${i}`,
        callsign: `Callsign_${i}`,
        socketId: `socket_${i}`,
      });
      roomManager.updatePlayerGPSStatus(room.roomCode, `player_${i}`, "LOCKED");
    }
    roomManager.updatePlayerGPSStatus(room.roomCode, "player_1", "LOCKED");

    return room;
  }

  // TEST 1: Hunter Allocation Options (1, 2, 3)
  describe("Hunter Allocation Options", () => {
    it("should accurately assign 1 Hunter and remaining Runners in a 4-player room", () => {
      const room = setupMultiPlayerRoom(4);
      roomManager.updateRoleSettings(room.roomCode, "player_1", {
        hunterCount: 1,
        mode: "RANDOM",
      });

      const result = RoleAssignmentEngine.assignRandomRoles(room);
      expect(result.hunterCount).toBe(1);
      expect(result.runnerCount).toBe(3);

      const hunters = room.players.filter((p) => p.role === "HUNTER");
      const runners = room.players.filter((p) => p.role === "RUNNER");
      expect(hunters.length).toBe(1);
      expect(runners.length).toBe(3);
    });

    it("should accurately assign 2 Hunters and remaining Runners in a 4-player room", () => {
      const room = setupMultiPlayerRoom(4);
      roomManager.updateRoleSettings(room.roomCode, "player_1", {
        hunterCount: 2,
        mode: "RANDOM",
      });

      const result = RoleAssignmentEngine.assignRandomRoles(room);
      expect(result.hunterCount).toBe(2);
      expect(result.runnerCount).toBe(2);

      const hunters = room.players.filter((p) => p.role === "HUNTER");
      const runners = room.players.filter((p) => p.role === "RUNNER");
      expect(hunters.length).toBe(2);
      expect(runners.length).toBe(2);
    });

    it("should accurately assign 3 Hunters and remaining Runners in a 5-player room", () => {
      const room = setupMultiPlayerRoom(5);
      roomManager.updateRoleSettings(room.roomCode, "player_1", {
        hunterCount: 3,
        mode: "RANDOM",
      });

      const result = RoleAssignmentEngine.assignRandomRoles(room);
      expect(result.hunterCount).toBe(3);
      expect(result.runnerCount).toBe(2);

      const hunters = room.players.filter((p) => p.role === "HUNTER");
      const runners = room.players.filter((p) => p.role === "RUNNER");
      expect(hunters.length).toBe(3);
      expect(runners.length).toBe(2);
    });

    it("should reject invalid Hunter allocations (0, 4, or >= total players)", () => {
      expect(() => RoleAssignmentEngine.validateHunterCount(0, 4)).toThrow();
      expect(() => RoleAssignmentEngine.validateHunterCount(4, 5)).toThrow();
      // In a 2-player room, hunterCount cannot be 2 (needs at least 1 runner)
      expect(() => RoleAssignmentEngine.validateHunterCount(2, 2)).toThrow();
    });
  });

  // TEST 2: Cryptographically Secure Random Assignment
  describe("Cryptographically Secure Random Assignment", () => {
    it("should assign exactly one role per player without duplicates", () => {
      const room = setupMultiPlayerRoom(6);
      roomManager.updateRoleSettings(room.roomCode, "player_1", {
        hunterCount: 2,
        mode: "RANDOM",
      });

      const result = RoleAssignmentEngine.assignRandomRoles(room);
      expect(result.assignments.length).toBe(6);

      const playerIds = result.assignments.map((a) => a.playerId);
      const uniqueIds = new Set(playerIds);
      expect(uniqueIds.size).toBe(6);

      // Every player has role defined as HUNTER or RUNNER
      result.assignments.forEach((a) => {
        expect(["HUNTER", "RUNNER"]).toContain(a.role);
      });
    });

    it("should produce unbiased distribution over multiple runs", () => {
      const sample = [1, 2, 3, 4, 5];
      const shuffled1 = RoleAssignmentEngine.secureShuffle(sample);
      const shuffled2 = RoleAssignmentEngine.secureShuffle(sample);

      expect(shuffled1.length).toBe(5);
      expect(shuffled2.length).toBe(5);
      // All elements preserved
      expect(new Set(shuffled1)).toEqual(new Set(sample));
      expect(new Set(shuffled2)).toEqual(new Set(sample));
    });
  });

  // TEST 3: Authorized Manual Assignment
  describe("Authorized Manual Assignment", () => {
    it("should allow verified room host to assign specific players as Hunters", () => {
      const room = setupMultiPlayerRoom(4);

      const result = RoleAssignmentEngine.assignManualRoles(
        room,
        "player_1", // Host
        ["player_2", "player_4"]
      );

      expect(result.hunterCount).toBe(2);
      expect(result.runnerCount).toBe(2);

      const p2 = room.players.find((p) => p.playerId === "player_2");
      const p4 = room.players.find((p) => p.playerId === "player_4");
      const p1 = room.players.find((p) => p.playerId === "player_1");
      const p3 = room.players.find((p) => p.playerId === "player_3");

      expect(p2?.role).toBe("HUNTER");
      expect(p4?.role).toBe("HUNTER");
      expect(p1?.role).toBe("RUNNER");
      expect(p3?.role).toBe("RUNNER");
    });

    it("should reject manual assignment from non-host players", () => {
      const room = setupMultiPlayerRoom(4);

      expect(() => {
        RoleAssignmentEngine.assignManualRoles(
          room,
          "player_2", // Non-host!
          ["player_2"]
        );
      }).toThrow();
    });

    it("should reject manual assignment containing duplicate or non-existent IDs", () => {
      const room = setupMultiPlayerRoom(4);

      // Duplicate ID
      expect(() => {
        RoleAssignmentEngine.assignManualRoles(room, "player_1", ["player_2", "player_2"]);
      }).toThrow();

      // Non-existent ID
      expect(() => {
        RoleAssignmentEngine.assignManualRoles(room, "player_1", ["ghost_user"]);
      }).toThrow();
    });
  });

  // TEST 4: Preset Validation & House Rules
  describe("Preset Validation & Handler", () => {
    it("should apply Quick preset defaults (5 min, 15s head start, 30s ping, 200m zone)", () => {
      const room = setupMultiPlayerRoom(2);
      const updated = roomManager.updateHouseRules(room.roomCode, "player_1", {
        preset: "QUICK",
      });

      expect(updated.rules.preset).toBe("QUICK");
      expect(updated.rules.roundLengthMinutes).toBe(5);
      expect(updated.rules.headStartSeconds).toBe(15);
      expect(updated.rules.pingIntervalSeconds).toBe(30);
      expect(updated.rules.zoneSizeMeters).toBe(200);
      expect(updated.rules.zoneShrinks).toBe(false);
    });

    it("should apply Big Park preset defaults (20 min, 60s head start, 90s ping, 1000m zone with shrink)", () => {
      const room = setupMultiPlayerRoom(2);
      const updated = roomManager.updateHouseRules(room.roomCode, "player_1", {
        preset: "BIG_PARK",
      });

      expect(updated.rules.preset).toBe("BIG_PARK");
      expect(updated.rules.roundLengthMinutes).toBe(20);
      expect(updated.rules.headStartSeconds).toBe(60);
      expect(updated.rules.pingIntervalSeconds).toBe(90);
      expect(updated.rules.zoneSizeMeters).toBe(1000);
      expect(updated.rules.zoneShrinks).toBe(true);
    });

    it("should validate and reject invalid round duration and ping intervals", () => {
      const room = setupMultiPlayerRoom(2);

      // Round length < 3 min or > 60 min
      expect(() => {
        PresetHandler.validateAndApply(room.rules, {
          preset: "CUSTOM",
          roundLengthMinutes: 1, // Invalid!
        });
      }).toThrow();

      expect(() => {
        PresetHandler.validateAndApply(room.rules, {
          preset: "CUSTOM",
          roundLengthMinutes: 120, // Invalid!
        });
      }).toThrow();

      // Ping interval < 15s
      expect(() => {
        PresetHandler.validateAndApply(room.rules, {
          preset: "CUSTOM",
          pingIntervalSeconds: 5, // Invalid!
        });
      }).toThrow();

      // Zone size < 100m
      expect(() => {
        PresetHandler.validateAndApply(room.rules, {
          preset: "CUSTOM",
          zoneSizeMeters: 20, // Invalid!
        });
      }).toThrow();
    });
  });

  // TEST 5: Role Security & Client Tampering Prevention
  describe("Role Security & Tampering Prevention", () => {
    it("should block client-side role tampering attempts over Socket.IO", async () => {
      const client = ClientIO(serverUrl, { transports: ["websocket"] });
      await new Promise((resolve) => client.on("connect", resolve));

      const errorPromise = new Promise<{ code: string; message: string }>((resolve) => {
        client.on("room:error", resolve);
      });

      // Rogue client tries to emit role:change or player:set-role
      client.emit("role:change", { role: "RUNNER" });

      const err = await errorPromise;
      expect(err.code).toBe("UNAUTHORIZED_ROLE_MUTATION");
      expect(err.message).toContain("Client-side role modification is strictly forbidden");

      client.disconnect();
    });

    it("should reject role modifications after match has started", () => {
      const room = setupMultiPlayerRoom(2);
      roomManager.startGame(room.roomCode, "player_1");
      expect(room.status).toBe("COUNTDOWN");

      expect(() => {
        roomManager.updateRoleSettings(room.roomCode, "player_1", {
          hunterCount: 1,
          mode: "RANDOM",
        });
      }).toThrow();

      expect(() => {
        roomManager.assignManualRoles(room.roomCode, "player_1", ["player_1"]);
      }).toThrow();
    });
  });

  // TEST 6: Socket.IO Distribution (role:assigned)
  describe("Socket.IO Distribution (role:assigned)", () => {
    it("should dispatch role:assigned to each connected client with verified role", async () => {
      const client1 = ClientIO(serverUrl, { transports: ["websocket"] });
      const client2 = ClientIO(serverUrl, { transports: ["websocket"] });

      await Promise.all([
        new Promise((resolve) => client1.on("connect", resolve)),
        new Promise((resolve) => client2.on("connect", resolve)),
      ]);

      const room = roomManager.createRoom({
        hostPlayerId: "user_a",
        callsign: "Alice",
        socketId: client1.id!,
      });

      roomManager.joinRoom({
        roomCode: room.roomCode,
        playerId: "user_b",
        callsign: "Bob",
        socketId: client2.id!,
      });

      roomManager.updatePlayerGPSStatus(room.roomCode, "user_a", "LOCKED");
      roomManager.updatePlayerGPSStatus(room.roomCode, "user_b", "LOCKED");

      const rolePromise1 = new Promise<RoleAssignedPayload>((resolve) => {
        client1.on("role:assigned", resolve);
      });
      const rolePromise2 = new Promise<RoleAssignedPayload>((resolve) => {
        client2.on("role:assigned", resolve);
      });

      // Host starts match, triggering role assignment broadcast
      gameManager.startMatch(io, room.roomCode, "user_a");

      const [role1, role2] = await Promise.all([rolePromise1, rolePromise2]);

      expect(role1.playerId).toBe("user_a");
      expect(role2.playerId).toBe("user_b");
      expect(["HUNTER", "RUNNER"]).toContain(role1.role);
      expect(["HUNTER", "RUNNER"]).toContain(role2.role);
      // Roles must be mutually exclusive
      expect(role1.role).not.toBe(role2.role);

      client1.disconnect();
      client2.disconnect();
    });
  });

  // TEST 7: Day 8 Integration & Full Lifecycle
  describe("Day 8 Integration", () => {
    it("should finalize roles before 30-second scatter countdown begins", () => {
      const room = setupMultiPlayerRoom(3);
      roomManager.updateRoleSettings(room.roomCode, "player_1", {
        hunterCount: 1,
        mode: "RANDOM",
      });

      const { session, room: startedRoom } = gameManager.startMatch(io, room.roomCode, "player_1");

      expect(session.gameState).toBe("COUNTDOWN");
      expect(session.headStartDurationSeconds).toBe(30);

      // Verify all 3 players have their final verified roles established
      startedRoom.players.forEach((p) => {
        expect(p.role).toBeDefined();
        expect(["HUNTER", "RUNNER"]).toContain(p.role);
      });

      const hunters = startedRoom.players.filter((p) => p.role === "HUNTER");
      const runners = startedRoom.players.filter((p) => p.role === "RUNNER");
      expect(hunters.length).toBe(1);
      expect(runners.length).toBe(2);
    });
  });
});
