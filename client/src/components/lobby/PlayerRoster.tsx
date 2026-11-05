"use client";

import React from "react";
import { Users, Crown, CheckCircle2, Circle } from "lucide-react";
import { Player, GPSStatus } from "@/types";

interface PlayerRosterProps {
  players: Player[];
  maxPlayers: number;
  currentPlayerId: string;
}

export function PlayerRoster({ players, maxPlayers, currentPlayerId }: PlayerRosterProps) {
  const getGpsBadge = (status: GPSStatus) => {
    switch (status) {
      case "LOCKED":
        return (
          <span className="flex items-center gap-1 text-[10px] font-extrabold text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>GPS LOCKED</span>
          </span>
        );
      case "ACQUIRING":
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold text-game-amber">
            <span className="w-2 h-2 rounded-full bg-game-amber animate-pulse" />
            <span>ACQUIRING</span>
          </span>
        );
      case "DENIED":
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold text-game-crimson">
            <span className="w-2 h-2 rounded-full bg-game-crimson" />
            <span>DENIED</span>
          </span>
        );
      case "UNAVAILABLE":
      default:
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold text-neutral-500">
            <span className="w-2 h-2 rounded-full bg-neutral-600" />
            <span>NO GPS</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-game-crimson" />
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-white">
            Players
          </h3>
        </div>
        <span className="text-xs font-bold text-game-text-muted">
          <span className="text-white font-extrabold">{players.length}</span> / {maxPlayers}
        </span>
      </div>

      <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-0.5">
        {players.map((player) => {
          const isCurrent = player.playerId === currentPlayerId;
          const initial = player.callsign.charAt(0).toUpperCase() || "?";

          return (
            <div
              key={player.playerId}
              className={`flex items-center justify-between p-2.5 rounded-2xl border transition-all ${
                isCurrent
                  ? "bg-game-charcoal/90 border-game-crimson/40"
                  : "bg-game-charcoal/50 border-game-border"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center font-extrabold text-xs text-white shrink-0">
                  {initial}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-bold text-white truncate max-w-[120px]">
                      {player.callsign}
                    </p>
                    {isCurrent && (
                      <span className="text-[10px] text-game-crimson font-extrabold shrink-0">
                        (You)
                      </span>
                    )}
                    {player.isHost && (
                      <Crown className="w-3 h-3 text-game-amber shrink-0" />
                    )}
                  </div>
                  <div>{getGpsBadge(player.gpsStatus)}</div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {player.isReady ? (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-[10px] font-extrabold text-emerald-400">
                    <CheckCircle2 className="w-3 h-3" />
                    Ready
                  </span>
                ) : (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-neutral-800 border border-neutral-700 text-[10px] font-semibold text-neutral-400">
                    <Circle className="w-2.5 h-2.5" />
                    Waiting
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
