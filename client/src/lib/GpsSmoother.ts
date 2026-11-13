import { calculateHaversineDistance, calculateBearing } from "./geoUtils";

export interface GpsFilterOptions {
  /**
   * EMA Smoothing factor (alpha). Default: 0.25
   * 0.0 < alpha <= 1.0. Lower values = smoother/less jitter, higher = more reactive.
   */
  alpha?: number;

  /**
   * Maximum allowed GPS accuracy radius in meters. Default: 25.0
   * Readings with coords.accuracy > this threshold are discarded to avoid false movement.
   */
  maxAllowedAccuracyMeters?: number;

  /**
   * Maximum plausible human sprint speed in m/s under game conditions. Default: 12.0 m/s (~43.2 km/h)
   */
  maxPlausibleSpeedMps?: number;

  /**
   * Inactivity elapsed time threshold in ms after which jump rejection re-anchors. Default: 15000 ms (15s)
   */
  reanchorTimeoutMs?: number;

  /**
   * Number of consecutive persistent readings at a new position required to force re-anchor. Default: 3
   */
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
 * Exponential Moving Average (EMA) GPS filter with physical jump validation.
 * Eliminates standing jitter while preserving responsive walking movement.
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

  /**
   * Resets the filter state (e.g. for a new match, room join, or reconnect).
   */
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

  /**
   * Updates alpha dynamically if needed.
   */
  public setAlpha(newAlpha: number): void {
    this.alpha = Math.min(1, Math.max(0.01, newAlpha));
  }

  public getAlpha(): number {
    return this.alpha;
  }

  /**
   * Processes a raw GPS reading through validation and the EMA filter.
   */
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

    // 5. Calculate physical distance between previous smoothed coordinate and incoming raw coordinate
    const distanceDelta = calculateHaversineDistance(
      [this.lastSmoothedLng, this.lastSmoothedLat],
      [lng, lat]
    );

    // 6. Plausible movement check with uncertainty tolerance
    // Max allowable distance = (maxSpeed * elapsedSec) + (currentAccuracy + lastAccuracy)
    const allowedDistance =
      this.maxPlausibleSpeed * elapsedSec + (accuracy + (this.lastSmoothedAccuracy ?? 10));

    const isJump = distanceDelta > allowedDistance;
    const isTimeout = elapsedMs >= this.reanchorTimeoutMs;

    if (isJump && !isTimeout) {
      this.consecutiveJumpCount++;

      // Check if the jump is consistent across multiple ticks (user actually moved / drove)
      if (this.lastJumpReading) {
        const jumpDelta = calculateHaversineDistance(
          [this.lastJumpReading.lng, this.lastJumpReading.lat],
          [lng, lat]
        );
        if (jumpDelta > 15) {
          // Inconsistent erratic spikes, reset consecutive jump count
          this.consecutiveJumpCount = 1;
        }
      }
      this.lastJumpReading = reading;

      if (this.consecutiveJumpCount < this.consecutiveJumpsToReanchor) {
        return this.createRejectedResult(reading, "IMPLAUSIBLE_JUMP", distanceDelta);
      }
      // Reached consecutive jump threshold: re-anchor to new position
    }

    // Reset jump tracking on accepted reading
    this.consecutiveJumpCount = 0;
    this.lastJumpReading = null;

    // 7. Apply Exponential Moving Average (EMA) Formula:
    // S_t = alpha * X_t + (1 - alpha) * S_{t-1}
    const smoothedLat = this.alpha * lat + (1 - this.alpha) * this.lastSmoothedLat;
    const smoothedLng = this.alpha * lng + (1 - this.alpha) * this.lastSmoothedLng;
    const smoothedAccuracy =
      this.alpha * accuracy + (1 - this.alpha) * (this.lastSmoothedAccuracy ?? accuracy);

    // Determine heading: Use reported heading or compute bearing if significant movement (>= 0.5m)
    let finalHeading = heading ?? null;
    if (finalHeading === null && distanceDelta >= 0.5) {
      finalHeading = calculateBearing(
        [this.lastSmoothedLng, this.lastSmoothedLat],
        [smoothedLng, smoothedLat]
      );
    } else if (finalHeading === null) {
      finalHeading = this.lastAcceptedHeading;
    }

    // Determine speed: Use reported speed or compute from smoothed delta
    const actualSmoothedDelta = calculateHaversineDistance(
      [this.lastSmoothedLng, this.lastSmoothedLat],
      [smoothedLng, smoothedLat]
    );
    const calculatedSpeed = actualSmoothedDelta / elapsedSec;
    const finalSpeed = typeof speed === "number" && speed >= 0 ? speed : calculatedSpeed;

    // Update internal state
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

