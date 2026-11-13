import { calculateHaversineDistance, calculateBearing } from "./geoUtils.js";

export interface GpsFilterOptions {
  alpha?: number;
  maxAllowedAccuracyMeters?: number;
  maxPlausibleSpeedMps?: number;
  reanchorTimeoutMs?: number;
  consecutiveJumpsToReanchor?: number;
}

export interface RawGpsReading {
  lat: number;
  lng: number;
  accuracy: number;
  heading?: number | null;
  speed?: number | null;
  timestamp: number;
}

export type GpsRejectionReason =
  | "LOW_ACCURACY"
  | "INVALID_COORDINATES"
  | "IMPLAUSIBLE_JUMP"
  | "DUPLICATE_TIMESTAMP";

export interface GpsFilterResult {
  accepted: boolean;
  rejectionReason?: GpsRejectionReason;
  smoothedLat: number;
  smoothedLng: number;
  rawLat: number;
  rawLng: number;
  accuracy: number;
  heading: number | null;
  speed: number | null;
  timestamp: number;
  distanceDeltaMeters: number;
  isSmoothed: boolean;
}

/**
 * Server-side Exponential Moving Average (EMA) GPS filter and validator.
 */
export class GpsSmoother {
  private alpha: number;
  private maxAllowedAccuracy: number;
  private maxPlausibleSpeed: number;
  private reanchorTimeoutMs: number;
  private consecutiveJumpsToReanchor: number;

  private lastSmoothedLat: number | null = null;
  private lastSmoothedLng: number | null = null;
  private lastSmoothedAccuracy: number | null = null;
  private lastAcceptedHeading: number | null = null;
  private lastAcceptedSpeed: number | null = null;
  private lastAcceptedTimestamp: number = 0;

  private consecutiveJumpCount: number = 0;
  private lastJumpReading: RawGpsReading | null = null;

  constructor(options?: GpsFilterOptions) {
    this.alpha = Math.min(1, Math.max(0.01, options?.alpha ?? 0.25));
    this.maxAllowedAccuracy = options?.maxAllowedAccuracyMeters ?? 25.0;
    this.maxPlausibleSpeed = options?.maxPlausibleSpeedMps ?? 12.0;
    this.reanchorTimeoutMs = options?.reanchorTimeoutMs ?? 15000;
    this.consecutiveJumpsToReanchor = options?.consecutiveJumpsToReanchor ?? 3;
  }

  public reset(): void {
    this.lastSmoothedLat = null;
    this.lastSmoothedLng = null;
    this.lastSmoothedAccuracy = null;
    this.lastAcceptedHeading = null;
    this.lastAcceptedSpeed = null;
    this.lastAcceptedTimestamp = 0;
    this.consecutiveJumpCount = 0;
    this.lastJumpReading = null;
  }

  public setAlpha(newAlpha: number): void {
    this.alpha = Math.min(1, Math.max(0.01, newAlpha));
  }

  public getAlpha(): number {
    return this.alpha;
  }

