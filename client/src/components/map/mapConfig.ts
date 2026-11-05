/**
 * HIDERUSH Mapbox GL JS Configuration & Dark Vector Styling
 * SCRAM-inspired mobile tactical palette with high-contrast road networks,
 * muted dark greens for parks, deep blue-grey for water bodies, and crimson accents.
 */

export const MAP_COLORS = {
  background: "#07090E",
  surface: "#121620",
  card: "#191D26",
  crimson: "#FF3B30",
  crimsonSecondary: "#FF4655",
  amber: "#FF9500",
  road: "#252C3D",
  roadMajor: "#38435C",
  building: "#151B27",
  park: "#13231B",
  water: "#0C1726",
  label: "#FFFFFF",
  labelMuted: "#848D9F",
} as const;

export const MAP_CONFIG = {
  defaultStyle: "mapbox://styles/mapbox/dark-v11",
  defaultCenter: [77.2090, 28.6139] as [number, number],
  defaultZoom: 16,
  minZoom: 12,
  maxZoom: 20,
  maxPitch: 60,
  minPitch: 0,
} as const;

export function getMapboxToken(): string {
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "";
  return token.trim();
}

export function isMapboxTokenValid(token?: string): boolean {
  const t = token ?? getMapboxToken();
  return Boolean(t && t.length > 20 && (t.startsWith("pk.") || t.startsWith("sk.")));
}

/**
 * Tactical Dark Vector Style JSON used as offline fallback
 * or when token is being configured, ensuring the full-bleed canvas
 * always renders a high-contrast dark grid without crashes.
 */
export const FALLBACK_TACTICAL_STYLE = {
  version: 8 as const,
  name: "HIDERUSH Tactical Dark",
  sources: {},
  layers: [
    {
      id: "background",
      type: "background" as const,
      paint: {
        "background-color": MAP_COLORS.background,
      },
    },
  ],
};
