"use client";

import React, { useState } from "react";
import { Copy, Check, Users, LogOut, Crown, Radio, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Room } from "@/types";

interface WaitingRoomProps {
  room: Room;
  currentPlayerId: string;
  onLeaveRoom: () => void;
}

export function WaitingRoom({ room, currentPlayerId, onLeaveRoom }: WaitingRoomProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(room.roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isHost = room.hostPlayerId === currentPlayerId;

  return (
    <div className="flex-1 flex flex-col justify-between safe-px safe-top pb-10 select-none animate-in fade-in duration-200">
      {/* Header */}
      <header className="pt-2 pb-3 flex items-center justify-between border-b border-game-border/60">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-game-crimson flex items-center justify-center shadow-[0_2px_10px_rgba(255,59,48,0.4)]">
            <Radio className="w-4 h-4 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tighter text-white font-gaming leading-none">
              HIDE<span className="text-game-crimson">RUSH</span>
            </h1>
            <p className="text-[10px] font-bold uppercase tracking-widest text-game-text-muted">
              Lobby Standby
            </p>
          </div>
        </div>

        <Badge variant={room.status === "WAITING" ? "live" : "amber"}>
          {room.status}
        </Badge>
      </header>

      {/* Main Content */}
      <div className="space-y-4 my-auto py-3">
        {/* Room Code Card (SCRAM-Style Tactical Card) */}
        <Card variant="glow" className="text-center p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-widest text-game-text-muted">
              Room Code
            </span>
            <span className="text-xs font-bold text-game-crimson">
              {isHost ? "You are Host" : "Joined"}
            </span>
          </div>

          <div className="py-1">
            <h2 className="text-5xl font-black tracking-widest text-white font-gaming">
              {room.roomCode}
            </h2>
          </div>

          <Button
            variant="secondary"
            size="default"
            fullWidth
            onClick={handleCopyCode}
            className="flex items-center justify-center gap-2 text-xs"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400">Copied to Clipboard!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-game-text-muted" />
                <span>Copy Room Code</span>
              </>
            )}
          </Button>
        </Card>

        {/* Player Roster Card */}
        <Card variant="default" className="p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-game-border/60">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-game-crimson" />
              <span className="text-xs font-extrabold uppercase tracking-wider text-white">
                Connected Players
              </span>
            </div>
            <span className="text-xs font-bold text-game-text-muted">
              <span className="text-white font-extrabold">{room.players.length}</span> / {room.maxPlayers}
            </span>
          </div>

          {/* Player List */}
          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
            {room.players.map((player) => {
              const isCurrent = player.playerId === currentPlayerId;
              const initial = player.callsign.charAt(0).toUpperCase();

              return (
                <div
                  key={player.playerId}
                  className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                    isCurrent
                      ? "bg-game-charcoal/90 border-game-crimson/40"
                      : "bg-game-charcoal/50 border-game-border/60"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center font-extrabold text-sm text-white">
                      {initial}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white flex items-center gap-1.5">
                        <span>{player.callsign}</span>
                        {isCurrent && (
                          <span className="text-[10px] text-game-crimson font-extrabold">(You)</span>
                        )}
                      </p>
                      <p className="text-[10px] text-game-text-muted">
                        Joined {new Date(player.joinedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {player.isHost ? (
                      <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-game-amber/20 border border-game-amber/40 text-[10px] font-extrabold text-game-amber">
                        <Crown className="w-3 h-3" />
                        Host
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-neutral-800 text-[10px] font-semibold text-neutral-400">
                        Player
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Minimal Waiting Hint */}
          <div className="pt-2 text-center text-xs text-game-text-muted flex items-center justify-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-game-amber animate-pulse" />
            <span>
              {isHost
                ? "Share code with friends to join match"
                : "Waiting for host to prepare match"}
            </span>
          </div>
        </Card>
      </div>

      {/* Footer / Leave Button */}
      <footer className="pt-2">
        <Button
          variant="secondary"
          size="default"
          fullWidth
          onClick={onLeaveRoom}
          className="flex items-center justify-center gap-2 text-xs border-neutral-800 text-game-text-muted hover:text-white"
        >
          <LogOut className="w-4 h-4" />
          <span>Leave Room</span>
        </Button>
      </footer>
    </div>
  );
}

