"use client";

import React, { useState } from "react";
import { Copy, Check, RefreshCw, Share2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

interface RoomCodeCardProps {
  roomCode: string;
  isHost: boolean;
  onRegenerateCode: () => Promise<void>;
  isRegenerating: boolean;
}

export function RoomCodeCard({
  roomCode,
  isHost,
  onRegenerateCode,
  isRegenerating,
}: RoomCodeCardProps) {
  const [copied, setCopied] = useState(false);

  const getInvitationUrl = () => {
    if (typeof window !== "undefined") {
      return `${window.location.origin}?code=${roomCode}`;
    }
    return `https://hiderush.fun?code=${roomCode}`;
  };

  const handleShareOrCopy = async () => {
    const inviteUrl = getInvitationUrl();

    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: "Join HIDERUSH Match",
          text: `Join my real-world GPS Hide & Seek match! Room code: ${roomCode}`,
          url: inviteUrl,
        });
        return;
      } catch (err) {
        // User cancelled or share failed, fallback to clipboard
        console.log("Web Share cancelled/failed, falling back to clipboard:", err);
      }
    }

    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Card variant="solid" className="p-4 space-y-3 border-game-border/90">
      <div className="flex items-center justify-between">
        <span className="text-xs font-extrabold uppercase tracking-widest text-game-text-muted">
          Game code
        </span>

        <div className="flex items-center gap-2">
          <button
            onClick={handleShareOrCopy}
            className="min-h-[44px] px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-extrabold text-game-crimson hover:bg-game-crimson/10 transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                <span>Copy</span>
              </>
            )}
          </button>

          {isHost && (
            <button
              onClick={onRegenerateCode}
              disabled={isRegenerating}
              className="min-h-[44px] px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-bold text-neutral-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRegenerating ? "animate-spin" : ""}`} />
              <span>Change</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between pt-1">
        <h2 className="text-4xl sm:text-5xl font-black tracking-widest text-white font-gaming">
          {roomCode}
        </h2>

        {isHost ? (
          <span className="px-3 py-1 rounded-full bg-game-crimson/20 border border-game-crimson/40 text-xs font-black text-game-crimson">
            Hosting
          </span>
        ) : (
          <span className="px-2.5 py-1 rounded-full bg-neutral-800 text-[11px] font-bold text-neutral-400">
            Joined
          </span>
        )}
      </div>
    </Card>
  );
}
