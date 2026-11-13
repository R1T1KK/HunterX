"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { getSocket } from "@/services/socketService";
import {
  GameState,
  MatchClockPayload,
  GameCountdownPayload,
  GameStartedPayload,
  GameEndedPayload,
  Room,
} from "@/types";

export interface GameTimerState {
  gameState: GameState;
  phase: "HEAD_START" | "MATCH" | "ENDED";
  remainingSeconds: number;
  formattedTime: string;
  headStartEndsAt: number | null;
  matchEndsAt: number | null;
  winner: "RUNNERS" | "HUNTERS" | null;
  endReason: string | null;
  justUnlocked: boolean;
}

export function formatSecondsToDigital(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function useGameTimer(room?: Room | null, currentPlayerId?: string) {
  const [timerState, setTimerState] = useState<GameTimerState>(() => {
    const isStarting = room?.status === "COUNTDOWN" || room?.status === "STARTING";
    const isInProgress = room?.status === "IN_PROGRESS";
    return {
      gameState: isInProgress ? "IN_PROGRESS" : isStarting ? "COUNTDOWN" : "LOBBY",
      phase: isInProgress ? "MATCH" : isStarting ? "HEAD_START" : "HEAD_START",
      remainingSeconds: isStarting ? (room?.rules?.headStartSeconds || 30) : 0,
      formattedTime: formatSecondsToDigital(isStarting ? (room?.rules?.headStartSeconds || 30) : 0),
      headStartEndsAt: null,
      matchEndsAt: null,
      winner: null,
      endReason: null,
      justUnlocked: false,
    };
  });

  const stateRef = useRef(timerState);
  stateRef.current = timerState;

  // Local high-frequency tick interval to ensure smooth drift-free countdown
  useEffect(() => {
    if (timerState.gameState !== "COUNTDOWN" && timerState.gameState !== "IN_PROGRESS") {
      return;
    }

    const interval = setInterval(() => {
      const current = stateRef.current;
      const now = Date.now();

      if (current.gameState === "COUNTDOWN" && current.headStartEndsAt) {
        const remaining = Math.max(0, Math.ceil((current.headStartEndsAt - now) / 1000));
        setTimerState((prev) => ({
          ...prev,
          remainingSeconds: remaining,
          formattedTime: formatSecondsToDigital(remaining),
        }));
      } else if (current.gameState === "IN_PROGRESS" && current.matchEndsAt) {
        const remaining = Math.max(0, Math.ceil((current.matchEndsAt - now) / 1000));
        setTimerState((prev) => ({
          ...prev,
          remainingSeconds: remaining,
          formattedTime: formatSecondsToDigital(remaining),
        }));
      }
    }, 250);

    return () => clearInterval(interval);
  }, [timerState.gameState, timerState.headStartEndsAt, timerState.matchEndsAt]);

  // Subscribe to authoritative Server Socket.IO game events
  useEffect(() => {
    const socket = getSocket();
    const roomCode = room?.roomCode;

    if (!roomCode) return;

    // 1. Initial Countdown Started (30s Head-Start)
    const handleStartCountdown = (payload: GameCountdownPayload) => {
      console.log("⏱️ [GameTimer] COUNTDOWN started:", payload);
      setTimerState({
        gameState: "COUNTDOWN",
        phase: "HEAD_START",
        remainingSeconds: payload.remainingSeconds || payload.headStartDurationSeconds || 30,
        formattedTime: formatSecondsToDigital(payload.remainingSeconds || 30),
        headStartEndsAt: payload.headStartEndsAt,
        matchEndsAt: payload.startedAt + (payload.headStartDurationSeconds + 600) * 1000,
        winner: null,
        endReason: null,
        justUnlocked: false,
      });
    };

    // 2. Authoritative 1Hz Server Game Clock Tick
    const handleTimerTick = (payload: MatchClockPayload) => {
      setTimerState((prev) => {
        // If transitioning from COUNTDOWN to IN_PROGRESS on tick
        const wasCountdown = prev.gameState === "COUNTDOWN";
        const isNowInProgress = payload.gameState === "IN_PROGRESS";
        const justUnlocked = wasCountdown && isNowInProgress;

        return {
          ...prev,
          gameState: payload.gameState,
          phase: payload.phase,
          remainingSeconds: payload.remainingSeconds,
          formattedTime: formatSecondsToDigital(payload.remainingSeconds),
          headStartEndsAt: payload.headStartEndsAt ?? prev.headStartEndsAt,
          matchEndsAt: payload.matchEndsAt ?? prev.matchEndsAt,
          justUnlocked: justUnlocked ? true : prev.justUnlocked,
        };
      });
    };

    // 3. Match Starts (Hunter Map Unlocked!)
    const handleGameStarted = (payload: GameStartedPayload) => {
      console.log("🔓 [GameTimer] IN_PROGRESS match started! Map unlocked:", payload);
      // Haptic feedback for tactile feel
      if (typeof window !== "undefined" && "vibrate" in navigator) {
        try {
          navigator.vibrate([100, 50, 100]);
        } catch {}
      }

      setTimerState((prev) => ({
        ...prev,
        gameState: "IN_PROGRESS",
        phase: "MATCH",
        remainingSeconds: payload.remainingSeconds,
        formattedTime: formatSecondsToDigital(payload.remainingSeconds),
        matchEndsAt: payload.matchEndsAt,
        justUnlocked: true,
      }));

      // Clear unlock flash after 2.5 seconds
      setTimeout(() => {
        setTimerState((prev) => ({ ...prev, justUnlocked: false }));
      }, 2500);
    };

    // 4. Match Ended
    const handleGameEnded = (payload: GameEndedPayload) => {
      console.log("🏁 [GameTimer] Match COMPLETED:", payload);
      setTimerState((prev) => ({
        ...prev,
        gameState: "COMPLETED",
        phase: "ENDED",
        remainingSeconds: 0,
        formattedTime: "00:00",
        winner: payload.winner,
        endReason: payload.reason,
        justUnlocked: false,
      }));
    };

    // 5. Reconnect Sync
    const handleSynced = (data: { sync: MatchClockPayload | null; room: Room | null }) => {
      if (!data.sync) return;
      console.log("🔄 [GameTimer] Synced with server clock:", data.sync);
      setTimerState({
        gameState: data.sync.gameState,
        phase: data.sync.phase,
        remainingSeconds: data.sync.remainingSeconds,
        formattedTime: formatSecondsToDigital(data.sync.remainingSeconds),
        headStartEndsAt: data.sync.headStartEndsAt ?? null,
        matchEndsAt: data.sync.matchEndsAt ?? null,
        winner: null,
        endReason: null,
        justUnlocked: false,
      });
    };

    socket.on("game:start_countdown", handleStartCountdown);
    socket.on("game:timer_tick", handleTimerTick);
    socket.on("game:started", handleGameStarted);
    socket.on("game:ended", handleGameEnded);
    socket.on("game:synced", handleSynced);

    // Request authoritative sync snapshot upon mounting
    socket.emit("game:sync", { roomCode });

    return () => {
      socket.off("game:start_countdown", handleStartCountdown);
      socket.off("game:timer_tick", handleTimerTick);
      socket.off("game:started", handleGameStarted);
      socket.off("game:ended", handleGameEnded);
      socket.off("game:synced", handleSynced);
    };
  }, [room?.roomCode]);

  return timerState;
}
