import crypto from "crypto";
import { Server } from "socket.io";
import { Room, PlayerRole, RoleAssignedPayload } from "../types/index.js";
import { RoomError } from "./RoomManager.js";

export interface RoleAssignmentResult {
  roomCode: string;
  matchId?: string;
  hunterCount: number;
  runnerCount: number;
  assignments: Array<{
    playerId: string;
    callsign: string;
    role: PlayerRole;
  }>;
}

export class RoleAssignmentEngine {
  /**
   * Cryptographically secure Fisher-Yates array shuffle using Node.js crypto.randomInt.
   * Guarantees uniform distribution without Math.random() predictability or bias.
   */
  public static secureShuffle<T>(items: T[]): T[] {
    const array = [...items];
    for (let i = array.length - 1; i > 0; i--) {
      // crypto.randomInt(min, max) returns unbiased random integer in [min, max)
      const j = crypto.randomInt(0, i + 1);
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  /**
   * Validates Hunter allocation count:
   * 1. Must be integer between 1 and 3.
   * 2. Total players must be >= 2.
   * 3. Total players must be strictly greater than hunterCount (at least 1 runner).
   */
  public static validateHunterCount(hunterCount: number, totalPlayers: number): void {
    if (!Number.isInteger(hunterCount) || hunterCount < 1 || hunterCount > 3) {
      throw new RoomError(
        "INVALID_HUNTER_COUNT",
        "Hunter allocation must be exactly 1, 2, or 3."
      );
    }

    if (totalPlayers < 2) {
      throw new RoomError(
        "INSUFFICIENT_PLAYERS",
        "At least 2 players are required to assign roles."
      );
    }

    if (hunterCount >= totalPlayers) {
      throw new RoomError(
        "INVALID_HUNTER_COUNT",
        `Hunter count (${hunterCount}) must be strictly less than total players (${totalPlayers}) so at least one Runner exists.`
      );
    }
  }

  /**
   * Executes cryptographically secure random role assignment for all players in a room.
   */
  public static assignRandomRoles(room: Room): RoleAssignmentResult {
    const totalPlayers = room.players.length;
    if (totalPlayers < 2) {
      throw new RoomError(
        "INSUFFICIENT_PLAYERS",
        "At least 2 players are required to assign roles."
      );
    }

    // Server-authoritatively clamp hunter count to [1, min(3, totalPlayers - 1)]
    const targetHunterCount = Math.min(
      Math.max(1, room.roleSettings?.hunterCount || 1),
      Math.min(3, Math.max(1, totalPlayers - 1))
    );

    this.validateHunterCount(targetHunterCount, totalPlayers);

    const mode = room.roleSettings?.mode || "RANDOM";
    const hunterPlayerIds: Set<string> = new Set();

    if (mode === "HUNTER") {
      // Host requested to be Hunter
      const host = room.players.find((p) => p.playerId === room.hostPlayerId);
      if (host) hunterPlayerIds.add(host.playerId);

      // If additional hunters needed, securely pick from remaining players
      if (hunterPlayerIds.size < targetHunterCount) {
        const remainingPlayers = room.players.filter((p) => !hunterPlayerIds.has(p.playerId));
        const shuffled = this.secureShuffle(remainingPlayers);
        for (const p of shuffled) {
          if (hunterPlayerIds.size >= targetHunterCount) break;
          hunterPlayerIds.add(p.playerId);
        }
      }
    } else if (mode === "RUNNER") {
      // Host requested to be Runner; pick Hunters from non-host players
      const nonHostPlayers = room.players.filter((p) => p.playerId !== room.hostPlayerId);
      const shuffled = this.secureShuffle(nonHostPlayers);
      for (const p of shuffled) {
        if (hunterPlayerIds.size >= targetHunterCount) break;
        hunterPlayerIds.add(p.playerId);
      }
      // Fallback if not enough non-host players
      if (hunterPlayerIds.size < targetHunterCount) {
        const remaining = room.players.filter((p) => !hunterPlayerIds.has(p.playerId));
        const shuffledRem = this.secureShuffle(remaining);
        for (const p of shuffledRem) {
          if (hunterPlayerIds.size >= targetHunterCount) break;
          hunterPlayerIds.add(p.playerId);
        }
      }
    } else {
      // Pure RANDOM cryptographic assignment using Fisher-Yates with crypto.randomInt
      const shuffledPlayers = this.secureShuffle(room.players);
      for (let i = 0; i < targetHunterCount; i++) {
        hunterPlayerIds.add(shuffledPlayers[i].playerId);
      }
    }

    // Apply authoritative roles to all players
    const assignments: Array<{ playerId: string; callsign: string; role: PlayerRole }> = [];

    room.players.forEach((player) => {
      const assignedRole: PlayerRole = hunterPlayerIds.has(player.playerId)
        ? "HUNTER"
        : "RUNNER";
      player.role = assignedRole;
      assignments.push({
        playerId: player.playerId,
        callsign: player.callsign,
        role: assignedRole,
      });
    });

    room.updatedAt = new Date().toISOString();

    return {
      roomCode: room.roomCode,
      hunterCount: hunterPlayerIds.size,
      runnerCount: room.players.length - hunterPlayerIds.size,
      assignments,
    };
  }

  /**
   * Executes authorized manual role assignment by Room Host.
   */
  public static assignManualRoles(
    room: Room,
    requesterPlayerId: string,
    hunterPlayerIds: string[]
  ): RoleAssignmentResult {
    if (room.hostPlayerId !== requesterPlayerId) {
      throw new RoomError("NOT_HOST", "Only the verified room host can manually assign roles.");
    }

    if (room.status !== "WAITING" && (room.status as string) !== "LOBBY") {
      throw new RoomError(
        "INVALID_STATE",
        "Roles cannot be modified while a match is starting, active, or completed."
      );
    }

    const uniqueHunterIds = Array.from(new Set(hunterPlayerIds));
    if (uniqueHunterIds.length !== hunterPlayerIds.length) {
      throw new RoomError("DUPLICATE_ROLE_ASSIGNMENT", "Duplicate player IDs specified for Hunters.");
    }

    const targetHunterCount = uniqueHunterIds.length;
    this.validateHunterCount(targetHunterCount, room.players.length);

    // Validate all specified Hunter IDs belong to current room roster
    const playerMap = new Map(room.players.map((p) => [p.playerId, p]));
    for (const hId of uniqueHunterIds) {
      if (!playerMap.has(hId)) {
        throw new RoomError(
          "INVALID_MANUAL_ASSIGNMENT",
          `Player ID '${hId}' is not in the room roster.`
        );
      }
    }

    const hunterSet = new Set(uniqueHunterIds);
    const assignments: Array<{ playerId: string; callsign: string; role: PlayerRole }> = [];

    room.players.forEach((player) => {
      const assignedRole: PlayerRole = hunterSet.has(player.playerId)
        ? "HUNTER"
        : "RUNNER";
      player.role = assignedRole;
      assignments.push({
        playerId: player.playerId,
        callsign: player.callsign,
        role: assignedRole,
      });
    });

    room.roleSettings.hunterCount = targetHunterCount;
    room.updatedAt = new Date().toISOString();

    return {
      roomCode: room.roomCode,
      hunterCount: hunterSet.size,
      runnerCount: room.players.length - hunterSet.size,
      assignments,
    };
  }

  /**
   * Dispatches role:assigned privately to each connected player's socket
   * and synchronizes the updated room state to the entire room channel.
   */
  public static broadcastRoleAssignments(
    io: Server,
    room: Room,
    matchId?: string
  ): void {
    const now = Date.now();

    room.players.forEach((player) => {
      if (!player.role) return;

      const payload: RoleAssignedPayload = {
        matchId: matchId || `match_${now}`,
        roomCode: room.roomCode,
        playerId: player.playerId,
        callsign: player.callsign,
        role: player.role,
        assignedAt: now,
      };

      // Dispatched privately to each authenticated socket
      io.to(player.socketId).emit("role:assigned", payload);
    });

    // Also notify room of roster role update for HUD display
    io.to(room.roomCode).emit("room:roles-assigned", {
      roomCode: room.roomCode,
      matchId: matchId || `match_${now}`,
      assignments: room.players.map((p) => ({
        playerId: p.playerId,
        callsign: p.callsign,
        role: p.role || "RUNNER",
      })),
      room,
    });

    io.to(room.roomCode).emit("room:state-updated", { room });
  }
}
