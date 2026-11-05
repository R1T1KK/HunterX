import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "hunter" | "runner" | "amber" | "neutral" | "live";
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "neutral", children, ...props }, ref) => {
    const variants = {
      hunter: "bg-game-crimson/20 text-game-crimson border-game-crimson/40",
      runner: "bg-blue-500/20 text-blue-400 border-blue-500/40",
      amber: "bg-game-amber/20 text-game-amber border-game-amber/40",
      neutral: "bg-game-charcoal text-game-text-muted border-game-border",
      live: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
    };

    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border",
          variants[variant],
          className
        )}
        {...props}
      >
        {variant === "live" && (
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        )}
        {children}
      </span>
    );
  }
);

Badge.displayName = "Badge";
