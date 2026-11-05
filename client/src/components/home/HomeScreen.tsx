"use client";

import React, { useState } from "react";
import { Radio, Edit3, ArrowRight, Loader2, AlertCircle, Compass, Users, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

interface HomeScreenProps {
  callsign: string;
  onUpdateCallsign: (newCallsign: string) => boolean;
  onHostGame: () => Promise<void>;
  onJoinGame: (code: string) => Promise<void>;
  isHostLoading: boolean;
  isJoinLoading: boolean;
  errorMessage: string | null;
  onClearError: () => void;
}

export function HomeScreen({
  callsign,
  onUpdateCallsign,
  onHostGame,
  onJoinGame,
  isHostLoading,
  isJoinLoading,
  errorMessage,
  onClearError,
}: HomeScreenProps) {
  const [joinCode, setJoinCode] = useState("");
  const [isEditingCallsign, setIsEditingCallsign] = useState(false);
  const [tempCallsign, setTempCallsign] = useState(callsign);
  const [callsignError, setCallsignError] = useState<string | null>(null);

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onClearError();
    const formatted = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
    setJoinCode(formatted);
  };

  const handleSaveCallsign = () => {
    setCallsignError(null);
    const success = onUpdateCallsign(tempCallsign);
    if (success) {
      setIsEditingCallsign(false);
    } else {
      setCallsignError("Must be 3-16 chars (letters, numbers, _, -)");
    }
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (joinCode.length !== 6 || isJoinLoading) return;
    await onJoinGame(joinCode);
  };

  const avatarInitial = callsign.charAt(0).toUpperCase() || "R";

  return (
    <div className="flex-1 flex flex-col justify-between safe-px safe-top pb-24 select-none">
      {/* Top Header & Callsign Profile Badge */}
      <header className="pt-2 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-game-crimson to-game-crimson-secondary flex items-center justify-center shadow-[0_4px_16px_rgba(255,59,48,0.4)]">
            <Radio className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tighter text-white font-gaming leading-none">
              HIDE<span className="text-game-crimson">RUSH</span>
            </h1>
            <p className="text-[10px] font-bold uppercase tracking-widest text-game-text-muted">
              GPS Tactical Tag
            </p>
          </div>
        </div>

        {/* Player Profile Quick Badge */}
        <button
          onClick={() => {
            setTempCallsign(callsign);
            setIsEditingCallsign(true);
          }}
          className="flex items-center gap-2 bg-game-card/90 border border-game-border hover:border-game-crimson/50 rounded-2xl px-3 py-1.5 transition-all cursor-pointer"
          aria-label="Edit Profile"
        >
          <div className="w-6 h-6 rounded-lg bg-game-crimson/20 border border-game-crimson/40 flex items-center justify-center text-xs font-black text-game-crimson">
            {avatarInitial}
          </div>
          <span className="text-xs font-bold text-white max-w-[90px] truncate">{callsign}</span>
          <Edit3 className="w-3 h-3 text-game-text-muted" />
        </button>
      </header>

      {/* Callsign Edit Modal / Banner */}
      {isEditingCallsign && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-sm p-6 space-y-4">
            <h3 className="text-base font-extrabold text-white">Change Tactical Callsign</h3>
            <p className="text-xs text-game-text-muted">
              Your callsign will be visible to all Hunters and Runners in your match.
            </p>

            <div className="space-y-1">
              <input
                type="text"
                value={tempCallsign}
                onChange={(e) => setTempCallsign(e.target.value)}
                maxLength={16}
                placeholder="Enter callsign..."
                className="w-full h-12 bg-game-charcoal border border-game-border rounded-xl px-4 text-sm font-bold text-white focus:outline-none focus:border-game-crimson"
                autoFocus
              />
              {callsignError && (
                <p className="text-[11px] text-game-crimson font-medium">{callsignError}</p>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="secondary"
                size="default"
                fullWidth
                onClick={() => setIsEditingCallsign(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="default"
                fullWidth
                onClick={handleSaveCallsign}
              >
                Save Callsign
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Error Alert Banner */}
      {errorMessage && (
        <div className="bg-game-crimson/15 border border-game-crimson/40 rounded-2xl p-3 my-2 flex items-center justify-between gap-2 text-xs text-game-crimson">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="font-semibold">{errorMessage}</span>
          </div>
          <button
            onClick={onClearError}
            className="text-[10px] font-bold underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Hero Section (SCRAM-Inspired High-Impact Hero) */}
      <section className="space-y-4 my-auto py-2">
        <div className="space-y-1">
          <p className="text-xs font-black uppercase tracking-widest text-game-crimson">
            Real-World GPS Gaming
          </p>
          <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-white leading-[1.05]">
            Hi, <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-neutral-400">
              {callsign}.
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-game-text-muted font-medium pt-1">
            Host a real-world match or grab a 6-character room code from a friend.
          </p>
        </div>

        {/* Primary Action 1: Host a Game */}
        <div className="space-y-3 pt-2">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            disabled={isHostLoading || isJoinLoading}
            onClick={onHostGame}
            className="text-base tracking-wide flex items-center justify-center gap-2 shadow-[0_6px_28px_rgba(255,59,48,0.45)]"
          >
            {isHostLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Creating Room...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>Host a Game</span>
              </>
            )}
          </Button>

          {/* Primary Action 2: Join with a Code */}
          <Card variant="default" className="p-4 space-y-3 border-game-border/80">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-game-text-muted">
                Join with a Code
              </span>
              <span className="text-[10px] font-bold text-neutral-500">6 CHARACTERS</span>
            </div>

            <form onSubmit={handleJoinSubmit} className="flex gap-2">
              <input
                type="text"
                value={joinCode}
                onChange={handleCodeChange}
                maxLength={6}
                placeholder="TACO42"
                className="flex-1 h-12 bg-game-charcoal border border-game-border rounded-xl px-4 text-center font-gaming text-lg tracking-widest text-white uppercase placeholder:text-neutral-600 focus:outline-none focus:border-game-crimson"
              />
              <Button
                type="submit"
                variant="secondary"
                size="default"
                disabled={joinCode.length !== 6 || isJoinLoading || isHostLoading}
                className="h-12 px-4 shrink-0 font-bold border-game-border"
              >
                {isJoinLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <span className="flex items-center gap-1">
                    Join <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </Button>
            </form>
          </Card>
        </div>

        {/* Quick Presets Info Card */}
        <Card variant="solid" className="p-4 space-y-2 border-neutral-800">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-game-amber" />
              <span className="font-extrabold text-white">House Rules Presets</span>
            </div>
            <Badge variant="neutral" className="text-[10px]">
              Presets
            </Badge>
          </div>

          <p className="text-[11px] text-game-text-muted leading-relaxed">
            Host matches with <span className="text-white font-semibold">Quick (5m)</span>,{" "}
            <span className="text-white font-semibold">Standard (10m)</span>, or{" "}
            <span className="text-white font-semibold">Big Park (20m with zone shrink)</span> rules.
          </p>

          <div className="flex items-center gap-2 pt-1 text-[11px] text-neutral-400">
            <Users className="w-3.5 h-3.5 text-game-crimson" />
            <span>Up to 15 players per private room</span>
          </div>
        </Card>
      </section>
    </div>
  );
}

