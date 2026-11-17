import { Server } from "socket.io";
import { roomManager } from "./RoomManager.js";
import {
  Room,
  Player,
  PlayerLocation,
  PlayerRole,
  PairwiseDistance,
  NearestOpponentResult,
  DistanceMatrixResult,
} from "../types/index.js";

/**
 * Mean Earth Radius in meters according to WGS84 standard.
 */
export const EARTH_RADIUS_METERS = 6371000;

/**
 * Proximity alarm threshold (10.0m) for Day 12 alarm triggers.
 */
export const PROXIMITY_ALARM_THRESHOLD_METERS = 10.0;

/**
 * Server-authoritative physical tag / catch threshold (5.0m) for Day 15.
 */
export const CATCH_DISTANCE_THRESHOLD_METERS = 5.0;

/**
 * Maximum permissible GPS accuracy circle radius before rejection.
 */
export const MAX_ACCURACY_THRESHOLD_METERS = 25.0;

/**
 * Maximum coordinate age before marking position stale (15 seconds).
 */
export const MAX_COORDINATE_AGE_MS = 15000;

/**
 * Default spatial computation frequency (1Hz = 1000ms).
 */
export const DEFAULT_SPATIAL_TICK_INTERVAL_MS = 1000;

export interface CoordinateLike {
  lat: number;
  lng: number;
}

export interface ActiveSpatialPlayer {
  playerId: string;
  callsign: string;
  role: PlayerRole;
  location: PlayerLocation;
  latRad: number;
  lngRad: number;
  cosLat: number;
  sinLat: number;
}

/**
 * Server-Authoritative Geospatial Distance Engine.
 * Computes pairwise spherical distances between all active Hunters and Runners at 1Hz in RAM.
 */
export class GeoService {
  private spatialLoops: Map<string, NodeJS.Timeout> = new Map();
  private computingFlags: Map<string, boolean> = new Map();
  private latestMatrices: Map<string, DistanceMatrixResult> = new Map();
  private matrixSubscribers: Set<(result: DistanceMatrixResult) => void> = new Set();

  /**
   * High-precision vectorized Haversine distance between two latitude/longitude points in meters.
   * Uses Earth's mean radius (6,371,000m) and returns centimeter-precise distances.
   */
  public static haversine(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
    radius: number = EARTH_RADIUS_METERS
  ): number {
    // Identical point fast path
    if (Math.abs(lat1 - lat2) < 1e-9 && Math.abs(lng1 - lng2) < 1e-9) {
      return 0.0;
    }

    const toRad = Math.PI / 180;
    const phi1 = lat1 * toRad;
    const phi2 = lat2 * toRad;
    const deltaPhi = (lat2 - lat1) * toRad;
    const deltaLambda = (lng2 - lng1) * toRad;

    const sinHalfDeltaPhi = Math.sin(deltaPhi / 2);
    const sinHalfDeltaLambda = Math.sin(deltaLambda / 2);

    const a =
      sinHalfDeltaPhi * sinHalfDeltaPhi +
      Math.cos(phi1) * Math.cos(phi2) * sinHalfDeltaLambda * sinHalfDeltaLambda;

    // Clamp to [0, 1] to prevent NaN on floating point boundary edge cases
    const clampedA = Math.max(0, Math.min(1, a));
    const c = 2 * Math.atan2(Math.sqrt(clampedA), Math.sqrt(1 - clampedA));

    return radius * c;
  }

  /**
   * Helper accepting coordinates as either {lat, lng} objects or [lng, lat] GeoJSON tuples.
   */
  public static calculateDistance(
    coord1: CoordinateLike | [number, number],
    coord2: CoordinateLike | [number, number],
    radius: number = EARTH_RADIUS_METERS
  ): number {
    const lat1 = Array.isArray(coord1) ? coord1[1] : coord1.lat;
    const lng1 = Array.isArray(coord1) ? coord1[0] : coord1.lng;
    const lat2 = Array.isArray(coord2) ? coord2[1] : coord2.lat;
    const lng2 = Array.isArray(coord2) ? coord2[0] : coord2.lng;

    return GeoService.haversine(lat1, lng1, lat2, lng2, radius);
  }

