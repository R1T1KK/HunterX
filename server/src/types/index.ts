export interface HealthResponse {
  status: "ok";
  service: "hiderush-server";
  uptime: number;
  timestamp: string;
  environment: string;
}

export interface Player {
  playerId: string;
  socketId: string;
  callsign: string;
  joinedAt: string;
  isHost: boolean;
}

export type RoomStatus = "WAITING" | "STARTING" | "IN_PROGRESS" | "COMPLETED";

export interface Room {
  roomCode: string;
  hostPlayerId: string;
  createdAt: string;
  updatedAt: string;
  status: RoomStatus;
  maxPlayers: number;
  players: Player[];
}

export interface RoomOperationResult {
  room: Room | null;
  player: Player | null;
  wasHost: boolean;
  newHostId?: string;
  isEmpty: boolean;
}
