export interface HealthResponse {
  status: "ok";
  service: "hiderush-server";
  uptime: number;
  timestamp: string;
  environment: string;
}

export type GPSStatus = "LOCKED" | "ACQUIRING" | "UNAVAILABLE" | "DENIED";

export interface PlayerLocation {
  lat: number;
  lng: number;
  accuracy: number;
  heading: number | null;
  speed: number | null;
  timestamp: number;
  updatedAt: number;
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

export interface Player {
  playerId: string;
  socketId: string;
  callsign: string;
  joinedAt: string;
  isHost: boolean;
  isReady: boolean;
  gpsStatus: GPSStatus;
  lastLocation?: PlayerLocation;
}

export type RoomStatus = "WAITING" | "STARTING" | "IN_PROGRESS" | "COMPLETED";

export type RulesPreset = "QUICK" | "STANDARD" | "BIG_PARK" | "CUSTOM";

export interface HouseRules {
  preset: RulesPreset;
  roundLengthMinutes: number; // 5, 10, 15, 20
  headStartSeconds: number; // 15, 30, 60, 90
  pingIntervalSeconds: number; // 30, 60, 90, 120
  playZoneEnabled: boolean;
  zoneSizeMeters: number; // e.g. 250, 420, 500, 1000
  zoneShrinks: boolean;
  zoneShrinkIntervalMinutes: number; // e.g. 5
  huntersCanTalk: boolean;
}

export interface RoleSettings {
  hunterCount: number; // 1, 2, 3
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

export interface RoomOperationResult {
  room: Room | null;
  player: Player | null;
  wasHost: boolean;
  newHostId?: string;
  isEmpty: boolean;
}

export interface SocketErrorPayload {
  code: string;
  message: string;
}
