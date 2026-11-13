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

export interface PlayerLocation {
  lat: number;
  lng: number;
  accuracy: number;
  heading: number | null;
  speed: number | null;
  timestamp: number;
  updatedAt: number;
}

export interface SmoothedCoordinate {
  lat: number;
  lng: number;
  accuracy: number;
  heading: number | null;
  speed: number | null;
  timestamp: number;
  distanceDeltaMeters: number;
  isSmoothed: boolean;
}

export interface LocationUpdatePayload {
  roomCode: string;
  playerId: string;
  lat: number;
  lng: number;
  accuracy: number;
  heading?: number | null;
  speed?: number | null;
  timestamp: number;
}

export type PlayerRole = "HUNTER" | "RUNNER";

export interface RemotePlayerState {
  playerId: string;
  callsign: string;
  role: PlayerRole;
  currentLng: number;
  currentLat: number;
  targetLng: number;
  targetLat: number;
  previousLng: number;
  previousLat: number;
  currentHeading: number;
  targetHeading: number;
  previousHeading: number;
  startTime: number;
  durationMs: number;
  lastUpdated: number;
}

export interface Player {
  playerId: string;
  socketId: string;
  callsign: string;
  joinedAt: string;
  isHost: boolean;
  isReady: boolean;
  gpsStatus: GPSStatus;
  role?: PlayerRole;
  lastLocation?: PlayerLocation;
}

export type GameState = "LOBBY" | "COUNTDOWN" | "IN_PROGRESS" | "COMPLETED";

export type RoomStatus =
  | "WAITING"
  | "LOBBY"
  | "STARTING"
  | "COUNTDOWN"
  | "IN_PROGRESS"
  | "COMPLETED";

export interface MatchClockPayload {
  matchId: string;
  gameState: GameState;
  phase: "HEAD_START" | "MATCH" | "ENDED";
  remainingSeconds: number;
  headStartEndsAt?: number;
  matchEndsAt?: number;
  serverTimestamp: number;
}

export interface GameCountdownPayload {
  matchId: string;
  gameState: "COUNTDOWN";
  startedAt: number;
  headStartEndsAt: number;
  headStartDurationSeconds: number;
  remainingSeconds: number;
  serverTimestamp: number;
  room: Room;
}

export interface GameStartedPayload {
  matchId: string;
  gameState: "IN_PROGRESS";
  startedAt: number;
  matchEndsAt: number;
  roundDurationSeconds: number;
  remainingSeconds: number;
  serverTimestamp: number;
  room: Room;
}

export interface GameEndedPayload {
  matchId: string;
  gameState: "COMPLETED";
  winner: "RUNNERS" | "HUNTERS";
  reason: string;
  serverTimestamp: number;
  room: Room;
}

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
