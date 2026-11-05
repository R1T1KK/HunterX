import { Server, Socket } from "socket.io";
import { roomManager, RoomError } from "../services/RoomManager.js";

export function registerRoomHandlers(io: Server, socket: Socket) {
  // 1. Host creates a room
  socket.on(
    "room:create",
    (
      payload: { playerId: string; callsign: string },
      callback?: (response: { success: boolean; data?: unknown; error?: unknown }) => void
    ) => {
      try {
        const room = roomManager.createRoom({
          hostPlayerId: payload.playerId,
          callsign: payload.callsign,
          socketId: socket.id,
        });

        // Join Socket.IO room channel
        socket.join(room.roomCode);

        console.log(`🏰 [Room] Created: ${room.roomCode} by ${payload.callsign} (${payload.playerId})`);

        socket.emit("room:created", { room });

        if (typeof callback === "function") {
          callback({ success: true, data: { room } });
        }
      } catch (err: unknown) {
        const error =
          err instanceof RoomError
            ? { code: err.code, message: err.message }
            : { code: "CREATE_ROOM_FAILED", message: (err as Error).message };

        console.error(`❌ [Room] Create failed:`, error);
        socket.emit("room:error", error);

        if (typeof callback === "function") {
          callback({ success: false, error });
        }
      }
    }
  );

  // 2. Player joins an existing room
  socket.on(
    "room:join",
    (
      payload: { roomCode: string; playerId: string; callsign: string },
      callback?: (response: { success: boolean; data?: unknown; error?: unknown }) => void
    ) => {
      try {
        const room = roomManager.joinRoom({
          roomCode: payload.roomCode,
          playerId: payload.playerId,
          callsign: payload.callsign,
          socketId: socket.id,
        });

        // Join Socket.IO room channel
        socket.join(room.roomCode);

        const joinedPlayer = room.players.find((p) => p.playerId === payload.playerId)!;

        console.log(`🤝 [Room] Player ${payload.callsign} joined ${room.roomCode}`);

        // Acknowledge to the joining player
        socket.emit("room:joined", { room });

        // Broadcast to all other players in the room that someone joined
        socket.to(room.roomCode).emit("room:player-joined", {
          player: joinedPlayer,
          room,
        });

        // Broadcast updated state to everyone
        io.to(room.roomCode).emit("room:state-updated", { room });

        if (typeof callback === "function") {
          callback({ success: true, data: { room } });
        }
      } catch (err: unknown) {
        const error =
          err instanceof RoomError
            ? { code: err.code, message: err.message }
            : { code: "JOIN_ROOM_FAILED", message: (err as Error).message };

        console.error(`❌ [Room] Join failed:`, error);
        socket.emit("room:error", error);

        if (typeof callback === "function") {
          callback({ success: false, error });
        }
      }
    }
  );

  // 3. Player leaves a room
  socket.on(
    "room:leave",
    (
      payload: { roomCode: string; playerId: string },
      callback?: (response: { success: boolean; data?: unknown; error?: unknown }) => void
    ) => {
      try {
        const result = roomManager.leaveRoom(payload.roomCode, payload.playerId);
        socket.leave(payload.roomCode);

        console.log(`👋 [Room] Player ${payload.playerId} left ${payload.roomCode}`);

        if (result.room) {
          // Broadcast player departure to remaining members
          io.to(payload.roomCode).emit("room:player-left", {
            playerId: payload.playerId,
            callsign: result.player?.callsign || "Player",
            room: result.room,
            newHostId: result.newHostId,
          });

          io.to(payload.roomCode).emit("room:state-updated", { room: result.room });
        }

        if (typeof callback === "function") {
          callback({ success: true });
        }
      } catch (err: unknown) {
        console.error(`❌ [Room] Leave error:`, err);
        if (typeof callback === "function") {
          callback({ success: false, error: (err as Error).message });
        }
      }
    }
  );

  // 4. Socket disconnect handling
  socket.on("disconnect", () => {
    const result = roomManager.removeSocket(socket.id);

    if (result.room && result.player) {
      console.log(`🔌 [Room] Socket disconnected: ${result.player.callsign} from room ${result.room.roomCode}`);

      io.to(result.room.roomCode).emit("room:player-left", {
        playerId: result.player.playerId,
        callsign: result.player.callsign,
        room: result.room,
        newHostId: result.newHostId,
      });

      io.to(result.room.roomCode).emit("room:state-updated", { room: result.room });
    }
  });
}

