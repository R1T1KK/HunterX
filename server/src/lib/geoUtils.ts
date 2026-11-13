/**
 * Server-side Geodesic and Spatial Math Utilities
 */

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


