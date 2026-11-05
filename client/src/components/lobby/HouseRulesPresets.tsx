"use client";

import React from "react";
import { Zap, Clock, ShieldAlert, Sparkles } from "lucide-react";
import { HouseRules, RulesPreset } from "@/types";

interface HouseRulesPresetsProps {
  currentRules: HouseRules;
  isHost: boolean;
  onSelectPreset: (preset: RulesPreset) => void;
}

export function HouseRulesPresets({
  currentRules,
  isHost,
  onSelectPreset,
}: HouseRulesPresetsProps) {
  const presets: Array<{
    id: RulesPreset;
    title: string;
    subtitle: string;
    icon: typeof Zap;
    round: string;
    headStart: string;
    pings: string;
    zone: string;
  }> = [
    {
      id: "QUICK",
      title: "Quick",
      subtitle: "Fast-paced chase",
      icon: Zap,
      round: "5 min",
      headStart: "15s",
      pings: "30s",
      zone: "250m",
    },
    {
      id: "STANDARD",
      title: "Standard",
      subtitle: "HIDERUSH default",
      icon: Clock,
      round: "10 min",
      headStart: "30s",
      pings: "60s",
      zone: "500m",
    },
    {
      id: "BIG_PARK",
      title: "Big park",
      subtitle: "Zone shrinks over time",
      icon: ShieldAlert,
      round: "20 min",
      headStart: "60s",
      pings: "90s",
      zone: "1000m (Shrinks)",
    },
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-extrabold uppercase tracking-wider text-white">
          House rules
        </h3>
        <span className="text-[10px] font-bold text-neutral-400">
          {isHost ? "Tap to switch preset" : "Set by Host"}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {presets.map((preset) => {
          const isSelected = currentRules.preset === preset.id;
          const Icon = preset.icon;

          return (
            <button
              key={preset.id}
              onClick={() => isHost && onSelectPreset(preset.id)}
              disabled={!isHost}
              className={`p-3 min-h-[44px] rounded-2xl border text-left transition-all cursor-pointer disabled:cursor-default flex flex-col justify-between min-h-[105px] ${
                isSelected
                  ? "bg-game-charcoal border-game-crimson shadow-[0_2px_16px_rgba(255,59,48,0.25)] ring-1 ring-game-crimson"
                  : "bg-game-card/60 border-game-border hover:border-neutral-700"
              }`}
            >
              <div>
                <div className="flex items-center justify-between pb-1">
                  <Icon
                    className={`w-4 h-4 ${
                      isSelected ? "text-game-crimson" : "text-neutral-500"
                    }`}
                  />
                  {isSelected && (
                    <span className="w-1.5 h-1.5 rounded-full bg-game-crimson" />
                  )}
                </div>
                <p className="text-xs font-black text-white">{preset.title}</p>
                <p className="text-[10px] text-game-text-muted leading-tight line-clamp-1">
                  {preset.subtitle}
                </p>
              </div>

              <div className="pt-2 border-t border-neutral-800/80 text-[10px] text-neutral-400 font-semibold space-y-0.5">
                <p>⏱ {preset.round}</p>
                <p>🏃 {preset.headStart} head start</p>
              </div>
            </button>
          );
        })}
      </div>

      {currentRules.preset === "CUSTOM" && (
        <div className="flex items-center gap-1.5 p-2 rounded-xl bg-game-amber/15 border border-game-amber/30 text-xs text-game-amber">
          <Sparkles className="w-3.5 h-3.5" />
          <span className="font-bold">Custom rules mode active</span>
        </div>
      )}
    </div>
  );
}
