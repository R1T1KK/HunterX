"use client";

import React, { useState } from "react";
import { User, Copy, Check, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface ProfileViewProps {
  playerId: string;
  callsign: string;
  onUpdateCallsign: (newCallsign: string) => boolean;
}

export function ProfileView({ playerId, callsign, onUpdateCallsign }: ProfileViewProps) {
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState(callsign);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(playerId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSave = () => {
    setError(null);
    const success = onUpdateCallsign(nameInput);
    if (success) {
      setEditing(false);
    } else {
      setError("Must be 3-16 chars (letters, numbers, _, -)");
    }
  };

  const avatarInitial = callsign.charAt(0).toUpperCase() || "R";

  return (
    <div className="flex-1 flex flex-col safe-px safe-top pb-24 select-none space-y-4">
      <header className="pt-2 pb-2">
        <h2 className="text-2xl font-black text-white font-gaming">OPERATOR PROFILE</h2>
        <p className="text-xs text-game-text-muted">Identity & session persistence</p>
      </header>

      {/* Profile Card */}
      <Card variant="default" className="p-5 text-center space-y-3">
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-game-crimson to-game-crimson-secondary mx-auto flex items-center justify-center font-gaming text-2xl font-black text-white shadow-[0_6px_20px_rgba(255,59,48,0.35)]">
          {avatarInitial}
        </div>

        {editing ? (
          <div className="space-y-2 max-w-xs mx-auto">
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              maxLength={16}
              className="w-full h-11 bg-game-charcoal border border-game-border rounded-xl px-3 text-center text-sm font-bold text-white focus:outline-none focus:border-game-crimson"
              autoFocus
            />
            {error && <p className="text-xs text-game-crimson">{error}</p>}
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" fullWidth onClick={() => setEditing(false)}>
                Cancel
              </Button>
              <Button size="sm" variant="primary" fullWidth onClick={handleSave}>
                Save
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <h3 className="text-xl font-extrabold text-white flex items-center justify-center gap-2">
              <span>{callsign}</span>
              <button
                onClick={() => {
                  setNameInput(callsign);
                  setEditing(true);
                }}
                className="text-xs text-game-crimson font-bold hover:underline cursor-pointer"
              >
                Edit
              </button>
            </h3>
            <p className="text-xs text-game-text-muted">Active Callsign</p>
          </div>
        )}
      </Card>

      {/* Guest Session Identifier */}
      <Card variant="solid" className="p-4 space-y-2 border-neutral-800">
        <div className="flex items-center justify-between text-xs">
          <span className="font-extrabold text-white flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-blue-400" />
            Guest Device ID
          </span>
          <button
            onClick={handleCopyId}
            className="flex items-center gap-1 text-[11px] font-bold text-game-crimson hover:underline cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
        <p className="text-[11px] font-mono text-neutral-400 truncate bg-game-charcoal/80 p-2 rounded-lg border border-game-border">
          {playerId}
        </p>
        <p className="text-[10px] text-neutral-500 flex items-center gap-1 pt-1">
          <ShieldCheck className="w-3 h-3 text-emerald-400" />
          Persistent session stored in localStorage
        </p>
      </Card>
    </div>
  );
}

