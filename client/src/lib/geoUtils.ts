import { GPSSignalQuality, GPSStatus } from "@/types";

/**
 * Creates a GeoJSON Polygon Feature representing a metric circle on the globe.
 * Uses exact geodesic math (WGS-84 ellipsoid approximation) so the radius in meters
 * scales correctly across all latitudes and zoom levels in Mapbox GL JS.
 */
export function createGeoJsonCircle(
  center: [number, number],
  radiusInMeters: number,
  points: number = 64
): GeoJSON.Feature<GeoJSON.Polygon> {
  const [lng, lat] = center;
  const coordinates: [number, number][] = [];
  const earthRadius = 6378137; // WGS-84 equatorial radius in meters

  // Clamp radius to sane positive bounds (minimum 3 meters for GPS display)
  const safeRadius = Math.max(3, radiusInMeters);

  const radLat = (lat * Math.PI) / 180;

  for (let i = 0; i < points; i++) {
    const theta = (i / points) * (2 * Math.PI);
    const dLat = (safeRadius / earthRadius) * Math.sin(theta) * (180 / Math.PI);
    const dLng =
      ((safeRadius / earthRadius) * Math.cos(theta) * (180 / Math.PI)) /
      Math.cos(radLat);

    coordinates.push([lng + dLng, lat + dLat]);
  }

  // Close the polygon
  coordinates.push(coordinates[0]);

  return {
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [coordinates],
    },
    properties: {
      radius: safeRadius,
    },
  };
}

/**
 * Evaluates GPS accuracy and returns the standardized tactical signal quality state,
 * label, and color code matching the exact Day 5 specifications:
 *
 * GREEN: Accuracy < 10 meters -> "GPS EXCELLENT"
 * AMBER: Accuracy >= 10 meters AND <= 20 meters -> "GPS MODERATE"
 * RED: Accuracy > 20 meters -> "GPS WEAK"
 * Additional states: ACQUIRING GPS, GPS SIGNAL LOST, LOCATION PERMISSION DENIED, GPS UNAVAILABLE
 */
export function evaluateSignalQuality(
  accuracy: number | null | undefined,
  status: GPSStatus,
  isSignalLost: boolean = false
): {
  quality: GPSSignalQuality;
  label: string;
  badgeColor: string;
  strokeColor: string;
  fillColor: string;
} {
  if (status === "DENIED") {
    return {
      quality: "DENIED",
      label: "LOCATION PERMISSION DENIED",
      badgeColor: "#EF4444", // Red-500
      strokeColor: "#EF4444",
      fillColor: "rgba(239, 68, 68, 0.2)",
    };
  }

  if (status === "UNAVAILABLE") {
    return {
      quality: "UNAVAILABLE",
      label: "GPS UNAVAILABLE",
      badgeColor: "#9CA3AF", // Gray-400
      strokeColor: "#9CA3AF",
      fillColor: "rgba(156, 163, 175, 0.2)",
    };
  }

  if (isSignalLost) {
    return {
      quality: "SIGNAL_LOST",
      label: "GPS SIGNAL LOST",
      badgeColor: "#FF3B30", // Crimson
      strokeColor: "#FF3B30",
      fillColor: "rgba(255, 59, 48, 0.25)",
    };
  }

  if (accuracy === null || accuracy === undefined || status === "ACQUIRING") {
    return {
      quality: "ACQUIRING",
      label: "ACQUIRING GPS",
      badgeColor: "#06B6D4", // Cyan-500
      strokeColor: "#06B6D4",
      fillColor: "rgba(6, 182, 212, 0.2)",
    };
  }

  // Exact Day 5 Thresholds
  if (accuracy < 10) {
    return {
      quality: "EXCELLENT",
      label: "GPS EXCELLENT",
      badgeColor: "#10B981", // Emerald-500 (Green)
      strokeColor: "#10B981",
      fillColor: "rgba(16, 185, 129, 0.18)",
    };
  }

  if (accuracy <= 20) {
    return {
      quality: "MODERATE",
      label: "GPS MODERATE",
      badgeColor: "#FF9500", // Amber (Orange)
      strokeColor: "#FF9500",
      fillColor: "rgba(255, 149, 0, 0.18)",
    };
  }

  return {
    quality: "WEAK",
    label: "GPS WEAK",
    badgeColor: "#FF3B30", // Red (Crimson)
    strokeColor: "#FF3B30",
    fillColor: "rgba(255, 59, 48, 0.22)",
  };
}

/**
 * Calculates great-circle distance between two [lng, lat] coordinates in meters
 * using the Haversine formula.
 */
export function calculateHaversineDistance(
  coord1: [number, number],
  coord2: [number, number]
): number {
  const [lng1, lat1] = coord1;
  const [lng2, lat2] = coord2;
  const earthRadius = 6371000; // Mean Earth radius in meters

  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadius * c;
}

/**
 * Calculates initial compass bearing from coord1 to coord2 in degrees (0 - 360).
 */
export function calculateBearing(
  coord1: [number, number],
  coord2: [number, number]
): number {
  const [lng1, lat1] = coord1;
  const [lng2, lat2] = coord2;

  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaLambda = ((lng2 - lng1) * Math.PI) / 180;

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);

  const theta = Math.atan2(y, x);
  const bearing = (theta * 180) / Math.PI;

  return (bearing + 360) % 360;
}

/**
 * Standard linear interpolation (LERP) between scalar A and B.
 * Formula: Lerp(A, B, t) = A + (B - A) * t
 */
export function lerp(a: number, b: number, t: number): number {
  const clampedT = Math.max(0, Math.min(1, t));
  return a + (b - a) * clampedT;
}

/**
 * Longitude linear interpolation with antimeridian (+/-180 degree) wrapping.
 */
export function lerpLongitude(lngA: number, lngB: number, t: number): number {
  const clampedT = Math.max(0, Math.min(1, t));
  if (clampedT === 0) return lngA;
  if (clampedT === 1) return lngB;

  const delta = ((lngB - lngA + 540) % 360) - 180;
  if (delta === 0) return lngA;

  const result = lngA + delta * clampedT;
  return ((result + 540) % 360) - 180;
}

/**
 * Angular linear interpolation along the shortest rotation path (0 - 360 degrees).
 */
export function lerpAngle(angleA: number, angleB: number, t: number): number {
  const clampedT = Math.max(0, Math.min(1, t));
  if (clampedT === 0) return angleA;
  if (clampedT === 1) return angleB;

  const diff = ((angleB - angleA + 540) % 360) - 180;
  if (diff === 0) return angleA;

  return (angleA + diff * clampedT + 360) % 360;
}

/**
 * 2D geospatial coordinate interpolation between [lngA, latA] and [lngB, latB].
 */
export function lerpCoordinates(
  coordA: [number, number],
  coordB: [number, number],
  t: number
): [number, number] {
  return [
    lerpLongitude(coordA[0], coordB[0], t),
    lerp(coordA[1], coordB[1], t),
  ];
}



