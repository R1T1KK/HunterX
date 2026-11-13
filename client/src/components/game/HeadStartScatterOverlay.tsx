"use client";

import React from "react";
import { PlayerRole, GameState } from "@/types";
import { Lock, ShieldAlert, Sparkles, Compass, Footprints, AlertTriangle } from "lucide-react";

interface HeadStartScatterOverlayProps {
  role: PlayerRole;
  gameState: GameState;
  remainingSeconds: number;
  formattedTime: string;
  headStartTotalSeconds?: number;
  justUnlocked?: boolean;
}

export function HeadStartScatterOverlay({
  role,
  gameState,
  remainingSeconds,
  formattedTime,
  headStartTotalSeconds = 30,
  justUnlocked = false,
}: HeadStartScatterOverlayProps) {
  const isCountdown = gameState === "COUNTDOWN";
  const isHunter = role === "HUNTER";
  const isRunner = role === "RUNNER";

  // Progress percentage (100% -> 0%)
  const progressPercent = Math.max(
    0,
    Math.min(100, (remainingSeconds / (headStartTotalSeconds || 30)) * 100)
  );

  // 1. UNLOCKED CELEBRATION FLASH (When timer hits 00:00 and transitions to IN_PROGRESS)
  if (justUnlocked) {
    return (
      <aside aria-label="Game state unlock banner" className="fixed top-16 left-0 right-0 z-40 px-4 pointer-events-none animate-in fade-in slide-in-from-top-4 duration-300">
        <div
          className={`max-w-xs mx-auto p-3.5 rounded-2xl border text-center shadow-2xl backdrop-blur-md ${
            isHunter
              ? "bg-game-crimson/90 border-game-crimson text-white shadow-game-crimson/50"
              : "bg-emerald-600/90 border-emerald-400 text-white shadow-emerald-500/50"
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Sparkles className="w-5 h-5 animate-spin" />
            <span className="text-xs font-black tracking-widest uppercase font-gaming">
              {isHunter ? "MAP UNLOCKED — HUNT ACTIVE!" : "HEAD START OVER — HUNTERS RELEASED!"}
            </span>
          </div>
        </div>
      </aside>
    );
  }

  // If not in countdown state, render nothing
  if (!isCountdown) {
    return null;
  }

  // 2. HUNTER EXPERIENCE: Fully Locked Dark Frosted Tactical Map Overlay
  if (isHunter) {
    return (
      <aside aria-label="Hunter head start locked overlay" className="fixed inset-0 z-40 bg-[#07090E]/92 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center select-none pointer-events-auto animate-in fade-in duration-200">
        <div className="w-full max-w-sm space-y-6">
          {/* Pulsing Tactical Radar Lock Icon */}
          <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-2 border-game-crimson/40 animate-ping" />
            <div className="absolute -inset-2 rounded-full border border-game-crimson/20 animate-pulse" />
            <div className="w-20 h-20 rounded-full bg-game-crimson/15 border-2 border-game-crimson flex items-center justify-center text-game-crimson shadow-[0_0_30px_rgba(255,59,48,0.35)]">
              <Lock className="w-9 h-9" />
            </div>
          </div>

          {/* Locked Headlines */}
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-game-crimson/20 border border-game-crimson/40 text-game-crimson text-[10px] font-black uppercase tracking-widest">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>HUNTERS LOCKED</span>
            </div>
            <h2 className="text-xl font-black text-white uppercase tracking-wider font-gaming">
              HEAD START IN PROGRESS
            </h2>
            <p className="text-xs text-game-text-muted">
              Hunters will be released in:
            </p>
          </div>

          {/* Large Digital Countdown Clock */}
          <div className="py-3 px-6 rounded-3xl bg-game-charcoal/90 border border-game-border shadow-2xl">
            <div className="text-5xl font-black text-game-crimson font-mono tracking-widest tabular-nums animate-pulse">
              {formattedTime}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="w-full h-1.5 rounded-full bg-game-surface overflow-hidden border border-game-border/60">
              <div
                className="h-full bg-game-crimson transition-all duration-300 ease-linear"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] font-bold text-game-text-muted uppercase tracking-wider">
              <span>Scatter Phase</span>
              <span>{remainingSeconds}s remaining</span>
            </div>
          </div>

          {/* Military Tactical Encrypted Feed Notice */}
          <div className="p-3 rounded-2xl bg-game-surface/80 border border-game-border/60 text-[11px] text-game-text-muted space-y-1">
            <p className="text-white font-bold flex items-center justify-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-game-crimson animate-ping" />
              SATELLITE RADAR ENCRYPTED
            </p>
            <p className="text-[10px] text-game-text-muted">
              Runner coordinates are restricted on the server. Map feed will unlock automatically at 00:00.
            </p>
          </div>
        </div>
      </aside>
    );
  }

  // 3. RUNNER EXPERIENCE: Floating Pulsing Green "SCATTER!" Card (Map stays fully active & navigable)
  return (
    <aside aria-label="Runner scatter countdown banner" className="fixed top-14 left-0 right-0 z-30 px-4 pointer-events-none animate-in slide-in-from-top-3 duration-200">
      <div className="max-w-sm mx-auto p-4 rounded-3xl bg-game-black/90 border-2 border-emerald-500/70 shadow-[0_0_35px_rgba(16,185,129,0.35)] backdrop-blur-md pointer-events-auto space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400">
              <Footprints className="w-4 h-4 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-emerald-400 uppercase tracking-widest font-gaming animate-pulse">
                  SCATTER!
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              </div>
              <p className="text-[10px] text-game-text-muted">
                Find concealment now!
              </p>
            </div>
          </div>

          {/* Digital Countdown Timer */}
          <div className="px-3 py-1 rounded-2xl bg-emerald-950/70 border border-emerald-500/60 shadow-inner">
            <span className="text-2xl font-black text-emerald-300 font-mono tracking-widest tabular-nums">
              {formattedTime}
            </span>
          </div>
        </div>

        {/* Dynamic Progress Bar */}
        <div className="w-full h-1.5 rounded-full bg-neutral-900 overflow-hidden border border-emerald-900/60">
          <div
            className="h-full bg-emerald-500 transition-all duration-300 ease-linear shadow-[0_0_10px_#10B981]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <p className="text-[10px] text-center text-emerald-400/80 font-medium">
          Hunters are frozen with zero map access. Run and hide!
        </p>
      </div>
    </aside>
  );
}
