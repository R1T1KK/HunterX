"use client";

import React, { useState } from "react";
import { FullBleedMap } from "./FullBleedMap";
import { Room, GPSSignalQuality } from "@/types";
import { GPSQualityBadge } from "@/components/ui/GPSQualityBadge";
import { ArrowLeft, Shield, Users } from "lucide-react";

interface GameMapScreenProps {
  room?: Room | null;
  currentPlayerId?: string;
  onLeaveGame?: () => void;
  userCoordinates?: [number, number] | null;
  accuracy?: number | null;
  heading?: number | null;
  quality?: GPSSignalQuality;
  qualityLabel?: string;
}

export function GameMapScreen({
  room,
  currentPlayerId,
  onLeaveGame,
  userCoordinates,
  accuracy,
  heading,
  quality = "ACQUIRING",
  qualityLabel,
}: GameMapScreenProps) {
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const isHost = room?.hostPlayerId === currentPlayerId;
  const roomCode = room?.roomCode || "PREVIEW";
  const status = room?.status || "IN_PROGRESS";
  const playerCount = room?.players.length || 1;

  return (
    <div className="fixed inset-0 w-[100vw] h-[100dvh] overflow-hidden bg-game-black select-none">
      {/* 1. Layer 0: Full-Bleed Mapbox Canvas with Dynamic Accuracy Circle */}
      <FullBleedMap
        userCoordinates={userCoordinates}
        accuracy={accuracy}
        heading={heading}
      >
        {/* 2. Layer 1: Floating Tactical Top HUD */}
        <header className="fixed top-0 left-0 right-0 z-20 safe-top safe-px pt-2 pb-1 pointer-events-none space-y-1.5">
          <div className="max-w-md mx-auto flex items-center justify-between pointer-events-auto">
            {/* Exit Match Action */}
            <button
              onClick={() => setShowExitConfirm(true)}
              title="Leave Match"
              className="px-3 min-h-[44px] rounded-2xl bg-game-charcoal/90 border border-game-border hover:border-game-crimson text-game-text-muted hover:text-white flex items-center gap-1.5 text-xs font-black shadow-lg backdrop-blur-md active:scale-95 transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Exit</span>
            </button>

            {/* Room Code & Status Pill */}
            <div className="px-3.5 py-1.5 rounded-2xl bg-game-charcoal/90 border border-game-border/80 flex items-center gap-2 shadow-lg backdrop-blur-md">
              <span className="text-xs font-black tracking-widest text-white font-gaming">
                {roomCode}
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-black text-game-amber uppercase">
                {status}
              </span>
            </div>

            {/* Player Count Badge */}
            <div className="px-3 min-h-[44px] rounded-2xl bg-game-charcoal/90 border border-game-border flex items-center gap-1.5 text-xs font-black text-white shadow-lg backdrop-blur-md">
              <Users className="w-3.5 h-3.5 text-game-crimson" />
              <span>{playerCount}</span>
            </div>
          </div>

          {/* Tactical GPS Signal Quality Badge (Center Floating) */}
          <div className="max-w-md mx-auto flex justify-center pointer-events-auto">
            <GPSQualityBadge
              quality={quality}
              accuracy={accuracy}
              qualityLabel={qualityLabel}
            />
          </div>
        </header>

        {/* 3. Exit Confirmation Modal */}
        {showExitConfirm && (
          <aside aria-label="Exit match confirmation" className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-xs p-5 rounded-3xl bg-game-charcoal border border-game-border space-y-4 shadow-2xl text-center animate-in zoom-in-95 duration-150">
              <div className="w-12 h-12 rounded-2xl bg-game-crimson/15 border border-game-crimson/40 flex items-center justify-center mx-auto text-game-crimson">
                <Shield className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  Abandon Operation?
                </h3>
                <p className="text-xs text-game-text-muted">
                  Are you sure you want to leave the active match?
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowExitConfirm(false)}
                  className="py-2.5 min-h-[44px] rounded-xl bg-neutral-800 text-white font-bold text-xs hover:bg-neutral-700 transition-colors cursor-pointer flex items-center justify-center"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowExitConfirm(false);
                    onLeaveGame?.();
                  }}
                  className="py-2.5 min-h-[44px] rounded-xl bg-game-crimson text-white font-black text-xs hover:bg-game-crimson-secondary shadow-lg shadow-game-crimson/30 transition-all cursor-pointer flex items-center justify-center"
                >
                  Confirm Exit
                </button>
              </div>
            </div>
          </aside>
        )}
      </FullBleedMap>
    </div>
  );
}

