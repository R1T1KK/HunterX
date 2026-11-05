"use client";

import React from "react";
import { Trophy, Target, Shield, Clock } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export function StatsView() {
  const stats = [
    { label: "Matches Played", value: "0", icon: Trophy, color: "text-game-amber" },
    { label: "Total Tags", value: "0", icon: Target, color: "text-game-crimson" },
    { label: "Rounds Survived", value: "0", icon: Shield, color: "text-blue-400" },
    { label: "Survival Time", value: "0m", icon: Clock, color: "text-emerald-400" },
  ];

  return (
    <div className="flex-1 flex flex-col safe-px safe-top pb-24 select-none space-y-4">
      <header className="pt-2 pb-2">
        <h2 className="text-2xl font-black text-white font-gaming">TACTICAL STATS</h2>
        <p className="text-xs text-game-text-muted">Lifetime performance records</p>
      </header>

      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <Card key={idx} variant="default" className="p-4 space-y-1">
              <div className="flex items-center justify-between">
                <Icon className={`w-4 h-4 ${stat.color}`} />
                <Badge variant="neutral" className="text-[9px]">LIFETIME</Badge>
              </div>
              <p className="text-2xl font-black text-white font-gaming pt-1">{stat.value}</p>
              <p className="text-[11px] text-game-text-muted font-bold">{stat.label}</p>
            </Card>
          );
        })}
      </div>

      <Card variant="solid" className="p-4 space-y-2 mt-2">
        <p className="text-xs font-bold text-white">Online Leaderboard</p>
        <p className="text-xs text-game-text-muted">
          Leaderboard ranking activates after completing your first real-world GPS match.
        </p>
      </Card>
    </div>
  );
}

