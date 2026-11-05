"use client";

import React, { useState } from "react";
import { Sliders, X, ChevronRight, Mic, Shield } from "lucide-react";
import { HouseRules } from "@/types";
import { Button } from "@/components/ui/Button";

interface CustomRulesDrawerProps {
  rules: HouseRules;
  isHost: boolean;
  onUpdateCustomRules: (updated: Partial<HouseRules>) => void;
}

export function CustomRulesDrawer({
  rules,
  isHost,
  onUpdateCustomRules,
}: CustomRulesDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Stepper helper
  const adjustValue = (
    key: keyof HouseRules,
    delta: number,
    min: number,
    max: number
  ) => {
    if (!isHost) return;
    const current = (rules[key] as number) || min;
    const next = Math.max(min, Math.min(max, current + delta));
    onUpdateCustomRules({ [key]: next, preset: "CUSTOM" });
  };

  const toggleBoolean = (key: keyof HouseRules) => {
    if (!isHost) return;
    onUpdateCustomRules({ [key]: !rules[key], preset: "CUSTOM" });
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-game-card/80 border border-game-border hover:border-neutral-700 transition-all text-xs font-extrabold text-white cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-game-crimson" />
          <span>Customize rules & zone</span>
        </div>
        <div className="flex items-center gap-1 text-game-text-muted">
          <span>{rules.preset === "CUSTOM" ? "Customized" : "View"}</span>
          <ChevronRight className="w-4 h-4" />
        </div>
      </button>

      {/* Drawer / Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end justify-center p-3 sm:items-center">
          <div className="bg-game-charcoal border border-game-border rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl safe-bottom max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-game-border/60">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-game-crimson" />
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  Custom Game Rules
                </h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-game-card flex items-center justify-center text-game-text-muted hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* 1. Round Length */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-game-card border border-game-border">
                <div>
                  <p className="font-extrabold text-white">Round length</p>
                  <p className="text-[10px] text-game-text-muted">Max match duration</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-black text-sm text-white min-w-[48px] text-center">
                    {rules.roundLengthMinutes} min
                  </span>
                  {isHost && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => adjustValue("roundLengthMinutes", -1, 3, 30)}
                        className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-neutral-800 text-white font-bold flex items-center justify-center active:scale-95 cursor-pointer"
                      >
                        -
                      </button>
                      <button
                        onClick={() => adjustValue("roundLengthMinutes", 1, 3, 30)}
                        className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-neutral-800 text-white font-bold flex items-center justify-center active:scale-95 cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* 2. Head Start */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-game-card border border-game-border">
                <div>
                  <p className="font-extrabold text-white">Head start</p>
                  <p className="text-[10px] text-game-text-muted">Runners scatter delay</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-black text-sm text-white min-w-[48px] text-center">
                    {rules.headStartSeconds}s
                  </span>
                  {isHost && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => adjustValue("headStartSeconds", -15, 15, 120)}
                        className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-neutral-800 text-white font-bold flex items-center justify-center active:scale-95 cursor-pointer"
                      >
                        -
                      </button>
                      <button
                        onClick={() => adjustValue("headStartSeconds", 15, 15, 120)}
                        className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-neutral-800 text-white font-bold flex items-center justify-center active:scale-95 cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* 3. Pings Interval */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-game-card border border-game-border">
                <div>
                  <p className="font-extrabold text-white">Pings interval</p>
                  <p className="text-[10px] text-game-text-muted">Radar sweep refresh</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-black text-sm text-white min-w-[48px] text-center">
                    {rules.pingIntervalSeconds}s
                  </span>
                  {isHost && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => adjustValue("pingIntervalSeconds", -15, 15, 180)}
                        className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-neutral-800 text-white font-bold flex items-center justify-center active:scale-95 cursor-pointer"
                      >
                        -
                      </button>
                      <button
                        onClick={() => adjustValue("pingIntervalSeconds", 15, 15, 180)}
                        className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-neutral-800 text-white font-bold flex items-center justify-center active:scale-95 cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* 4. Hunters Talk Toggle */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-game-card border border-game-border">
                <div className="flex items-center gap-2">
                  <Mic className="w-4 h-4 text-game-crimson" />
                  <div>
                    <p className="font-extrabold text-white">Hunters can talk</p>
                    <p className="text-[10px] text-game-text-muted">Team radio channel</p>
                  </div>
                </div>
                <button
                  onClick={() => toggleBoolean("huntersCanTalk")}
                  disabled={!isHost}
                  className={`w-12 min-h-[44px] rounded-full transition-colors p-1 flex items-center cursor-pointer ${
                    rules.huntersCanTalk ? "bg-game-crimson justify-end" : "bg-neutral-800 justify-start"
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-white shadow-md" />
                </button>
              </div>

              {/* 5. Play Zone Toggle & Size */}
              <div className="p-3 rounded-2xl bg-game-card border border-game-border space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-game-amber" />
                    <div>
                      <p className="font-extrabold text-white">Play zone boundary</p>
                      <p className="text-[10px] text-game-text-muted">Circular geofence</p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleBoolean("playZoneEnabled")}
                    disabled={!isHost}
                    className={`w-12 min-h-[44px] rounded-full transition-colors p-1 flex items-center cursor-pointer ${
                      rules.playZoneEnabled ? "bg-game-crimson justify-end" : "bg-neutral-800 justify-start"
                    }`}
                  >
                    <span className="w-4 h-4 rounded-full bg-white shadow-md" />
                  </button>
                </div>

                {rules.playZoneEnabled && (
                  <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between">
                    <span className="text-[11px] text-neutral-400">Zone radius</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-xs">{rules.zoneSizeMeters}m</span>
                      {isHost && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => adjustValue("zoneSizeMeters", -100, 150, 3000)}
                            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-lg bg-neutral-800 text-white font-bold flex items-center justify-center cursor-pointer"
                          >
                            -
                          </button>
                          <button
                            onClick={() => adjustValue("zoneSizeMeters", 100, 150, 3000)}
                            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-lg bg-neutral-800 text-white font-bold flex items-center justify-center cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <Button variant="primary" fullWidth size="default" onClick={() => setIsOpen(false)}>
              Done
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