  /**
   * Validates coordinate sanity, accuracy threshold and freshness.
   */
  public static isValidCoordinate(
    lat: unknown,
    lng: unknown,
    accuracy?: unknown,
    timestamp?: unknown,
    now: number = Date.now(),
    maxAgeMs: number = MAX_COORDINATE_AGE_MS
  ): boolean {
    if (typeof lat !== "number" || Number.isNaN(lat) || !Number.isFinite(lat) || lat < -90 || lat > 90) {
      return false;
    }
    if (typeof lng !== "number" || Number.isNaN(lng) || !Number.isFinite(lng) || lng < -180 || lng > 180) {
      return false;
    }
    if (accuracy !== undefined && accuracy !== null) {
      if (
        typeof accuracy !== "number" ||
        Number.isNaN(accuracy) ||
        !Number.isFinite(accuracy) ||
        accuracy <= 0 ||
        accuracy > MAX_ACCURACY_THRESHOLD_METERS
      ) {
        return false;
      }
    }
    if (timestamp !== undefined && timestamp !== null) {
      if (
        typeof timestamp !== "number" ||
        Number.isNaN(timestamp) ||
        !Number.isFinite(timestamp) ||
        timestamp <= 0 ||
        now - timestamp > maxAgeMs ||
        timestamp > now + 60000 // future drift tolerance
      ) {
        return false;
      }
    }
    return true;
  }

