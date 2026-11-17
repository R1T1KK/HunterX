import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  GeoService,
  geoService,
  EARTH_RADIUS_METERS,
  PROXIMITY_ALARM_THRESHOLD_METERS,
  CATCH_DISTANCE_THRESHOLD_METERS,
} from "../GeoService.js";
import { roomManager } from "../RoomManager.js";
import { Room, Player, PlayerLocation } from "../../types/index.js";

describe("Day 10: Spatial Distance Engine & 1Hz Haversine Matrix", () => {
  beforeEach(() => {
    roomManager.resetAll();
    geoService.resetAll();
    vi.useFakeTimers();
  });

  afterEach(() => {
    geoService.resetAll();
    roomManager.resetAll();
    vi.useRealTimers();
  });

  describe("Section 1: Centimeter-Level Precision & Geodetic Benchmarks", () => {
    it("should return exactly 0.0 meters for identical coordinates", () => {
      const lat = 28.6139;
      const lng = 77.209;
      const dist = GeoService.haversine(lat, lng, lat, lng);
      expect(dist).toBe(0.0);
    });

    it("should compute Equator 1-degree longitude distance with centimeter precision (~111,194.93m)", () => {
      // 1 deg at equator = (pi / 180) * 6,371,000 = 111194.9266m
      const dist = GeoService.haversine(0, 0, 0, 1);
      expect(Math.abs(dist - 111194.93)).toBeLessThan(0.02); // Within 2 centimeters
    });

    it("should compute London to Paris distance accurately (~343,556.06m)", () => {
      // London: 51.5074° N, 0.1278° W
      // Paris: 48.8566° N, 2.3522° E
      const dist = GeoService.haversine(51.5074, -0.1278, 48.8566, 2.3522);
      expect(Math.abs(dist - 343556.06)).toBeLessThan(0.05);
    });

    it("should compute Connaught Place to India Gate distance (~2,410.68m)", () => {
      // Connaught Place: 28.6328, 77.2197
      // India Gate: 28.6129, 77.2295
      const dist = GeoService.haversine(28.6328, 77.2197, 28.6129, 77.2295);
      expect(Math.abs(dist - 2410.68)).toBeLessThan(0.05);
    });

    it("should calculate exact 10.00m proximity alarm distance along meridian within 1 centimeter", () => {
      const lat1 = 28.6139;
      const lng1 = 77.209;
      // Latitude shift for exactly 10.0 meters = (10 / R) * (180 / pi)
      const dLatDeg = (10.0 / EARTH_RADIUS_METERS) * (180 / Math.PI);
      const lat2 = lat1 + dLatDeg;

      const dist = GeoService.haversine(lat1, lng1, lat2, lng1);
      expect(Math.abs(dist - 10.0)).toBeLessThan(0.01); // Within 1 cm
    });

    it("should calculate exact 5.00m catch distance along meridian within 1 centimeter", () => {
      const lat1 = 28.6139;
      const lng1 = 77.209;
      const dLatDeg = (5.0 / EARTH_RADIUS_METERS) * (180 / Math.PI);
      const lat2 = lat1 + dLatDeg;

      const dist = GeoService.haversine(lat1, lng1, lat2, lng1);
      expect(Math.abs(dist - 5.0)).toBeLessThan(0.01); // Within 1 cm
    });

    it("should support both {lat, lng} object and [lng, lat] GeoJSON tuple formats", () => {
      const obj1 = { lat: 28.6139, lng: 77.209 };
      const obj2 = { lat: 28.6149, lng: 77.21 };
      const tuple1: [number, number] = [77.209, 28.6139];
      const tuple2: [number, number] = [77.21, 28.6149];

      const distObj = GeoService.calculateDistance(obj1, obj2);
      const distTuple = GeoService.calculateDistance(tuple1, tuple2);

      expect(distObj).toBe(distTuple);
      expect(distObj).toBeGreaterThan(0);
    });
  });

  describe("Section 2: Coordinate Quality, Staleness & Rejection Validation", () => {
    const now = 1700000000000;

    it("should accept valid GPS coordinates within normal bounds", () => {
      expect(GeoService.isValidCoordinate(28.6139, 77.209, 5.0, now - 1000, now)).toBe(true);
    });

    it("should reject out-of-range latitudes (< -90 or > 90)", () => {
      expect(GeoService.isValidCoordinate(91.0, 77.209, 5.0, now, now)).toBe(false);
      expect(GeoService.isValidCoordinate(-90.1, 77.209, 5.0, now, now)).toBe(false);
    });

    it("should reject out-of-range longitudes (< -180 or > 180)", () => {
      expect(GeoService.isValidCoordinate(28.6139, 180.5, 5.0, now, now)).toBe(false);
      expect(GeoService.isValidCoordinate(28.6139, -181.0, 5.0, now, now)).toBe(false);
    });

    it("should reject NaN, Infinity or non-numeric coordinates", () => {
      expect(GeoService.isValidCoordinate(NaN, 77.209)).toBe(false);
      expect(GeoService.isValidCoordinate(28.6139, Infinity)).toBe(false);
      expect(GeoService.isValidCoordinate("28.6139" as unknown as number, 77.209)).toBe(false);
    });

    it("should reject GPS accuracy exceeding 25.0 meters", () => {
      expect(GeoService.isValidCoordinate(28.6139, 77.209, 25.1, now, now)).toBe(false);
      expect(GeoService.isValidCoordinate(28.6139, 77.209, 50.0, now, now)).toBe(false);
      expect(GeoService.isValidCoordinate(28.6139, 77.209, 25.0, now, now)).toBe(true);
    });

    it("should reject stale coordinates older than 15 seconds", () => {
      const staleTimestamp = now - 16000; // 16s ago (> 15s)
      const freshTimestamp = now - 5000;  // 5s ago (<= 15s)

      expect(GeoService.isValidCoordinate(28.6139, 77.209, 5.0, staleTimestamp, now)).toBe(false);
      expect(GeoService.isValidCoordinate(28.6139, 77.209, 5.0, freshTimestamp, now)).toBe(true);
    });
  });

  describe("Section 3: Pairwise Hunter-to-Runner Matrix Computation", () => {
    it("should compute all pairwise distances between Hunters and Runners in a room", () => {
      const now = Date.now();
      const room = roomManager.createRoom({
        hostPlayerId: "HOST_1",
        callsign: "HunterOne",
        socketId: "socket_h1",
      });
      room.players[0].role = "HUNTER";
      room.players[0].gpsStatus = "LOCKED";
      room.players[0].lastLocation = {
        lat: 28.6139,
        lng: 77.209,
        accuracy: 5.0,
        heading: 0,
        speed: 1.0,
        timestamp: now,
        updatedAt: now,
      };

      roomManager.joinRoom({
        roomCode: room.roomCode,
        playerId: "RUNNER_1",
        callsign: "RunnerA",
        socketId: "socket_r1",
      });
      const r1 = room.players.find((p) => p.playerId === "RUNNER_1")!;
      r1.role = "RUNNER";
      r1.gpsStatus = "LOCKED";
      // 10m north
      const dLat10m = (10.0 / EARTH_RADIUS_METERS) * (180 / Math.PI);
      r1.lastLocation = {
        lat: 28.6139 + dLat10m,
        lng: 77.209,
        accuracy: 5.0,
        heading: 0,
        speed: 1.0,
        timestamp: now,
        updatedAt: now,
      };

      roomManager.joinRoom({
        roomCode: room.roomCode,
        playerId: "RUNNER_2",
        callsign: "RunnerB",
        socketId: "socket_r2",
      });
      const r2 = room.players.find((p) => p.playerId === "RUNNER_2")!;
      r2.role = "RUNNER";
      r2.gpsStatus = "LOCKED";
      // 50m north
      const dLat50m = (50.0 / EARTH_RADIUS_METERS) * (180 / Math.PI);
      r2.lastLocation = {
        lat: 28.6139 + dLat50m,
        lng: 77.209,
        accuracy: 5.0,
        heading: 0,
        speed: 1.0,
        timestamp: now,
        updatedAt: now,
      };

      const matrixResult = geoService.computeDistanceMatrix(room, now);

      expect(matrixResult.roomCode).toBe(room.roomCode);
      expect(matrixResult.totalActivePlayers).toBe(3);
      expect(matrixResult.activeHuntersCount).toBe(1);
      expect(matrixResult.activeRunnersCount).toBe(2);
      expect(matrixResult.excludedPlayersCount).toBe(0);
      expect(matrixResult.distances.length).toBe(2); // 1 Hunter x 2 Runners

      // Verify pairwise distance values
      const distToR1 = matrixResult.distances.find((d) => d.runnerId === "RUNNER_1")!;
      const distToR2 = matrixResult.distances.find((d) => d.runnerId === "RUNNER_2")!;

      expect(Math.abs(distToR1.distanceMeters - 10.0)).toBeLessThan(0.02);
      expect(distToR1.isProximityAlarm).toBe(true);
      expect(distToR1.isCatchable).toBe(false);

      expect(Math.abs(distToR2.distanceMeters - 50.0)).toBeLessThan(0.02);
      expect(distToR2.isProximityAlarm).toBe(false);
      expect(distToR2.isCatchable).toBe(false);

      // Verify symmetric matrix lookups
      expect(matrixResult.matrix["HOST_1"]["RUNNER_1"]).toBe(distToR1.distanceMeters);
      expect(matrixResult.matrix["RUNNER_1"]["HOST_1"]).toBe(distToR1.distanceMeters);
      expect(matrixResult.matrix["HOST_1"]["RUNNER_2"]).toBe(distToR2.distanceMeters);
      expect(matrixResult.matrix["RUNNER_2"]["HOST_1"]).toBe(distToR2.distanceMeters);

      // Verify nearest opponent identification
      expect(matrixResult.nearestOpponents["HOST_1"]?.opponentId).toBe("RUNNER_1");
      expect(matrixResult.nearestOpponents["HOST_1"]?.role).toBe("RUNNER");
      expect(matrixResult.nearestOpponents["RUNNER_1"]?.opponentId).toBe("HOST_1");
      expect(matrixResult.nearestOpponents["RUNNER_1"]?.role).toBe("HUNTER");
    });

    it("should safely exclude players with missing, stale, or invalid GPS coordinates", () => {
      const now = Date.now();
      const room = roomManager.createRoom({
        hostPlayerId: "HOST_2",
        callsign: "ValidHunter",
        socketId: "socket_h2",
      });
      room.players[0].role = "HUNTER";
      room.players[0].gpsStatus = "LOCKED";
      room.players[0].lastLocation = {
        lat: 28.6139,
        lng: 77.209,
        accuracy: 4.0,
        heading: 0,
        speed: 0,
        timestamp: now,
        updatedAt: now,
      };

      // Player 2: No location yet
      roomManager.joinRoom({
        roomCode: room.roomCode,
        playerId: "P2_NO_LOC",
        callsign: "NoGps",
        socketId: "socket_p2",
      });
      const p2 = room.players.find((p) => p.playerId === "P2_NO_LOC")!;
      p2.role = "RUNNER";
      p2.gpsStatus = "ACQUIRING";

      // Player 3: Stale location (> 15s)
      roomManager.joinRoom({
        roomCode: room.roomCode,
        playerId: "P3_STALE",
        callsign: "StaleGps",
        socketId: "socket_p3",
      });
      const p3 = room.players.find((p) => p.playerId === "P3_STALE")!;
      p3.role = "RUNNER";
      p3.gpsStatus = "LOCKED";
      p3.lastLocation = {
        lat: 28.614,
        lng: 77.2091,
        accuracy: 5.0,
        heading: 0,
        speed: 0,
        timestamp: now - 20000, // 20s ago
        updatedAt: now - 20000,
      };

      // Player 4: Inaccurate GPS (> 25m)
      roomManager.joinRoom({
        roomCode: room.roomCode,
        playerId: "P4_POOR",
        callsign: "PoorGps",
        socketId: "socket_p4",
      });
      const p4 = room.players.find((p) => p.playerId === "P4_POOR")!;
      p4.role = "RUNNER";
      p4.gpsStatus = "LOCKED";
      p4.lastLocation = {
        lat: 28.6145,
        lng: 77.2092,
        accuracy: 35.0, // Exceeds 25m
        heading: 0,
        speed: 0,
        timestamp: now,
        updatedAt: now,
      };

      // Player 5: Valid Runner
      roomManager.joinRoom({
        roomCode: room.roomCode,
        playerId: "P5_VALID",
        callsign: "GoodRunner",
        socketId: "socket_p5",
      });
      const p5 = room.players.find((p) => p.playerId === "P5_VALID")!;
      p5.role = "RUNNER";
      p5.gpsStatus = "LOCKED";
      p5.lastLocation = {
        lat: 28.6141,
        lng: 77.2091,
        accuracy: 6.0,
        heading: 0,
        speed: 0,
        timestamp: now,
        updatedAt: now,
      };

      const matrixResult = geoService.computeDistanceMatrix(room, now);

      expect(matrixResult.totalActivePlayers).toBe(2); // Only Host + P5
      expect(matrixResult.activeHuntersCount).toBe(1);
      expect(matrixResult.activeRunnersCount).toBe(1);
      expect(matrixResult.excludedPlayersCount).toBe(3); // P2, P3, P4 excluded
      expect(matrixResult.distances.length).toBe(1);
      expect(matrixResult.distances[0].runnerId).toBe("P5_VALID");
    });
  });

  describe("Section 4: Scale & Max 15 Concurrent Players", () => {
    it("should compute full pairwise distance matrix for 15 concurrent players (3 Hunters, 12 Runners)", () => {
      const now = Date.now();
      const room = roomManager.createRoom({
        hostPlayerId: "HUNTER_1",
        callsign: "ApexHunter",
        socketId: "socket_h1",
      });
      room.players[0].role = "HUNTER";
      room.players[0].gpsStatus = "LOCKED";
      room.players[0].lastLocation = {
        lat: 28.6139,
        lng: 77.209,
        accuracy: 5.0,
        heading: 0,
        speed: 1.0,
        timestamp: now,
        updatedAt: now,
      };

      // Add 2 more hunters (total 3 hunters)
      for (let h = 2; h <= 3; h++) {
        roomManager.joinRoom({
          roomCode: room.roomCode,
          playerId: `HUNTER_${h}`,
          callsign: `Hunter${h}`,
          socketId: `socket_h${h}`,
        });
        const p = room.players.find((player) => player.playerId === `HUNTER_${h}`)!;
        p.role = "HUNTER";
        p.gpsStatus = "LOCKED";
        p.lastLocation = {
          lat: 28.6139 + h * 0.0001,
          lng: 77.209 + h * 0.0001,
          accuracy: 5.0,
          heading: 0,
          speed: 1.0,
          timestamp: now,
          updatedAt: now,
        };
      }

      // Add 12 runners (total 15 players)
      for (let r = 1; r <= 12; r++) {
        roomManager.joinRoom({
          roomCode: room.roomCode,
          playerId: `RUNNER_${r}`,
          callsign: `Runner${r}`,
          socketId: `socket_r${r}`,
        });
        const p = room.players.find((player) => player.playerId === `RUNNER_${r}`)!;
        p.role = "RUNNER";
        p.gpsStatus = "LOCKED";
        p.lastLocation = {
          lat: 28.615 + r * 0.0002,
          lng: 77.21 + r * 0.0002,
          accuracy: 5.0,
          heading: 0,
          speed: 1.5,
          timestamp: now,
          updatedAt: now,
        };
      }

      expect(room.players.length).toBe(15);

      const matrixResult = geoService.computeDistanceMatrix(room, now);

      expect(matrixResult.totalActivePlayers).toBe(15);
      expect(matrixResult.activeHuntersCount).toBe(3);
      expect(matrixResult.activeRunnersCount).toBe(12);
      expect(matrixResult.distances.length).toBe(3 * 12); // Exactly 36 pairwise distances
      expect(matrixResult.excludedPlayersCount).toBe(0);

      // Verify all 36 pairwise distances are finite and positive
      for (const dist of matrixResult.distances) {
        expect(dist.distanceMeters).toBeGreaterThan(0);
        expect(Number.isFinite(dist.distanceMeters)).toBe(true);
      }

      // Verify every runner has an identified nearest hunter
      for (let r = 1; r <= 12; r++) {
        const nearest = matrixResult.nearestOpponents[`RUNNER_${r}`];
        expect(nearest).toBeDefined();
        expect(nearest?.role).toBe("HUNTER");
        expect(nearest?.distanceMeters).toBeGreaterThan(0);
      }
    });
  });

  describe("Section 5: 1Hz Loop, Overlap Prevention & In-Memory State", () => {
    it("should schedule 1Hz periodic distance calculations and update in-memory state", () => {
      const now = Date.now();
      const room = roomManager.createRoom({
        hostPlayerId: "LOOP_HOST",
        callsign: "LoopHunter",
        socketId: "socket_lh",
      });
      room.players[0].role = "HUNTER";
      room.players[0].gpsStatus = "LOCKED";
      room.players[0].lastLocation = {
        lat: 28.6139,
        lng: 77.209,
        accuracy: 4.0,
        heading: 0,
        speed: 0,
        timestamp: now,
        updatedAt: now,
      };

      roomManager.joinRoom({
        roomCode: room.roomCode,
        playerId: "LOOP_RUNNER",
        callsign: "LoopRunner",
        socketId: "socket_lr",
      });
      const r = room.players.find((p) => p.playerId === "LOOP_RUNNER")!;
      r.role = "RUNNER";
      r.gpsStatus = "LOCKED";
      r.lastLocation = {
        lat: 28.614,
        lng: 77.209,
        accuracy: 4.0,
        heading: 0,
        speed: 0,
        timestamp: now,
        updatedAt: now,
      };

      let computedCount = 0;
      const unsubscribe = geoService.onMatrixComputed((result) => {
        if (result.roomCode === room.roomCode) {
          computedCount++;
        }
      });

      geoService.startSpatialLoop(room.roomCode, undefined, 1000);

      // Advance by 1000ms -> 1st tick
      vi.advanceTimersByTime(1000);
      expect(computedCount).toBe(1);

      // Advance by another 2000ms -> 2 more ticks
      vi.advanceTimersByTime(2000);
      expect(computedCount).toBe(3);

      const latest = geoService.getLatestMatrix(room.roomCode);
      expect(latest).toBeDefined();
      expect(latest?.totalActivePlayers).toBe(2);

      const dist = geoService.getDistanceBetween(room.roomCode, "LOOP_HOST", "LOOP_RUNNER");
      expect(dist).toBeGreaterThan(0);

      geoService.stopSpatialLoop(room.roomCode);
      unsubscribe();
    });

    it("should prevent overlapping execution cycles if a computation is already running", () => {
      const room = roomManager.createRoom({
        hostPlayerId: "MUTEX_HOST",
        callsign: "MutexHunter",
        socketId: "socket_mh",
      });
      const roomCode = room.roomCode;

      let wasComputed = false;
      const unsubscribe = geoService.onMatrixComputed(() => {
        wasComputed = true;
      });

      geoService.startSpatialLoop(roomCode, undefined, 1000);

      // Access private map to simulate an in-progress computation cycle
      const computingFlags = (geoService as unknown as { computingFlags: Map<string, boolean> }).computingFlags;
      computingFlags.set(roomCode, true);

      vi.advanceTimersByTime(1000);

      // Because computingFlag was true, loop tick must be skipped to avoid overlap
      expect(wasComputed).toBe(false);

      // Clear lock and verify next tick executes cleanly
      computingFlags.set(roomCode, false);
      vi.advanceTimersByTime(1000);
      expect(wasComputed).toBe(true);

      geoService.stopSpatialLoop(roomCode);
      unsubscribe();
    });
  });

  describe("Section 6: Performance Benchmark Target (< 1ms)", () => {
    it("should compute a 15-player matrix in under 1ms per execution across 1,000 iterations", () => {
      const now = Date.now();
      const room = roomManager.createRoom({
        hostPlayerId: "BENCH_H1",
        callsign: "HunterOne",
        socketId: "socket_b1",
      });
      room.players[0].role = "HUNTER";
      room.players[0].gpsStatus = "LOCKED";
      room.players[0].lastLocation = {
        lat: 28.6139,
        lng: 77.209,
        accuracy: 5.0,
        heading: 0,
        speed: 1.0,
        timestamp: now,
        updatedAt: now,
      };

      for (let h = 2; h <= 3; h++) {
        roomManager.joinRoom({
          roomCode: room.roomCode,
          playerId: `BENCH_H${h}`,
          callsign: `Hunter${h}`,
          socketId: `socket_bh${h}`,
        });
        const p = room.players.find((player) => player.playerId === `BENCH_H${h}`)!;
        p.role = "HUNTER";
        p.gpsStatus = "LOCKED";
        p.lastLocation = {
          lat: 28.6139 + h * 0.001,
          lng: 77.209 + h * 0.001,
          accuracy: 5.0,
          heading: 0,
          speed: 1.0,
          timestamp: now,
          updatedAt: now,
        };
      }

      for (let r = 1; r <= 12; r++) {
        roomManager.joinRoom({
          roomCode: room.roomCode,
          playerId: `BENCH_R${r}`,
          callsign: `Runner${r}`,
          socketId: `socket_br${r}`,
        });
        const p = room.players.find((player) => player.playerId === `BENCH_R${r}`)!;
        p.role = "RUNNER";
        p.gpsStatus = "LOCKED";
        p.lastLocation = {
          lat: 28.615 + r * 0.001,
          lng: 77.21 + r * 0.001,
          accuracy: 5.0,
          heading: 0,
          speed: 1.0,
          timestamp: now,
          updatedAt: now,
        };
      }

      // Warmup JIT
      for (let i = 0; i < 50; i++) {
        geoService.computeDistanceMatrix(room, now);
      }

      // Benchmark 1,000 runs
      const iterations = 1000;
      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        geoService.computeDistanceMatrix(room, now);
      }
      const totalElapsedMs = performance.now() - start;
      const avgDurationMs = totalElapsedMs / iterations;

      console.log(
        `\n🚀 [Benchmark] 15-player matrix computation: ${avgDurationMs.toFixed(4)}ms per iteration (${iterations} runs, total: ${totalElapsedMs.toFixed(2)}ms)`
      );

      // MANDATORY ACCEPTANCE CRITERIA: < 1.0ms per matrix computation
      expect(avgDurationMs).toBeLessThan(1.0);
    });
  });
});
