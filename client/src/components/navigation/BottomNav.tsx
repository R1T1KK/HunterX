"use client";

import React from "react";
import { Compass, Trophy, BookOpen, User } from "lucide-react";

export type NavTab = "play" | "stats" | "rules" | "profile";

interface BottomNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const tabs = [
    { id: "play" as NavTab, label: "Play", icon: Compass },
    { id: "stats" as NavTab, label: "Stats", icon: Trophy },
    { id: "rules" as NavTab, label: "Rules", icon: BookOpen },
    { id: "profile" as NavTab, label: "Profile", icon: User },
  ];

  return (
    <nav
      aria-label="Main Navigation"
      className="fixed bottom-0 left-0 right-0 z-30 flex justify-center safe-bottom pb-2 pointer-events-none"
    >
      <div className="pointer-events-auto bg-game-charcoal/95 border border-game-border/80 rounded-full px-2 py-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.7)] backdrop-blur-xl flex items-center gap-1 max-w-sm mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold transition-all min-h-[44px] cursor-pointer ${
                isActive
                  ? "bg-game-card text-game-crimson border border-game-crimson/30 shadow-[0_2px_12px_rgba(255,59,48,0.25)]"
                  : "text-game-text-muted hover:text-white"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

