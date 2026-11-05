"use client";

import React from "react";
import { RoleSettings } from "@/types";

interface RoleSelectorProps {
  roleSettings: RoleSettings;
  playerCount: number;
  isHost: boolean;
  onUpdateRoleSettings: (settings: RoleSettings) => void;
}

export function RoleSelector({
  roleSettings,
  playerCount,
  isHost,
  onUpdateRoleSettings,
}: RoleSelectorProps) {
  const modes: Array<{ id: "HUNTER" | "RUNNER" | "RANDOM"; label: string }> = [
    { id: "HUNTER", label: "Hunter" },
    { id: "RUNNER", label: "Runner" },
    { id: "RANDOM", label: "Random" },
  ];

  const handleModeChange = (mode: "HUNTER" | "RUNNER" | "RANDOM") => {
    if (!isHost) return;
    onUpdateRoleSettings({
      ...roleSettings,
      mode,
    });
  };

  const handleHunterCountChange = (count: number) => {
    if (!isHost) return;
    onUpdateRoleSettings({
      ...roleSettings,
      hunterCount: count,
    });
  };

  return (
    <div className="space-y-3">
      {/* 3-Segment Role Preference Control (SCRAM Style) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-extrabold uppercase tracking-wider text-white">
            Role selection
          </span>
          <span className="text-[10px] text-game-text-muted">
            {isHost ? "Host Config" : "Set by Host"}
          </span>
        </div>

        <div className="bg-game-charcoal p-1.5 rounded-2xl border border-game-border flex items-center gap-1.5">
          {modes.map((m) => {
            const isSelected = roleSettings.mode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => handleModeChange(m.id)}
                disabled={!isHost}
                className={`flex-1 py-2.5 min-h-[44px] text-xs font-extrabold rounded-xl transition-all cursor-pointer disabled:cursor-default flex items-center justify-center ${
                  isSelected
                    ? "bg-game-crimson text-white shadow-[0_2px_12px_rgba(255,59,48,0.35)]"
                    : "text-game-text-muted hover:text-white"
                }`}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Hunter Count Selector */}
      <div className="flex items-center justify-between p-3 rounded-2xl bg-game-card/80 border border-game-border">
        <div>
          <p className="text-xs font-bold text-white">Hunter headcount</p>
          <p className="text-[10px] text-game-text-muted">
            With {playerCount} player{playerCount === 1 ? "" : "s"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {[1, 2, 3].map((count) => {
            const isSelected = roleSettings.hunterCount === count;
            return (
              <button
                key={count}
                onClick={() => handleHunterCountChange(count)}
                disabled={!isHost}
                className={`w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl text-xs font-extrabold transition-all cursor-pointer disabled:cursor-default flex items-center justify-center ${
                  isSelected
                    ? "bg-game-crimson text-white ring-2 ring-game-crimson/50"
                    : "bg-neutral-800 text-neutral-400 hover:text-white"
                }`}
              >
                {count}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
