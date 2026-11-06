"use client";

import React from "react";
import { GPSSignalQuality } from "@/types";
import { Radio, AlertTriangle, ShieldAlert, CheckCircle2 } from "lucide-react";

interface GPSQualityBadgeProps {
  quality: GPSSignalQuality;
  accuracy?: number | null;
  qualityLabel?: string;
  className?: string;
}

export function GPSQualityBadge({
  quality,
  accuracy,
  qualityLabel,
  className = "",
}: GPSQualityBadgeProps) {
  // Color configuration mapping
  const config = {
    EXCELLENT: {
      bg: "bg-emerald-500/15",
      border: "border-emerald-500/40",
      text: "text-emerald-400",
      dot: "bg-emerald-400",
      label: qualityLabel || "GPS EXCELLENT",
      icon: CheckCircle2,
    },
    MODERATE: {
      bg: "bg-game-amber/15",
      border: "border-game-amber/40",
      text: "text-game-amber",
      dot: "bg-game-amber",
      label: qualityLabel || "GPS MODERATE",
      icon: Radio,
    },
    WEAK: {
      bg: "bg-game-crimson/15",
      border: "border-game-crimson/40",
      text: "text-game-crimson",
      dot: "bg-game-crimson",
      label: qualityLabel || "GPS WEAK",
      icon: AlertTriangle,
    },
    ACQUIRING: {
      bg: "bg-cyan-500/15",
      border: "border-cyan-500/40",
      text: "text-cyan-400",
      dot: "bg-cyan-400 animate-pulse",
      label: qualityLabel || "ACQUIRING GPS",
      icon: Radio,
    },
    SIGNAL_LOST: {
      bg: "bg-game-crimson/25",
      border: "border-game-crimson/60",
      text: "text-game-crimson",
      dot: "bg-game-crimson animate-ping",
      label: qualityLabel || "GPS SIGNAL LOST",
      icon: ShieldAlert,
    },
    DENIED: {
      bg: "bg-red-500/20",
      border: "border-red-500/50",
      text: "text-red-400",
      dot: "bg-red-500",
      label: qualityLabel || "LOCATION PERMISSION DENIED",
      icon: AlertTriangle,
    },
    UNAVAILABLE: {
      bg: "bg-neutral-800/60",
      border: "border-neutral-700",
      text: "text-neutral-400",
      dot: "bg-neutral-500",
      label: qualityLabel || "GPS UNAVAILABLE",
      icon: Radio,
    },
  }[quality];

  const Icon = config.icon;

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-wider backdrop-blur-md transition-all duration-200 select-none ${config.bg} ${config.border} ${config.text} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      <span>{config.label}</span>
      {accuracy !== null && accuracy !== undefined && accuracy > 0 && (
        <span className="opacity-75 font-mono text-[9px] lowercase">
          (±{Math.round(accuracy)}m)
        </span>
      )}
    </div>
  );
}
