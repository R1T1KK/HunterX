import { PlayerRole } from "@/types";
import { lerp, lerpLongitude, lerpAngle, calculateBearing } from "./geoUtils";

export interface RemotePlayerPacket {
  playerId: string;
  callsign: string;
  role: PlayerRole;
  lng: number;
  lat: number;
  heading?: number | null;
  speed?: number | null;
  timestamp: number;
}

export interface RemotePlayerTrack {
  playerId: string;
  callsign: string;
  role: PlayerRole;
  currentLng: number;
  currentLat: number;
  previousLng: number;
  previousLat: number;
  targetLng: number;
  targetLat: number;
  currentHeading: number;
  previousHeading: number;
  targetHeading: number;
  startTime: number;
  durationMs: number;
  lastPacketTime: number;
  lastSeenTime: number;
}

export interface MultiplayerFeatureCollection extends GeoJSON.FeatureCollection<GeoJSON.Point> {}

/**
 * High-performance 60 FPS Linear Interpolation (LERP) Engine for Mapbox GL JS.
 * Transforms 1-second discrete GPS pulses into continuous fluid movement on mobile canvas.
 */
export class MultiplayerLerpEngine {
  private players: Map<string, RemotePlayerTrack> = new Map();
  private staleThresholdMs: number = 15000; // Drop players inactive > 15s
  private defaultTickDurationMs: number = 1000; // Baseline 1Hz server cadence

  /**
   * Resets all tracked players (e.g. when leaving a room or changing matches).
   */
  public clear(): void {
    this.players.clear();
  }

  /**
   * Removes a specific player (e.g. on disconnect event).
   */
  public removePlayer(playerId: string): void {
    this.players.delete(playerId);
  }

  /**
   * Updates player role dynamically if changed in lobby.
   */
  public updatePlayerRole(playerId: string, role: PlayerRole): void {
    const player = this.players.get(playerId);
    if (player) {
      player.role = role;
    }
  }

  /**
   * Ingests a new incoming discrete location packet from Socket.IO.
   */
  public ingestPacket(packet: RemotePlayerPacket, overrideNow?: number): void {
    const { playerId, callsign, role, lng, lat, heading, timestamp } = packet;

    // Validate coordinates
    if (typeof lng !== "number" || typeof lat !== "number" || isNaN(lng) || isNaN(lat)) {
      return;
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return;
    }

    const now =
      typeof overrideNow === "number"
        ? overrideNow
        : typeof performance !== "undefined"
        ? performance.now()
        : Date.now();
    const existing = this.players.get(playerId);

    if (!existing) {
      // First position snapshot for this player
      const initialHeading = typeof heading === "number" && !isNaN(heading) ? heading : 0;

      this.players.set(playerId, {
        playerId,
        callsign,
        role: role || "RUNNER",
        currentLng: lng,
        currentLat: lat,
        previousLng: lng,
        previousLat: lat,
        targetLng: lng,
        targetLat: lat,
        currentHeading: initialHeading,
        previousHeading: initialHeading,
        targetHeading: initialHeading,
        startTime: now,
        durationMs: this.defaultTickDurationMs,
        lastPacketTime: timestamp,
        lastSeenTime: Date.now(),
      });
      return;
    }

    // Existing player: calculate dynamic interval based on packet timing
    const measuredInterval = existing.lastPacketTime > 0 ? timestamp - existing.lastPacketTime : 1000;
    const clampedDuration = Math.max(800, Math.min(2500, measuredInterval));

    // Determine target heading: prefer reported heading or calculate direction of travel
    let newTargetHeading = existing.currentHeading;
    if (typeof heading === "number" && !isNaN(heading)) {
      newTargetHeading = heading;
    } else {
      const movedDist = Math.abs(lng - existing.currentLng) + Math.abs(lat - existing.currentLat);
      if (movedDist > 0.00001) {
        newTargetHeading = calculateBearing(
          [existing.currentLng, existing.currentLat],
          [lng, lat]
        );
      }
    }

    // Start interpolation from the CURRENT interpolated location to incoming target
    existing.callsign = callsign;
    existing.role = role || existing.role;
    existing.previousLng = existing.currentLng;
    existing.previousLat = existing.currentLat;
    existing.targetLng = lng;
    existing.targetLat = lat;

    existing.previousHeading = existing.currentHeading;
    existing.targetHeading = newTargetHeading;

    existing.startTime = now;
    existing.durationMs = clampedDuration;
    existing.lastPacketTime = timestamp;
    existing.lastSeenTime = Date.now();
  }

  /**
   * Advances the animation by 1 frame at timestamp 'now'.
   * Computes LERP positions for all active players and compiles a GeoJSON FeatureCollection.
   */
  public step(now: number): MultiplayerFeatureCollection {
    const wallNow = Date.now();
    const features: GeoJSON.Feature<GeoJSON.Point>[] = [];
    const staleIds: string[] = [];

    this.players.forEach((player, id) => {
      // 1. Stale player cleanup
      if (wallNow - player.lastSeenTime > this.staleThresholdMs) {
        staleIds.push(id);
        return;
      }

      // 2. Compute interpolation progress (t between 0.0 and 1.0)
      const elapsed = Math.max(0, now - player.startTime);
      const t = Math.min(1.0, elapsed / player.durationMs);

      // 3. Interpolate coordinates and heading
      player.currentLng = lerpLongitude(player.previousLng, player.targetLng, t);
      player.currentLat = lerp(player.previousLat, player.targetLat, t);
      player.currentHeading = lerpAngle(player.previousHeading, player.targetHeading, t);

      // 4. Construct GeoJSON Feature
      features.push({
        type: "Feature",
        id,
        geometry: {
          type: "Point",
          coordinates: [player.currentLng, player.currentLat],
        },
        properties: {
          playerId: player.playerId,
          callsign: player.callsign,
          role: player.role,
          heading: Math.round(player.currentHeading),
          isHunter: player.role === "HUNTER",
          isRunner: player.role === "RUNNER",
          progress: t,
        },
      });
    });

    for (let i = 0; i < staleIds.length; i++) {
      this.players.delete(staleIds[i]);
    }

    return {
      type: "FeatureCollection",
      features,
    };
  }

  public getPlayerCount(): number {
    return this.players.size;
  }

  public getPlayer(playerId: string): RemotePlayerTrack | undefined {
    return this.players.get(playerId);
  }
}
