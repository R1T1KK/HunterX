import { describe, it, expect, beforeEach, afterEach } from "vitest";
import http from "node:http";
import { Server as SocketIOServer } from "socket.io";
import { io as ClientSocket, Socket as ClientSocketType } from "socket.io-client";
import { locationManager } from "../services/LocationManager.js";
import { roomManager } from "../services/RoomManager.js";
import { registerRoomHandlers } from "../socket/roomGateway.js";
import { LocationUpdatePayload } from "../types/index.js";

describe("Day 6: Coordinate Smoothing (EMA) & 1Hz Location Streaming", () => {
  let httpServer: http.Server;
  let ioServer: SocketIOServer;
  let port: number;

  beforeEach(async () => {
    locationManager.resetAll();
    roomManager.clearAll();

    httpServer = http.createServer();
    ioServer = new SocketIOServer(httpServer, {
      cors: { origin: "*" },
    });

    ioServer.on("connection", (socket) => {
      registerRoomHandlers(ioServer, socket);
    });

    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => {
        const address = httpServer.address();
        if (address && typeof address === "object") {
          port = address.port;
        }
        resolve();
      });
    });
  });

  afterEach(async () => {
    ioServer.close();
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    locationManager.resetAll();
    roomManager.clearAll();
  });

  describe("LocationManager Validation Rules", () => {
    it("should accept valid location update within 1536 bytes", () => {
      const room = roomManager.createRoom({
        hostPlayerId: "player_1",
        callsign: "Viper",
        socketId: "socket_1",
      });

      const validPayload: LocationUpdatePayload = {
        roomCode: room.roomCode,
        playerId: "player_1",
        lat: 28.6139,
        lng: 77.2090,
        accuracy: 8.5,
        heading: 180,
        speed: 1.4,
        timestamp: Date.now(),
      };

      const result = locationManager.processLocationUpdate(validPayload, "socket_1");
      expect(result.success).toBe(true);
      expect(result.location).toBeDefined();
      expect(result.location?.lat).toBe(28.6139);
      expect(result.location?.lng).toBe(77.2090);
      expect(result.location?.accuracy).toBe(8.5);
    });

    it("should reject payload exceeding 1536 bytes", () => {
      const oversizedPayload = {
        roomCode: "ABCDEF",
        playerId: "p1",
        lat: 28.6139,
        lng: 77.2090,
        accuracy: 5.0,
        timestamp: Date.now(),
        bloatData: "x".repeat(2000), // Massive payload
      };

      const result = locationManager.processLocationUpdate(oversizedPayload, "socket_1");
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("PAYLOAD_TOO_LARGE");
    });

    it("should reject GPS readings with accuracy > 25 meters", () => {
      const room = roomManager.createRoom({
        hostPlayerId: "player_1",
        callsign: "Viper",
        socketId: "socket_1",
      });

      const lowAccuracyPayload: LocationUpdatePayload = {
        roomCode: room.roomCode,
        playerId: "player_1",
        lat: 28.6139,
        lng: 77.2090,
        accuracy: 28.5, // > 25m
        timestamp: Date.now(),
      };

      const result = locationManager.processLocationUpdate(lowAccuracyPayload, "socket_1");
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("INVALID_COORDINATES");
    });

    it("should reject invalid coordinates (NaN or out of range)", () => {
      const room = roomManager.createRoom({
        hostPlayerId: "player_1",
        callsign: "Viper",
        socketId: "socket_1",
      });

      const invalidPayload = {
        roomCode: room.roomCode,
        playerId: "player_1",
        lat: 105.0, // > 90
        lng: 77.2090,
        accuracy: 8.0,
        timestamp: Date.now(),
      };

      const result = locationManager.processLocationUpdate(invalidPayload, "socket_1");
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("INVALID_COORDINATES");
    });

    it("should enforce per-player 1 Hz rate limiting", () => {
      const room = roomManager.createRoom({
        hostPlayerId: "player_1",
        callsign: "Viper",
        socketId: "socket_1",
      });

      const payload1: LocationUpdatePayload = {
        roomCode: room.roomCode,
        playerId: "player_1",
        lat: 28.6139,
        lng: 77.2090,
        accuracy: 8.0,
        timestamp: Date.now(),
      };

      // First update accepted
      const res1 = locationManager.processLocationUpdate(payload1, "socket_1");
      expect(res1.success).toBe(true);

      // Immediate second update (within < 900ms) rejected by rate limiter
      const payload2: LocationUpdatePayload = {
        roomCode: room.roomCode,
        playerId: "player_1",
        lat: 28.61391,
        lng: 77.20901,
        accuracy: 8.0,
        timestamp: Date.now(),
      };

      const res2 = locationManager.processLocationUpdate(payload2, "socket_1");
      expect(res2.success).toBe(false);
      expect(res2.error?.code).toBe("RATE_LIMITED");
    });

    it("should reject implausible coordinate jumps (teleportation)", async () => {
      const room = roomManager.createRoom({
        hostPlayerId: "player_1",
        callsign: "Viper",
        socketId: "socket_1",
      });

      const initialTime = Date.now();
      const pos1: LocationUpdatePayload = {
        roomCode: room.roomCode,
        playerId: "player_1",
        lat: 28.6139,
        lng: 77.2090,
        accuracy: 5.0,
        timestamp: initialTime,
      };

      const res1 = locationManager.processLocationUpdate(pos1, "socket_1");
      expect(res1.success).toBe(true);

      // Wait 1.05s to bypass rate limiter
      await new Promise((r) => setTimeout(r, 1050));

      // Coordinate 1 km away within 1 second (~1000 m/s > 12 m/s ceiling)
      const teleportPos: LocationUpdatePayload = {
        roomCode: room.roomCode,
        playerId: "player_1",
        lat: 28.6230, // ~1012 meters north
        lng: 77.2090,
        accuracy: 5.0,
        timestamp: initialTime + 1050,
      };

      const res2 = locationManager.processLocationUpdate(teleportPos, "socket_1");
      expect(res2.success).toBe(false);
      expect(res2.error?.code).toBe("IMPLAUSIBLE_JUMP");
    });

    it("should accept plausible walking movement and smooth coordinates with EMA", async () => {
      const room = roomManager.createRoom({
        hostPlayerId: "player_1",
        callsign: "Viper",
        socketId: "socket_1",
      });

      const initialTime = Date.now();
      const pos1: LocationUpdatePayload = {
        roomCode: room.roomCode,
        playerId: "player_1",
        lat: 28.613900,
        lng: 77.209000,
        accuracy: 5.0,
        timestamp: initialTime,
      };

      const res1 = locationManager.processLocationUpdate(pos1, "socket_1");
      expect(res1.success).toBe(true);
      expect(res1.location?.lat).toBe(28.613900);

      // Wait 1.05s to bypass rate limit
      await new Promise((r) => setTimeout(r, 1050));

      // Walking ~2 meters north (at ~1.9 m/s < 12 m/s)
      const pos2: LocationUpdatePayload = {
        roomCode: room.roomCode,
        playerId: "player_1",
        lat: 28.613918,
        lng: 77.209000,
        accuracy: 5.0,
        timestamp: initialTime + 1050,
      };

      const res2 = locationManager.processLocationUpdate(pos2, "socket_1");
      expect(res2.success).toBe(true);

      // EMA: alpha = 0.25 -> smoothedLat = 0.25 * 28.613918 + 0.75 * 28.613900 = 28.6139045
      expect(res2.location?.lat).toBeCloseTo(28.6139045, 6);
    });
  });

  describe("Real-Time Socket.IO Streaming Integration", () => {
    let client1: ClientSocketType;
    let client2: ClientSocketType;

    afterEach(() => {
      client1?.disconnect();
      client2?.disconnect();
    });

    it("should stream location:update over Socket.IO and broadcast to room peer", async () => {
      client1 = ClientSocket(`http://localhost:${port}`);
      client2 = ClientSocket(`http://localhost:${port}`);

      await Promise.all([
        new Promise<void>((r) => client1.on("connect", () => r())),
        new Promise<void>((r) => client2.on("connect", () => r())),
      ]);

      // 1. Host creates room
      let roomCode = "";
      await new Promise<void>((resolve) => {
        client1.emit(
          "room:create",
          { playerId: "host_1", callsign: "Ghost" },
          (res: { success: boolean; data: { room: { roomCode: string } } }) => {
            roomCode = res.data.room.roomCode;
            resolve();
          }
        );
      });

      // 2. Peer joins room
      await new Promise<void>((resolve) => {
        client2.emit(
          "room:join",
          { roomCode, playerId: "peer_2", callsign: "Specter" },
          () => resolve()
        );
      });

      // 3. Set up listener on Peer for incoming location updates
      const receivedUpdatePromise = new Promise<{ playerId: string; location: { lat: number; lng: number } }>(
        (resolve) => {
          client2.on("location:player-updated", (data) => {
            resolve(data);
          });
        }
      );

      // 4. Host emits location:update
      const locationPayload: LocationUpdatePayload = {
        roomCode,
        playerId: "host_1",
        lat: 28.61392,
        lng: 77.20901,
        accuracy: 6.5,
        heading: 90,
        speed: 1.2,
        timestamp: Date.now(),
      };

      const ackResponse = await new Promise<{ success: boolean; data?: unknown }>((resolve) => {
        client1.emit("location:update", locationPayload, (res: { success: boolean; data?: unknown }) => {
          resolve(res);
        });
      });

      expect(ackResponse.success).toBe(true);

      // 5. Verify peer received location:player-updated
      const peerData = await receivedUpdatePromise;
      expect(peerData.playerId).toBe("host_1");
      expect(peerData.location.lat).toBe(28.61392);
      expect(peerData.location.lng).toBe(77.20901);

      // 6. Verify room state in RAM was updated with player location
      const updatedRoom = roomManager.findRoom(roomCode);
      const hostPlayer = updatedRoom?.players.find((p) => p.playerId === "host_1");
      expect(hostPlayer?.lastLocation).toBeDefined();
      expect(hostPlayer?.lastLocation?.lat).toBe(28.61392);
    });
  });
});
