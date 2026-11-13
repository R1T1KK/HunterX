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

export type PlayerRole = "HUNTER" | "RUNNER";

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
  mode: "HUNTER" | "RUNNER" | "RANDOM" | "MANUAL";
}

export interface RoleAssignedPayload {
  matchId?: string;
  roomCode: string;
  playerId: string;
  callsign: string;
  role: PlayerRole;
  assignedAt: number;
}

export interface ManualRoleAssignmentPayload {
  roomCode: string;
  requesterPlayerId: string;
  hunterPlayerIds: string[];
}

export interface RoomRolesAssignedPayload {
  roomCode: string;
  matchId?: string;
  assignments: Array<{
    playerId: string;
    callsign: string;
    role: PlayerRole;
  }>;
  room: Room;
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
