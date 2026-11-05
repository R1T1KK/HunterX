import * as React from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "solid" | "glow";
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "default", children, ...props }, ref) => {
    const variants = {
      default: "bg-game-card/90 border border-game-border shadow-lg backdrop-blur-md",
      solid: "bg-game-charcoal border border-game-border",
      glow: "bg-game-card border border-game-crimson/30 shadow-[0_4px_24px_rgba(255,59,48,0.15)]",
    };

    return (
      <div
        ref={ref}
        className={cn("rounded-3xl p-5 text-game-text transition-all", variants[variant], className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";
