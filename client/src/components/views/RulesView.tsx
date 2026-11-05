"use client";

import React from "react";
import { Shield, Bell, EyeOff, Crosshair } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export function RulesView() {
  const rules = [
    {
      title: "Hunters vs Runners",
      desc: "1 to 3 Hunters track down all Runners before the round countdown reaches zero.",
      icon: Crosshair,
      tag: "CORE",
    },
    {
      title: "10-Meter Proximity Alarm",
      desc: "Hunters receive a 10s audio & vibration siren when within 10m of a Runner. Runners get zero alert.",
      icon: Bell,
      tag: "HUNTER",
    },
    {
      title: "Invisibility Cloak",
      desc: "Runners vanish from the map for 15s (3m cooldown). Hunter coordinates are scrubbed server-side.",
      icon: EyeOff,
      tag: "RUNNER",
    },
    {
      title: "Server Catch Validation",
      desc: "Hunters tag Runners at <= 5.0m distance verified by server Haversine math.",
      icon: Shield,
      tag: "RULES",
    },
  ];

  return (
    <div className="flex-1 flex flex-col safe-px safe-top pb-24 select-none space-y-4 overflow-y-auto">
      <header className="pt-2 pb-2">
        <h2 className="text-2xl font-black text-white font-gaming">HOUSE RULES</h2>
        <p className="text-xs text-game-text-muted">Tactical mechanics & game operations</p>
      </header>

      <div className="space-y-3">
        {rules.map((rule, idx) => {
          const Icon = rule.icon;
          return (
            <Card key={idx} variant="default" className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-game-crimson" />
                  <h3 className="text-sm font-extrabold text-white">{rule.title}</h3>
                </div>
                <Badge variant="neutral" className="text-[9px]">{rule.tag}</Badge>
              </div>
              <p className="text-xs text-game-text-muted leading-relaxed">{rule.desc}</p>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

