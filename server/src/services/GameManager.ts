import { Server, Socket } from "socket.io";
import { roomManager } from "./RoomManager.js";
import {
  GameState,
  MatchClockPayload,
  GameCountdownPayload,
  GameStartedPayload,
  GameEndedPayload,
  Room,
} from "../types/index.js";

export interface MatchSession {
  matchId: string;
  roomCode: string;
  gameState: GameState;
  startedAt: number;
  headStartEndsAt: number;
  matchEndsAt: number;
  headStartDurationSeconds: number;
  roundDurationSeconds: number;
  timerInterval?: NodeJS.Timeout;
}

export class GameManager {
  private activeMatches: Map<string, MatchSession> = new Map();

  /**
   * Retrieves an active match session by room code.
   */
  public getMatch(roomCode: string): MatchSession | undefined {
    return this.activeMatches.get(roomCode.toUpperCase().trim());
  }

  /**
   * Generates a sync snapshot for a reconnecting or joining socket.
   */
  public getSyncPayload(roomCode: string): MatchClockPayload | null {
    const session = this.getMatch(roomCode);
    if (!session) return null;

    const now = Date.now();
    let phase: "HEAD_START" | "MATCH" | "ENDED" = "MATCH";
    let remainingSeconds = 0;

    if (session.gameState === "COUNTDOWN") {
      phase = "HEAD_START";
      remainingSeconds = Math.max(0, Math.ceil((session.headStartEndsAt - now) / 1000));
    } else if (session.gameState === "IN_PROGRESS") {
      phase = "MATCH";
      remainingSeconds = Math.max(0, Math.ceil((session.matchEndsAt - now) / 1000));
    } else {
      phase = "ENDED";
      remainingSeconds = 0;
    }

    return {
      matchId: session.matchId,
      gameState: session.gameState,
      phase,
      remainingSeconds,
      headStartEndsAt: session.headStartEndsAt,
      matchEndsAt: session.matchEndsAt,
      serverTimestamp: now,
    };
  }

