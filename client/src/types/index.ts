export type GPSStatus = "LOCKED" | "ACQUIRING" | "UNAVAILABLE" | "DENIED";

export type GPSSignalQuality =
  | "EXCELLENT"
  | "MODERATE"
  | "WEAK"
  | "ACQUIRING"
  | "SIGNAL_LOST"
  | "DENIED"
  | "UNAVAILABLE";

export interface GeolocationCoords {
  lat: number;
  lng: number;
  accuracy: number; // in meters
  altitude: number | null;
  altitudeAccuracy: number | null;
  heading: number | null;
  speed: number | null;
  timestamp: number;
}

export interface GeolocationState {
  status: GPSStatus;
  quality: GPSSignalQuality;
  qualityLabel: string;
  coords: GeolocationCoords | null;
  errorMessage: string | null;
  isHighAccuracy: boolean;
}

export interface Player {
  playerId: string;
  socketId: string;
  callsign: string;
  joinedAt: string;
  isHost: boolean;
  isReady: boolean;
  gpsStatus: GPSStatus;
}

export type RoomStatus = "WAITING" | "STARTING" | "IN_PROGRESS" | "COMPLETED";

export type RulesPreset = "QUICK" | "STANDARD" | "BIG_PARK" | "CUSTOM";

export interface HouseRules {
  preset: RulesPreset;
  roundLengthMinutes: number;
  headStartSeconds: number;
  pingIntervalSeconds: number;
  playZoneEnabled: boolean;
  zoneSizeMeters: number;
  zoneShrinks: boolean;
  zoneShrinkIntervalMinutes: number;
  huntersCanTalk: boolean;
}

export interface RoleSettings {
  hunterCount: number;
  mode: "HUNTER" | "RUNNER" | "RANDOM";
}

export interface Room {
  roomCode: string;
  hostPlayerId: string;
  createdAt: string;
  updatedAt: string;
  status: RoomStatus;
  maxPlayers: number;
  players: Player[];
  rules: HouseRules;
  roleSettings: RoleSettings;
}

export interface SocketErrorPayload {
  code: string;
  message: string;
}
