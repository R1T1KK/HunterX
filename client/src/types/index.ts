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

export interface SocketErrorPayload {
  code: string;
  message: string;
}