  public process(reading: RawGpsReading): GpsFilterResult {
    const { lat, lng, accuracy, heading, speed, timestamp } = reading;

    // 1. Validate coordinate bounds & numerical validity
    if (
      typeof lat !== "number" ||
      typeof lng !== "number" ||
      isNaN(lat) ||
      isNaN(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      return this.createRejectedResult(reading, "INVALID_COORDINATES");
    }

    // 2. Reject readings with accuracy > 25 meters (Mandatory Rule)
    if (typeof accuracy !== "number" || isNaN(accuracy) || accuracy <= 0 || accuracy > this.maxAllowedAccuracy) {
      return this.createRejectedResult(reading, "LOW_ACCURACY");
    }

    // 3. First reading initialization: S_0 = X_0
    if (this.lastSmoothedLat === null || this.lastSmoothedLng === null) {
      this.lastSmoothedLat = lat;
      this.lastSmoothedLng = lng;
      this.lastSmoothedAccuracy = accuracy;
      this.lastAcceptedHeading = heading ?? null;
      this.lastAcceptedSpeed = speed ?? null;
      this.lastAcceptedTimestamp = timestamp;
      this.consecutiveJumpCount = 0;
      this.lastJumpReading = null;

      return {
        accepted: true,
        smoothedLat: lat,
        smoothedLng: lng,
        rawLat: lat,
        rawLng: lng,
        accuracy,
        heading: heading ?? null,
        speed: speed ?? null,
        timestamp,
        distanceDeltaMeters: 0,
        isSmoothed: false,
      };
    }

    // 4. Duplicate or backwards timestamp check
    const elapsedMs = timestamp - this.lastAcceptedTimestamp;
    if (elapsedMs < 0) {
      return this.createRejectedResult(reading, "DUPLICATE_TIMESTAMP");
    }
    const elapsedSec = Math.max(0.05, elapsedMs / 1000);

    // 5. Distance calculation
    const distanceDelta = calculateHaversineDistance(
      [this.lastSmoothedLng, this.lastSmoothedLat],
      [lng, lat]
    );

    // 6. Plausible movement check with uncertainty tolerance
    const allowedDistance =
      this.maxPlausibleSpeed * elapsedSec + (accuracy + (this.lastSmoothedAccuracy ?? 10));

    const isJump = distanceDelta > allowedDistance;
    const isTimeout = elapsedMs >= this.reanchorTimeoutMs;

    if (isJump && !isTimeout) {
      this.consecutiveJumpCount++;

      if (this.lastJumpReading) {
        const jumpDelta = calculateHaversineDistance(
          [this.lastJumpReading.lng, this.lastJumpReading.lat],
          [lng, lat]
        );
        if (jumpDelta > 15) {
          this.consecutiveJumpCount = 1;
        }
      }
      this.lastJumpReading = reading;

      if (this.consecutiveJumpCount < this.consecutiveJumpsToReanchor) {
        return this.createRejectedResult(reading, "IMPLAUSIBLE_JUMP", distanceDelta);
      }
    }

    this.consecutiveJumpCount = 0;
    this.lastJumpReading = null;

    // 7. Apply EMA Formula
    const smoothedLat = this.alpha * lat + (1 - this.alpha) * this.lastSmoothedLat;
    const smoothedLng = this.alpha * lng + (1 - this.alpha) * this.lastSmoothedLng;
    const smoothedAccuracy =
      this.alpha * accuracy + (1 - this.alpha) * (this.lastSmoothedAccuracy ?? accuracy);

    let finalHeading = heading ?? null;
    if (finalHeading === null && distanceDelta >= 0.5) {
      finalHeading = calculateBearing(
        [this.lastSmoothedLng, this.lastSmoothedLat],
        [smoothedLng, smoothedLat]
      );
    } else if (finalHeading === null) {
      finalHeading = this.lastAcceptedHeading;
    }

    const actualSmoothedDelta = calculateHaversineDistance(
      [this.lastSmoothedLng, this.lastSmoothedLat],
      [smoothedLng, smoothedLat]
    );
    const calculatedSpeed = actualSmoothedDelta / elapsedSec;
    const finalSpeed = typeof speed === "number" && speed >= 0 ? speed : calculatedSpeed;

    this.lastSmoothedLat = smoothedLat;
    this.lastSmoothedLng = smoothedLng;
    this.lastSmoothedAccuracy = smoothedAccuracy;
    this.lastAcceptedHeading = finalHeading;
    this.lastAcceptedSpeed = finalSpeed;
    this.lastAcceptedTimestamp = timestamp;

    return {
      accepted: true,
      smoothedLat,
      smoothedLng,
      rawLat: lat,
      rawLng: lng,
      accuracy: smoothedAccuracy,
      heading: finalHeading,
      speed: finalSpeed,
      timestamp,
      distanceDeltaMeters: actualSmoothedDelta,
      isSmoothed: true,
    };
  }

  private createRejectedResult(
    reading: RawGpsReading,
    reason: GpsRejectionReason,
    distanceDelta: number = 0
  ): GpsFilterResult {
    return {
      accepted: false,
      rejectionReason: reason,
      smoothedLat: this.lastSmoothedLat ?? reading.lat,
      smoothedLng: this.lastSmoothedLng ?? reading.lng,
      rawLat: reading.lat,
      rawLng: reading.lng,
      accuracy: this.lastSmoothedAccuracy ?? reading.accuracy,
      heading: this.lastAcceptedHeading ?? reading.heading ?? null,
      speed: this.lastAcceptedSpeed ?? reading.speed ?? null,
      timestamp: reading.timestamp,
      distanceDeltaMeters: distanceDelta,
      isSmoothed: this.lastSmoothedLat !== null,
    };
  }
}

