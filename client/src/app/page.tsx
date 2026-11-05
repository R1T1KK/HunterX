"use client";

import { useState } from "react";
import { Compass, Trophy, User, ShieldAlert, Sparkles, MapPin, Radio, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default function MobileFoundationScreen() {
  const [activeTab, setActiveTab] = useState<"play" | "ranks" | "you">("play");
  const [playerNickname] = useState("Ritik_Kashyap");

  return (
    <div className="flex-1 flex flex-col justify-between safe-px safe-top pb-28 select-none">
      {/* Top Header / Tactical Brand Bar */}
      <header className="pt-2 pb-4 flex items-center justify-between">
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

        <Badge variant="live" className="text-[10px]">
          PWA READY
        </Badge>
      </header>

      {/* Hero Content (SCRAM-Inspired High-Energy Hero) */}
      <section className="space-y-4 my-auto py-2">
        <div className="space-y-1">
          <p className="text-sm font-extrabold uppercase tracking-widest text-game-crimson">
            Ready to Hunt
          </p>
          <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-white leading-[1.05]">
            Hi, <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-neutral-400">
              {playerNickname}.
            </span>
          </h2>
          <p className="text-sm text-game-text-muted font-medium pt-1">
            Host a real-world game or grab a code from a friend.
          </p>
        </div>

        {/* Primary Action Buttons (Thumb Zone Sized) */}
        <div className="space-y-3 pt-2">
          <Button
            variant="white"
            size="lg"
            fullWidth
            onClick={() => console.log("Host Game tapped")}
            className="text-base tracking-wide"
          >
            Host a game
          </Button>

          <Button
            variant="secondary"
            size="lg"
            fullWidth
            onClick={() => console.log("Join Code tapped")}
            className="text-base tracking-wide text-white border-neutral-700/80 bg-game-card/80"
          >
            Join with a code
          </Button>

          <div className="flex items-center justify-center gap-2 pt-1 text-xs font-semibold text-game-text-muted">
            <span className="hover:text-white transition-colors cursor-pointer">How it works</span>
            <span>·</span>
            <span className="hover:text-white transition-colors cursor-pointer">Try a demo round</span>
          </div>
        </div>

        {/* Design System Verification Card */}
        <Card variant="default" className="mt-4 border-game-border/80">
          <div className="flex items-center justify-between pb-3 border-b border-game-border/60">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-game-amber" />
              <span className="text-xs font-extrabold uppercase tracking-wider text-white">
                Day 1 System Status
              </span>
            </div>
            <Badge variant="amber" className="text-[10px]">
              Foundation
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-3 text-xs">
            <div className="bg-game-charcoal/80 p-2.5 rounded-xl border border-game-border flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-game-crimson" />
              <div>
                <p className="text-[10px] text-game-text-muted font-bold">Safe Areas</p>
                <p className="font-extrabold text-white text-xs">Active</p>
              </div>
            </div>

            <div className="bg-game-charcoal/80 p-2.5 rounded-xl border border-game-border flex items-center gap-2">
              <ShieldAlert className="w-3.5 h-3.5 text-blue-400" />
              <div>
                <p className="text-[10px] text-game-text-muted font-bold">Design Tokens</p>
                <p className="font-extrabold text-white text-xs">Verified</p>
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-game-text-muted pt-2 border-t border-game-border/60">
            <span>Presets ready: Quick · Standard · Big Park</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </Card>
      </section>

      {/* Floating Bottom Navigation Bar (SCRAM-Style Fixed Pill) */}
      <nav
        aria-label="Main Navigation"
        className="fixed bottom-0 left-0 right-0 z-30 flex justify-center safe-bottom pb-2 pointer-events-none"
      >
        <div className="pointer-events-auto bg-game-charcoal/95 border border-game-border/80 rounded-full px-3 py-2 shadow-[0_8px_32px_rgba(0,0,0,0.7)] backdrop-blur-xl flex items-center gap-2 max-w-xs mx-auto">
          <button
            onClick={() => setActiveTab("play")}
            className={`flex items-center gap-2 px-5 py-2 rounded-full text-xs font-extrabold transition-all min-h-[44px] cursor-pointer ${
              activeTab === "play"
                ? "bg-game-card text-game-crimson border border-game-crimson/30 shadow-[0_2px_12px_rgba(255,59,48,0.2)]"
                : "text-game-text-muted hover:text-white"
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>Play</span>
          </button>

          <button
            onClick={() => setActiveTab("ranks")}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all min-h-[44px] cursor-pointer ${
              activeTab === "ranks"
                ? "bg-game-card text-game-amber border border-game-amber/30"
                : "text-game-text-muted hover:text-white"
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span>Ranks</span>
          </button>

          <button
            onClick={() => setActiveTab("you")}
            className={`w-11 h-11 rounded-full flex items-center justify-center font-extrabold text-xs transition-all cursor-pointer ${
              activeTab === "you"
                ? "bg-game-crimson text-white shadow-[0_2px_10px_rgba(255,59,48,0.4)]"
                : "bg-game-card text-game-text-muted hover:text-white border border-game-border"
            }`}
            aria-label="Profile"
          >
            <User className="w-4 h-4" />
          </button>
        </div>
      </nav>
    </div>
  );
}