  /**
   * Computes the complete Hunter-to-Runner Pairwise Distance Matrix in RAM.
   * Excludes invalid, missing, stale or disconnected player coordinates.
   */
  public computeDistanceMatrix(room: Room, now: number = Date.now()): DistanceMatrixResult {
    const startTime = performance.now();
    const toRad = Math.PI / 180;

    const activeHunters: ActiveSpatialPlayer[] = [];
    const activeRunners: ActiveSpatialPlayer[] = [];
    let excludedPlayersCount = 0;

    // Filter and prepare active players with valid coordinates
    for (const player of room.players) {
      if (!player.role || (player.role !== "HUNTER" && player.role !== "RUNNER")) {
        excludedPlayersCount++;
        continue;
      }

      if (player.gpsStatus === "UNAVAILABLE" || player.gpsStatus === "DENIED") {
        excludedPlayersCount++;
        continue;
      }

      const loc = player.lastLocation;
      if (!loc) {
        excludedPlayersCount++;
        continue;
      }

      if (
        !GeoService.isValidCoordinate(
          loc.lat,
          loc.lng,
          loc.accuracy,
          loc.timestamp,
          now,
          MAX_COORDINATE_AGE_MS
        )
      ) {
        excludedPlayersCount++;
        continue;
      }

      const latRad = loc.lat * toRad;
      const lngRad = loc.lng * toRad;

      const spatialPlayer: ActiveSpatialPlayer = {
        playerId: player.playerId,
        callsign: player.callsign,
        role: player.role,
        location: loc,
        latRad,
        lngRad,
        cosLat: Math.cos(latRad),
        sinLat: Math.sin(latRad),
      };

      if (player.role === "HUNTER") {
        activeHunters.push(spatialPlayer);
      } else {
        activeRunners.push(spatialPlayer);
      }
    }

    const distances: PairwiseDistance[] = [];
    const matrix: Record<string, Record<string, number>> = {};
    const nearestOpponents: Record<string, NearestOpponentResult | null> = {};

    // Initialize matrix mappings for all active players
    for (const h of activeHunters) {
      matrix[h.playerId] = {};
      nearestOpponents[h.playerId] = null;
    }
    for (const r of activeRunners) {
      matrix[r.playerId] = {};
      nearestOpponents[r.playerId] = null;
    }

    // Vectorized pairwise distance calculation: Hunters x Runners
    for (let i = 0; i < activeHunters.length; i++) {
      const h = activeHunters[i];
      let minDistanceForHunter = Infinity;
      let closestRunnerForHunter: ActiveSpatialPlayer | null = null;

      for (let j = 0; j < activeRunners.length; j++) {
        const r = activeRunners[j];

        // Fast Haversine using pre-computed trigonometric values
        const deltaPhi = r.latRad - h.latRad;
        const deltaLambda = r.lngRad - h.lngRad;

        const sinHalfDeltaPhi = Math.sin(deltaPhi / 2);
        const sinHalfDeltaLambda = Math.sin(deltaLambda / 2);

        const a =
          sinHalfDeltaPhi * sinHalfDeltaPhi +
          h.cosLat * r.cosLat * sinHalfDeltaLambda * sinHalfDeltaLambda;

        const clampedA = Math.max(0, Math.min(1, a));
        const c = 2 * Math.atan2(Math.sqrt(clampedA), Math.sqrt(1 - clampedA));
        const distanceMeters = Math.round(EARTH_RADIUS_METERS * c * 100) / 100; // Centimeter precision

        const pairwise: PairwiseDistance = {
          hunterId: h.playerId,
          hunterCallsign: h.callsign,
          runnerId: r.playerId,
          runnerCallsign: r.callsign,
          distanceMeters,
          isProximityAlarm: distanceMeters <= PROXIMITY_ALARM_THRESHOLD_METERS,
          isCatchable: distanceMeters <= CATCH_DISTANCE_THRESHOLD_METERS,
          calculatedAt: now,
        };

        distances.push(pairwise);

        // Populate 2-way symmetric matrix lookup
        matrix[h.playerId][r.playerId] = distanceMeters;
        matrix[r.playerId][h.playerId] = distanceMeters;

        // Track nearest runner for this hunter
        if (distanceMeters < minDistanceForHunter) {
          minDistanceForHunter = distanceMeters;
          closestRunnerForHunter = r;
        }

        // Track nearest hunter for this runner
        const currentRunnerOpponent = nearestOpponents[r.playerId];
        if (!currentRunnerOpponent || distanceMeters < currentRunnerOpponent.distanceMeters) {
          nearestOpponents[r.playerId] = {
            opponentId: h.playerId,
            callsign: h.callsign,
            distanceMeters,
            role: "HUNTER",
          };
        }
      }

      if (closestRunnerForHunter) {
        nearestOpponents[h.playerId] = {
          opponentId: closestRunnerForHunter.playerId,
          callsign: closestRunnerForHunter.callsign,
          distanceMeters: minDistanceForHunter,
          role: "RUNNER",
        };
      }
    }

    const calculationDurationMs = Number((performance.now() - startTime).toFixed(3));

    return {
      roomCode: room.roomCode,
      calculatedAt: now,
      calculationDurationMs,
      totalActivePlayers: activeHunters.length + activeRunners.length,
      activeHuntersCount: activeHunters.length,
      activeRunnersCount: activeRunners.length,
      excludedPlayersCount,
      distances,
      matrix,
      nearestOpponents,
    };
  }

  /**
   * Computes distances for a room by roomCode using in-memory state.
   */
  public computeRoomDistances(roomCode: string, now: number = Date.now()): DistanceMatrixResult | null {
    const formattedCode = roomCode.toUpperCase().trim();
    const room = roomManager.findRoom(formattedCode);
    if (!room) return null;

    const result = this.computeDistanceMatrix(room, now);
    this.latestMatrices.set(formattedCode, result);
    return result;
  }

  /**
   * Starts the Authoritative 1Hz Spatial Loop for an active match.
   * Guarantees zero overlapping timer executions via mutex flag.
   */
  public startSpatialLoop(
    roomCode: string,
    io?: Server,
    intervalMs: number = DEFAULT_SPATIAL_TICK_INTERVAL_MS
  ): void {
    const formattedCode = roomCode.toUpperCase().trim();

    // Prevent duplicate loops
    this.stopSpatialLoop(formattedCode);

    this.computingFlags.set(formattedCode, false);

    const interval = setInterval(() => {
      // 1. Guard: Prevent overlapping computation cycles
      if (this.computingFlags.get(formattedCode)) {
        console.warn(`[GeoService] Spatial computation for room ${formattedCode} skipped: previous cycle running.`);
        return;
      }

      this.computingFlags.set(formattedCode, true);

      try {
        const matrixResult = this.computeRoomDistances(formattedCode);
        if (matrixResult) {
          this.notifySubscribers(matrixResult);

          // If socket server is provided, can emit proximity notifications if applicable
          if (io && matrixResult.distances.length > 0) {
            // Optional spatial tick event for debugging or radar telemetry
          }
        }
      } catch (err) {
        console.error(`[GeoService] Error in spatial computation loop for room ${formattedCode}:`, err);
      } finally {
        this.computingFlags.set(formattedCode, false);
      }
    }, intervalMs);

    this.spatialLoops.set(formattedCode, interval);
  }

