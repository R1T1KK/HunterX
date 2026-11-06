import { z } from "zod";
import { GpsSmoother } from "../lib/GpsSmoother.js";
import { roomManager } from "./RoomManager.js";
import { LocationUpdatePayload, PlayerLocation } from "../types/index.js";

export const locationUpdateSchema = z.object({
  roomCode: z.string().trim().length(6),
  playerId: z.string().trim().min(1),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy: z.number().positive().max(25.0, "Accuracy exceeds 25m threshold"),
  heading: z.number().nullable().optional(),
  speed: z.number().nullable().optional(),
  timestamp: z.number().positive(),
});

export const MAX_PAYLOAD_BYTES = 1536; // 1.5 KB strict threshold
export const MIN_EMIT_INTERVAL_MS = 900; // 1 Hz rate limit with 100ms network jitter leeway

export interface LocationValidationResult {
  success: boolean;
  location?: PlayerLocation;
  error?: {
    code: string;
    message: string;
  };
}

export class LocationManager {
  private playerSmoothers: Map<string, GpsSmoother> = new Map();
  private lastEmitTimestamps: Map<string, number> = new Map();
  private playerLocations: Map<string, PlayerLocation> = new Map();

  /**
   * Clears state for a specific player (e.g. on disconnect or room leave).
   */
  public clearPlayer(playerId: string): void {
    this.playerSmoothers.delete(playerId);
    this.lastEmitTimestamps.delete(playerId);
    this.playerLocations.delete(playerId);
  }

  public resetAll(): void {
    this.playerSmoothers.clear();
    this.lastEmitTimestamps.clear();
    this.playerLocations.clear();
  }

  public getPlayerLocation(playerId: string): PlayerLocation | undefined {
    return this.playerLocations.get(playerId);
  }

  /**
   * Processes, validates, and stores an incoming location:update payload.
   */
  public processLocationUpdate(
    rawPayload: unknown,
    socketId: string
  ): LocationValidationResult {
    const now = Date.now();

    // 1. Strict Payload Byte Size Check (<= 1536 bytes)
    let payloadStr = "";
    try {
      payloadStr = JSON.stringify(rawPayload);
    } catch {
      return {
        success: false,
        error: { code: "INVALID_JSON", message: "Payload cannot be serialized" },
      };
    }

    const byteLength = Buffer.byteLength(payloadStr, "utf8");
    if (byteLength > MAX_PAYLOAD_BYTES) {
      return {
        success: false,
        error: {
          code: "PAYLOAD_TOO_LARGE",
          message: `Payload size (${byteLength}B) exceeds 1536B limit`,
        },
      };
    }

    // 2. Schema and Coordinate Validation
    const parseResult = locationUpdateSchema.safeParse(rawPayload);
    if (!parseResult.success) {
      const firstIssue = parseResult.error.issues[0];
      return {
        success: false,
        error: {
          code: "INVALID_COORDINATES",
          message: `${firstIssue.path.join(".")}: ${firstIssue.message}`,
        },
      };
    }

    const payload: LocationUpdatePayload = parseResult.data;

    // 3. Timestamp Sanity Check (+/- 60 seconds from server clock)
    const timeDrift = Math.abs(now - payload.timestamp);
    if (timeDrift > 60000) {
      return {
        success: false,
        error: {
          code: "INVALID_TIMESTAMP",
          message: `Timestamp drift (${Math.round(timeDrift / 1000)}s) exceeds allowed 60s window`,
        },
      };
    }

    // 4. Per-Player 1 Hz Rate Limiting (Server authoritative)
    const lastEmit = this.lastEmitTimestamps.get(payload.playerId);
    if (lastEmit !== undefined && now - lastEmit < MIN_EMIT_INTERVAL_MS) {
      return {
        success: false,
        error: {
          code: "RATE_LIMITED",
          message: "Location updates exceed 1 Hz rate limit",
        },
      };
    }

    // 5. Room & Player Association Check
    const room = roomManager.findRoom(payload.roomCode);
    if (!room) {
      return {
        success: false,
        error: { code: "ROOM_NOT_FOUND", message: "Room not found" },
      };
    }

    const player = room.players.find((p) => p.playerId === payload.playerId);
    if (!player) {
      return {
        success: false,
        error: { code: "PLAYER_NOT_IN_ROOM", message: "Player not in room" },
      };
    }

    // 6. Coordinate Smoothing & Plausible Movement Check
    let smoother = this.playerSmoothers.get(payload.playerId);
    if (!smoother) {
      smoother = new GpsSmoother({ alpha: 0.25, maxAllowedAccuracyMeters: 25.0 });
      this.playerSmoothers.set(payload.playerId, smoother);
    }

    const filterResult = smoother.process({
      lat: payload.lat,
      lng: payload.lng,
      accuracy: payload.accuracy,
      heading: payload.heading,
      speed: payload.speed,
      timestamp: payload.timestamp,
    });

    if (!filterResult.accepted) {
      return {
        success: false,
        error: {
          code: filterResult.rejectionReason || "REJECTED_COORDINATE",
          message: `Coordinate rejected by server filter: ${filterResult.rejectionReason}`,
        },
      };
    }

    // 7. Update State in RAM
    this.lastEmitTimestamps.set(payload.playerId, now);

    const validatedLocation: PlayerLocation = {
      lat: filterResult.smoothedLat,
      lng: filterResult.smoothedLng,
      accuracy: filterResult.accuracy,
      heading: filterResult.heading,
      speed: filterResult.speed,
      timestamp: filterResult.timestamp,
      updatedAt: now,
    };

    this.playerLocations.set(payload.playerId, validatedLocation);

    // Update player record in RoomManager
    try {
      roomManager.updatePlayerLocation(payload.roomCode, payload.playerId, validatedLocation);
    } catch {
      // Room or player state might be in transition
    }

    return {
      success: true,
      location: validatedLocation,
    };
  }
}

export const locationManager = new LocationManager();