  /**
   * Starts the Authoritative Match Lifecycle:
   * 1. Validates preconditions (host authority, min 2 GPS locks).
   * 2. Assigns Hunter / Runner roles server-side.
   * 3. Transitions state: LOBBY -> COUNTDOWN.
   * 4. Commences 30s Head-Start Scatter Phase.
   * 5. Runs 1Hz server game clock loop.
   */
  public startMatch(
    io: Server,
    roomCode: string,
    requesterPlayerId: string
  ): { session: MatchSession; room: Room } {
    const formattedCode = roomCode.toUpperCase().trim();

    // 1. Room validation and role assignment via RoomManager
    const updatedRoom = roomManager.startGame(formattedCode, requesterPlayerId);

    // 2. Prevent duplicate timers for the same room
    this.stopMatch(formattedCode);

    const now = Date.now();
    const headStartDuration = updatedRoom.rules.headStartSeconds || 30;
    const roundDuration = (updatedRoom.rules.roundLengthMinutes || 10) * 60;
    const headStartEndsAt = now + headStartDuration * 1000;
    const matchEndsAt = headStartEndsAt + roundDuration * 1000;
    const matchId = `match_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const session: MatchSession = {
      matchId,
      roomCode: formattedCode,
      gameState: "COUNTDOWN",
      startedAt: now,
      headStartEndsAt,
      matchEndsAt,
      headStartDurationSeconds: headStartDuration,
      roundDurationSeconds: roundDuration,
    };

    // 3. Emit initial Countdown Start event
    const countdownPayload: GameCountdownPayload = {
      matchId,
      gameState: "COUNTDOWN",
      startedAt: now,
      headStartEndsAt,
      headStartDurationSeconds: headStartDuration,
      remainingSeconds: headStartDuration,
      serverTimestamp: now,
      room: updatedRoom,
    };

    io.to(formattedCode).emit("game:start_countdown", countdownPayload);
    // Legacy event for Day 2/3 compatibility
    io.to(formattedCode).emit("room:game-started", { room: updatedRoom });
    io.to(formattedCode).emit("room:state-updated", { room: updatedRoom });

    console.log(
      `⏱️ [GameManager] Match ${matchId} COUNTDOWN started for room ${formattedCode} (${headStartDuration}s Head-Start)`
    );

    // 4. Start Authoritative 1Hz Game Loop
    session.timerInterval = setInterval(() => {
      this.handleClockTick(io, formattedCode);
    }, 1000);

    this.activeMatches.set(formattedCode, session);

    return { session, room: updatedRoom };
  }

  /**
   * Internal authoritative clock tick evaluated at 1Hz on the server.
   */
  private handleClockTick(io: Server, roomCode: string): void {
    const session = this.activeMatches.get(roomCode);
    if (!session) return;

    const now = Date.now();

    // PHASE 1: COUNTDOWN (30s Head-Start Scatter)
    if (session.gameState === "COUNTDOWN") {
      const remainingSeconds = Math.max(0, Math.ceil((session.headStartEndsAt - now) / 1000));

      const tickPayload: MatchClockPayload = {
        matchId: session.matchId,
        gameState: "COUNTDOWN",
        phase: "HEAD_START",
        remainingSeconds,
        headStartEndsAt: session.headStartEndsAt,
        matchEndsAt: session.matchEndsAt,
        serverTimestamp: now,
      };

      io.to(roomCode).emit("game:timer_tick", tickPayload);

      if (remainingSeconds <= 0) {
        // COUNTDOWN FINISHED -> TRANSITION TO IN_PROGRESS
        this.transitionToInProgress(io, roomCode, session);
      }
      return;
    }

    // PHASE 2: IN_PROGRESS (Main Hide & Seek Match)
    if (session.gameState === "IN_PROGRESS") {
      const remainingSeconds = Math.max(0, Math.ceil((session.matchEndsAt - now) / 1000));

      const tickPayload: MatchClockPayload = {
        matchId: session.matchId,
        gameState: "IN_PROGRESS",
        phase: "MATCH",
        remainingSeconds,
        headStartEndsAt: session.headStartEndsAt,
        matchEndsAt: session.matchEndsAt,
        serverTimestamp: now,
      };

      io.to(roomCode).emit("game:timer_tick", tickPayload);

      if (remainingSeconds <= 0) {
        // MATCH TIME EXPIRED -> RUNNERS WIN BY SURVIVAL
        this.endMatch(io, roomCode, "TIME_EXPIRED", "RUNNERS");
      }
    }
  }

  /**
   * Server-authoritative transition from COUNTDOWN to IN_PROGRESS.
   * Unlocks hunter map and starts main game loop.
   */
  private transitionToInProgress(io: Server, roomCode: string, session: MatchSession): void {
    const room = roomManager.findRoom(roomCode);
    if (!room) return;

    session.gameState = "IN_PROGRESS";
    room.status = "IN_PROGRESS";
    room.updatedAt = new Date().toISOString();

    const now = Date.now();
    const remainingMatchSeconds = Math.max(0, Math.ceil((session.matchEndsAt - now) / 1000));

    const startedPayload: GameStartedPayload = {
      matchId: session.matchId,
      gameState: "IN_PROGRESS",
      startedAt: now,
      matchEndsAt: session.matchEndsAt,
      roundDurationSeconds: session.roundDurationSeconds,
      remainingSeconds: remainingMatchSeconds,
      serverTimestamp: now,
      room,
    };

    console.log(`🔓 [GameManager] Head-start finished! Room ${roomCode} IN_PROGRESS. Hunter map unlocked!`);

    io.to(roomCode).emit("game:started", startedPayload);
    io.to(roomCode).emit("room:state-updated", { room });
  }

  /**
   * Terminates a match and transitions to COMPLETED.
   */
  public endMatch(
    io: Server,
    roomCode: string,
    reason: string = "MATCH_ENDED",
    winner: "RUNNERS" | "HUNTERS" = "RUNNERS"
  ): GameEndedPayload | null {
    const formattedCode = roomCode.toUpperCase().trim();
    const session = this.activeMatches.get(formattedCode);
    const room = roomManager.findRoom(formattedCode);

    if (session?.timerInterval) {
      clearInterval(session.timerInterval);
      session.timerInterval = undefined;
    }

    if (session) {
      session.gameState = "COMPLETED";
    }

    if (room) {
      room.status = "COMPLETED";
      room.updatedAt = new Date().toISOString();
    }

    const endedPayload: GameEndedPayload = {
      matchId: session?.matchId || `match_${Date.now()}`,
      gameState: "COMPLETED",
      winner,
      reason,
      serverTimestamp: Date.now(),
      room: room!,
    };

    console.log(`🏁 [GameManager] Room ${formattedCode} COMPLETED. Winner: ${winner} (${reason})`);

    io.to(formattedCode).emit("game:ended", endedPayload);
    if (room) {
      io.to(formattedCode).emit("room:state-updated", { room });
    }

    this.activeMatches.delete(formattedCode);
    return endedPayload;
  }

  /**
   * Cleans up timers without broadcasting if room is abandoned.
   */
  public stopMatch(roomCode: string): void {
    const formattedCode = roomCode.toUpperCase().trim();
    const session = this.activeMatches.get(formattedCode);
    if (session?.timerInterval) {
      clearInterval(session.timerInterval);
    }
    this.activeMatches.delete(formattedCode);
  }

  /**
   * Cleans up all active intervals on server shutdown.
   */
  public resetAll(): void {
    for (const session of this.activeMatches.values()) {
      if (session.timerInterval) {
        clearInterval(session.timerInterval);
      }
    }
    this.activeMatches.clear();
  }
}

export const gameManager = new GameManager();