  /**
   * Stops the spatial loop and cleans up room state.
   */
  public stopSpatialLoop(roomCode: string): void {
    const formattedCode = roomCode.toUpperCase().trim();
    const interval = this.spatialLoops.get(formattedCode);
    if (interval) {
      clearInterval(interval);
      this.spatialLoops.delete(formattedCode);
    }
    this.computingFlags.delete(formattedCode);
    this.latestMatrices.delete(formattedCode);
  }

  /**
   * Retrieves the most recent distance matrix computed for a room.
   */
  public getLatestMatrix(roomCode: string): DistanceMatrixResult | null {
    const formattedCode = roomCode.toUpperCase().trim();
    return this.latestMatrices.get(formattedCode) || null;
  }

  /**
   * Fast O(1) lookup of distance between two players in meters from the in-memory matrix.
   */
  public getDistanceBetween(roomCode: string, playerId1: string, playerId2: string): number | null {
    const matrix = this.getLatestMatrix(roomCode);
    if (!matrix) return null;

    const row = matrix.matrix[playerId1];
    if (!row) return null;

    const dist = row[playerId2];
    return dist !== undefined ? dist : null;
  }

  /**
   * Fast O(1) lookup of nearest opponent for any active player.
   */
  public getNearestOpponent(roomCode: string, playerId: string): NearestOpponentResult | null {
    const matrix = this.getLatestMatrix(roomCode);
    if (!matrix) return null;

    return matrix.nearestOpponents[playerId] || null;
  }

  /**
   * Returns all active Hunter <-> Runner pairs currently within proximity alarm threshold (<= 10.0m).
   */
  public getProximityAlarmPairs(
    roomCode: string,
    thresholdMeters: number = PROXIMITY_ALARM_THRESHOLD_METERS
  ): PairwiseDistance[] {
    const matrix = this.getLatestMatrix(roomCode);
    if (!matrix) return [];

    return matrix.distances.filter((d) => d.distanceMeters <= thresholdMeters);
  }

  /**
   * Returns all active Hunter <-> Runner pairs currently within physical catch threshold (<= 5.0m).
   */
  public getCatchablePairs(
    roomCode: string,
    thresholdMeters: number = CATCH_DISTANCE_THRESHOLD_METERS
  ): PairwiseDistance[] {
    const matrix = this.getLatestMatrix(roomCode);
    if (!matrix) return [];

    return matrix.distances.filter((d) => d.distanceMeters <= thresholdMeters);
  }

  /**
   * Subscribes a listener callback to matrix computation events.
   * Returns unsubscribe cleanup function.
   */
  public onMatrixComputed(callback: (result: DistanceMatrixResult) => void): () => void {
    this.matrixSubscribers.add(callback);
    return () => {
      this.matrixSubscribers.delete(callback);
    };
  }

  private notifySubscribers(result: DistanceMatrixResult): void {
    for (const callback of this.matrixSubscribers) {
      try {
        callback(result);
      } catch (err) {
        console.error("[GeoService] Error in matrix subscriber callback:", err);
      }
    }
  }

  /**
   * Cleans up all active spatial loops (for testing or server teardown).
   */
  public resetAll(): void {
    for (const [, interval] of this.spatialLoops) {
      clearInterval(interval);
    }
    this.spatialLoops.clear();
    this.computingFlags.clear();
    this.latestMatrices.clear();
    this.matrixSubscribers.clear();
  }
}

export const geoService = new GeoService();
