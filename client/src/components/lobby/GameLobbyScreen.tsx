"use client";

import React, { useState } from "react";
import { ChevronLeft, Play, CheckCircle2, Circle, AlertTriangle, Loader2 } from "lucide-react";
import { Room, HouseRules, RoleSettings, RulesPreset, GPSStatus } from "@/types";
import { RoomCodeCard } from "./RoomCodeCard";
import { HouseRulesPresets } from "./HouseRulesPresets";
import { CustomRulesDrawer } from "./CustomRulesDrawer";
import { RoleSelector } from "./RoleSelector";
import { PlayerRoster } from "./PlayerRoster";
import { Button } from "@/components/ui/Button";

interface GameLobbyScreenProps {
  room: Room;
  currentPlayerId: string;
  onLeaveRoom: () => void;
  onRegenerateCode: () => Promise<void>;
  onUpdateRules: (rules: Partial<HouseRules>) => void;
  onUpdateRoleSettings: (settings: RoleSettings) => void;
  onToggleReady: (isReady: boolean) => void;
  onStartGame: () => Promise<void>;
  isRegenerating: boolean;
  isStarting: boolean;
  errorMessage: string | null;
  onClearError: () => void;
}

export function GameLobbyScreen({
  room,
  currentPlayerId,
  onLeaveRoom,
  onRegenerateCode,
  onUpdateRules,
  onUpdateRoleSettings,
  onToggleReady,
  onStartGame,
  isRegenerating,
  isStarting,
  errorMessage,
  onClearError,
}: GameLobbyScreenProps) {
  const isHost = room.hostPlayerId === currentPlayerId;
  const currentPlayer = room.players.find((p) => p.playerId === currentPlayerId);
  const isReady = currentPlayer?.isReady || false;

  // Count players with confirmed GPS locks
  const lockedGpsCount = room.players.filter((p) => p.gpsStatus === "LOCKED").length;
  const hasMinPlayers = room.players.length >= 2;
  const hasMinGpsLocks = lockedGpsCount >= 2;

  // Can start game only if Host, >= 2 players, and >= 2 GPS locks
  const canStartGame = isHost && hasMinPlayers && hasMinGpsLocks;

  const handleSelectPreset = (preset: RulesPreset) => {
    onUpdateRules({ preset });
  };

  const getStartButtonHint = () => {
    if (!isHost) {
      return "Waiting for Host to start match";
    }
    if (!hasMinPlayers) {
      return "Need at least 2 players to start";
    }
    if (lockedGpsCount < 2) {
      return `Waiting for GPS locks: ${lockedGpsCount}/2 confirmed`;
    }
    return "All systems ready for match launch!";
  };

  return (
    <div className="flex-1 flex flex-col justify-between safe-px safe-top pb-24 select-none animate-in fade-in duration-200">
      {/* Top Navigation Bar */}
      <header className="pt-2 pb-3 flex items-center justify-between border-b border-game-border/60">
        <button
          onClick={onLeaveRoom}
          className="flex items-center gap-1 text-xs font-bold text-game-crimson hover:underline cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Exit</span>
        </button>

        <h1 className="text-base font-black uppercase tracking-wider text-white">
          Game Lobby
        </h1>

        <div className="w-12 text-right">
          <span className="text-[10px] font-black text-game-amber px-2 py-0.5 rounded-full bg-game-amber/15 border border-game-amber/30">
            {room.status}
          </span>
        </div>
      </header>

      {/* Error Banner */}
      {errorMessage && (
        <div className="my-2 p-3 rounded-2xl bg-game-crimson/15 border border-game-crimson/40 flex items-center justify-between text-xs text-game-crimson">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="font-semibold">{errorMessage}</span>
          </div>
          <button onClick={onClearError} className="text-[10px] underline font-bold">
            Dismiss
          </button>
        </div>
      )}

      {/* Scrollable Lobby Content */}
      <div className="space-y-4 my-auto py-3 overflow-y-auto">
        {/* 1. Room Code Card */}
        <RoomCodeCard
          roomCode={room.roomCode}
          isHost={isHost}
          onRegenerateCode={onRegenerateCode}
          isRegenerating={isRegenerating}
        />

        {/* 2. House Rules Presets */}
        <HouseRulesPresets
          currentRules={room.rules}
          isHost={isHost}
          onSelectPreset={handleSelectPreset}
        />

        {/* 3. Custom Rules Drawer */}
        <CustomRulesDrawer
          rules={room.rules}
          isHost={isHost}
          onUpdateCustomRules={onUpdateRules}
        />

        {/* 4. Role Selection */}
        <RoleSelector
          roleSettings={room.roleSettings}
          playerCount={room.players.length}
          isHost={isHost}
          onUpdateRoleSettings={onUpdateRoleSettings}
        />

        {/* 5. Player Roster with Live GPS Status */}
        <PlayerRoster
          players={room.players}
          maxPlayers={room.maxPlayers}
          currentPlayerId={currentPlayerId}
        />

        {/* 6. Ready Toggle Button for current player */}
        <button
          onClick={() => onToggleReady(!isReady)}
          className={`w-full py-3 px-4 rounded-2xl border flex items-center justify-center gap-2 font-extrabold text-xs transition-all cursor-pointer ${
            isReady
              ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
              : "bg-game-charcoal border-game-border text-game-text-muted hover:text-white"
          }`}
        >
          {isReady ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>You are READY</span>
            </>
          ) : (
            <>
              <Circle className="w-4 h-4 text-neutral-500" />
              <span>Tap to mark READY</span>
            </>
          )}
        </button>
      </div>

      {/* Fixed Bottom Action: START GAME (Thumb-Zone Anchored) */}
      <div className="fixed bottom-0 left-0 right-0 z-30 p-3 bg-gradient-to-t from-game-black via-game-black/95 to-transparent safe-bottom">
        <div className="max-w-md mx-auto space-y-1.5">
          {/* Status Hint */}
          <p className="text-[11px] text-center font-bold text-game-text-muted">
            {getStartButtonHint()}
          </p>

          <Button
            variant="primary"
            size="lg"
            fullWidth
            disabled={!canStartGame || isStarting}
            onClick={onStartGame}
            className={`shadow-[0_4px_24px_rgba(255,59,48,0.4)] ${
              !canStartGame ? "opacity-40 cursor-not-allowed shadow-none" : "animate-pulse"
            }`}
          >
            {isStarting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Launching Match...</span>
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Play className="w-5 h-5 fill-current" />
                <span>START GAME</span>
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
