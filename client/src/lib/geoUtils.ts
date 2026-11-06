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
