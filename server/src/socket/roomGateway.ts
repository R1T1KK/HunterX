import { Server, Socket } from "socket.io";
import { roomManager, RoomError } from "../services/RoomManager.js";
import { locationManager } from "../services/LocationManager.js";
import { gameManager } from "../services/GameManager.js";
import { RoleAssignmentEngine } from "../services/RoleAssignmentEngine.js";
import { GPSStatus, HouseRules, RoleSettings, RulesPreset, LocationUpdatePayload } from "../types/index.js";

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

        socket.join(room.roomCode);

        const joinedPlayer = room.players.find((p) => p.playerId === payload.playerId)!;

        console.log(`🤝 [Room] Player ${payload.callsign} joined ${room.roomCode}`);

        socket.emit("room:joined", { room });

        socket.to(room.roomCode).emit("room:player-joined", {
          player: joinedPlayer,
          room,
        });

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

        if (result.isEmpty) {
          gameManager.stopMatch(payload.roomCode);
        }

        if (result.room) {
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

  // 4. Host regenerates room code
  socket.on(
    "room:regenerate-code",
    (
      payload: { oldCode: string; requesterPlayerId: string },
      callback?: (response: { success: boolean; data?: unknown; error?: unknown }) => void
    ) => {
      try {
        const result = roomManager.regenerateRoomCode(payload.oldCode, payload.requesterPlayerId);

        // Move all sockets from old room channel to new room channel
        io.in(result.oldCode).socketsJoin(result.newCode);
        io.in(result.oldCode).socketsLeave(result.oldCode);

        console.log(`🔄 [Room] Code regenerated: ${result.oldCode} -> ${result.newCode}`);

        io.to(result.newCode).emit("room:code-regenerated", {
          oldCode: result.oldCode,
          newCode: result.newCode,
          room: result.room,
        });

        io.to(result.newCode).emit("room:state-updated", { room: result.room });

        if (typeof callback === "function") {
          callback({ success: true, data: result });
        }
      } catch (err: unknown) {
        const error =
          err instanceof RoomError
            ? { code: err.code, message: err.message }
            : { code: "REGENERATE_FAILED", message: (err as Error).message };

        console.error(`❌ [Room] Regenerate code failed:`, error);
        socket.emit("room:error", error);

        if (typeof callback === "function") {
          callback({ success: false, error });
        }
      }
    }
  );

  // 5. Host updates house rules (presets or custom)
  socket.on(
    "room:update-rules",
    (
      payload: {
        roomCode: string;
        requesterPlayerId: string;
        rules: {
          preset: RulesPreset;
          roundLengthMinutes?: number;
          headStartSeconds?: number;
          pingIntervalSeconds?: number;
          playZoneEnabled?: boolean;
          zoneSizeMeters?: number;
          zoneShrinks?: boolean;
          zoneShrinkIntervalMinutes?: number;
          huntersCanTalk?: boolean;
        };
      },
      callback?: (response: { success: boolean; data?: unknown; error?: unknown }) => void
    ) => {
      try {
        const updatedRoom = roomManager.updateHouseRules(
          payload.roomCode,
          payload.requesterPlayerId,
          payload.rules
        );

        console.log(`⚙️ [Room] Rules updated for ${payload.roomCode}: Preset ${updatedRoom.rules.preset}`);

        io.to(payload.roomCode).emit("room:settings-updated", {
          rules: updatedRoom.rules,
          room: updatedRoom,
        });

        io.to(payload.roomCode).emit("room:state-updated", { room: updatedRoom });

        if (typeof callback === "function") {
          callback({ success: true, data: { room: updatedRoom } });
        }
      } catch (err: unknown) {
        const error =
          err instanceof RoomError
            ? { code: err.code, message: err.message }
            : { code: "UPDATE_RULES_FAILED", message: (err as Error).message };

        console.error(`❌ [Room] Update rules failed:`, error);
        socket.emit("room:error", error);

        if (typeof callback === "function") {
          callback({ success: false, error });
        }
      }
    }
  );

  // 6. Host updates role settings (hunter count, mode)
  socket.on(
    "room:update-role-settings",
    (
      payload: {
        roomCode: string;
        requesterPlayerId: string;
        roleSettings: RoleSettings;
      },
      callback?: (response: { success: boolean; data?: unknown; error?: unknown }) => void
    ) => {
      try {
        const updatedRoom = roomManager.updateRoleSettings(
          payload.roomCode,
          payload.requesterPlayerId,
          payload.roleSettings
        );

        console.log(`🎭 [Room] Role settings updated for ${payload.roomCode}: ${payload.roleSettings.hunterCount} Hunters`);

        io.to(payload.roomCode).emit("room:role-settings-updated", {
          roleSettings: updatedRoom.roleSettings,
          room: updatedRoom,
        });

        io.to(payload.roomCode).emit("room:state-updated", { room: updatedRoom });

        if (typeof callback === "function") {
          callback({ success: true, data: { room: updatedRoom } });
        }
      } catch (err: unknown) {
        const error =
          err instanceof RoomError
            ? { code: err.code, message: err.message }
            : { code: "UPDATE_ROLES_FAILED", message: (err as Error).message };

        console.error(`❌ [Room] Update role settings failed:`, error);
        socket.emit("room:error", error);

        if (typeof callback === "function") {
          callback({ success: false, error });
        }
      }
    }
  );

  // 6.1 Host manually assigns Hunter roles
  socket.on(
    "room:assign-manual-roles",
    (
      payload: { roomCode: string; requesterPlayerId: string; hunterPlayerIds: string[] },
      callback?: (response: { success: boolean; data?: unknown; error?: unknown }) => void
    ) => {
      try {
        const updatedRoom = roomManager.assignManualRoles(
          payload.roomCode,
          payload.requesterPlayerId,
          payload.hunterPlayerIds
        );

        console.log(
          `🎯 [Room] Manual roles assigned for ${payload.roomCode}: Hunters = [${payload.hunterPlayerIds.join(", ")}]`
        );

        RoleAssignmentEngine.broadcastRoleAssignments(io, updatedRoom);

        if (typeof callback === "function") {
          callback({ success: true, data: { room: updatedRoom } });
        }
      } catch (err: unknown) {
        const error =
          err instanceof RoomError
            ? { code: err.code, message: err.message }
            : { code: "MANUAL_ROLE_ASSIGNMENT_FAILED", message: (err as Error).message };

        console.error(`❌ [Room] Manual role assignment rejected:`, error);
        socket.emit("room:error", error);

        if (typeof callback === "function") {
          callback({ success: false, error });
        }
      }
    }
  );

  // 6.2 Strict Role Security: Reject client-side role tampering / forgery
  const handleClientRoleTampering = (
    _payload: unknown,
    callback?: (response: { success: boolean; error: { code: string; message: string } }) => void
  ) => {
    const error = {
      code: "UNAUTHORIZED_ROLE_MUTATION",
      message: "Client-side role modification is strictly forbidden. Roles are server-authoritative.",
    };
    console.warn(`🛡️ [Security] Blocked unauthorized client role tampering attempt from socket ${socket.id}`);
    socket.emit("room:error", error);
    if (typeof callback === "function") {
      callback({ success: false, error });
    }
  };

  socket.on("role:change", handleClientRoleTampering);
  socket.on("player:set-role", handleClientRoleTampering);
  socket.on("role:set", handleClientRoleTampering);
  socket.on("role:update", handleClientRoleTampering);

  // 7. Player updates ready status
  socket.on(
    "room:update-ready",
    (
      payload: { roomCode: string; playerId: string; isReady: boolean },
      callback?: (response: { success: boolean; data?: unknown; error?: unknown }) => void
    ) => {
      try {
        const updatedRoom = roomManager.updatePlayerReady(
          payload.roomCode,
          payload.playerId,
          payload.isReady
        );

        console.log(`✅ [Room] Ready status updated: ${payload.playerId} -> ${payload.isReady}`);

        io.to(payload.roomCode).emit("room:player-ready-updated", {
          playerId: payload.playerId,
          isReady: payload.isReady,
          room: updatedRoom,
        });

        io.to(payload.roomCode).emit("room:state-updated", { room: updatedRoom });

        if (typeof callback === "function") {
          callback({ success: true, data: { room: updatedRoom } });
        }
      } catch (err: unknown) {
        console.error(`❌ [Room] Update ready failed:`, err);
        if (typeof callback === "function") {
          callback({ success: false, error: (err as Error).message });
        }
      }
    }
  );

  // 8. Player updates GPS lock status
  socket.on(
    "room:update-gps-status",
    (
      payload: { roomCode: string; playerId: string; gpsStatus: GPSStatus },
      callback?: (response: { success: boolean; data?: unknown; error?: unknown }) => void
    ) => {
      try {
        const updatedRoom = roomManager.updatePlayerGPSStatus(
          payload.roomCode,
          payload.playerId,
          payload.gpsStatus
        );

        io.to(payload.roomCode).emit("room:gps-status-updated", {
          playerId: payload.playerId,
          gpsStatus: payload.gpsStatus,
          room: updatedRoom,
        });

        io.to(payload.roomCode).emit("room:state-updated", { room: updatedRoom });

        if (typeof callback === "function") {
          callback({ success: true, data: { room: updatedRoom } });
        }
      } catch (err: unknown) {
        console.error(`❌ [Room] Update GPS failed:`, err);
        if (typeof callback === "function") {
          callback({ success: false, error: (err as Error).message });
        }
      }
    }
  );

  // 9. Host starts game (Authoritative Game State Machine: LOBBY -> COUNTDOWN -> IN_PROGRESS)
  const handleStartGame = (
    payload: { roomCode: string; requesterPlayerId: string },
    callback?: (response: { success: boolean; data?: unknown; error?: unknown }) => void
  ) => {
    try {
      const { session, room } = gameManager.startMatch(
        io,
        payload.roomCode,
        payload.requesterPlayerId
      );

      console.log(`🚀 [Room] Game STARTED for ${payload.roomCode} in COUNTDOWN phase (30s Head-Start)!`);

      if (typeof callback === "function") {
        callback({ success: true, data: { room, session } });
      }
    } catch (err: unknown) {
      const error =
        err instanceof RoomError
          ? { code: err.code, message: err.message }
          : { code: "CANNOT_START_GAME", message: (err as Error).message };

      console.error(`❌ [Room] Start game rejected:`, error);
      socket.emit("room:error", error);

      if (typeof callback === "function") {
        callback({ success: false, error });
      }
    }
  };

  socket.on("room:start-game", handleStartGame);
  socket.on("game:start", handleStartGame);

  // 9.1 Player requests authoritative game clock sync (e.g. reconnect or page reload)
  socket.on(
    "game:sync",
    (
      payload: { roomCode: string },
      callback?: (response: { success: boolean; data?: unknown; error?: unknown }) => void
    ) => {
      const sync = gameManager.getSyncPayload(payload.roomCode);
      const room = roomManager.findRoom(payload.roomCode);

      const response = {
        success: Boolean(room),
        data: {
          sync,
          room,
        },
      };

      socket.emit("game:synced", response.data);
      if (typeof callback === "function") {
        callback(response);
      }
    }
  );

  // 9.2 Host ends match prematurely
  socket.on(
    "game:end",
    (
      payload: { roomCode: string; reason?: string; winner?: "RUNNERS" | "HUNTERS" },
      callback?: (response: { success: boolean; data?: unknown; error?: unknown }) => void
    ) => {
      try {
        const ended = gameManager.endMatch(
          io,
          payload.roomCode,
          payload.reason || "HOST_ABORTED",
          payload.winner || "RUNNERS"
        );
        if (typeof callback === "function") {
          callback({ success: true, data: ended });
        }
      } catch (err: unknown) {
        if (typeof callback === "function") {
          callback({ success: false, error: (err as Error).message });
        }
      }
    }
  );

  // 10. Player streams validated location update (Max 1 Hz)
  // MANDATORY SECURITY RULE: During Head-Start COUNTDOWN phase, Hunters MUST NOT receive Runner coordinates!
  socket.on(
    "location:update",
    (
      payload: LocationUpdatePayload,
      callback?: (response: { success: boolean; data?: unknown; error?: unknown }) => void
    ) => {
      const result = locationManager.processLocationUpdate(payload, socket.id);

      if (!result.success) {
        if (typeof callback === "function") {
          callback({ success: false, error: result.error });
        }
        return;
      }

      const room = roomManager.findRoom(payload.roomCode);
      const player = room?.players.find((p) => p.playerId === payload.playerId);
      const senderRole = player?.role || "RUNNER";

      if (room && room.status === "COUNTDOWN") {
        // ENFORCE BACKEND RESTRICTION:
        // If sender is RUNNER, broadcast ONLY to other RUNNERS. Hunters get ZERO runner packets!
        if (senderRole === "RUNNER") {
          for (const recipient of room.players) {
            if (recipient.playerId !== payload.playerId && recipient.role === "RUNNER") {
              io.to(recipient.socketId).emit("location:player-updated", {
                playerId: payload.playerId,
                callsign: player?.callsign,
                role: "RUNNER",
                location: result.location,
              });
            }
          }
        } else {
          // If sender is HUNTER, broadcast ONLY to fellow HUNTERS
          for (const recipient of room.players) {
            if (recipient.playerId !== payload.playerId && recipient.role === "HUNTER") {
              io.to(recipient.socketId).emit("location:player-updated", {
                playerId: payload.playerId,
                callsign: player?.callsign,
                role: "HUNTER",
                location: result.location,
              });
            }
          }
        }
      } else {
        // Normal broadcast to all room peers during IN_PROGRESS or WAITING
        socket.to(payload.roomCode).emit("location:player-updated", {
          playerId: payload.playerId,
          callsign: player?.callsign,
          role: senderRole,
          location: result.location,
        });
      }

      if (typeof callback === "function") {
        callback({ success: true, data: { location: result.location } });
      }
    }
  );

  // 11. Socket disconnect handling
  socket.on("disconnect", () => {
    const result = roomManager.removeSocket(socket.id);

    if (result.room && result.player) {
      console.log(`🔌 [Room] Socket disconnected: ${result.player.callsign} from room ${result.room.roomCode}`);

      locationManager.clearPlayer(result.player.playerId);

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
