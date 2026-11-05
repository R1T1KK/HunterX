import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "white" | "ghost" | "amber";
  size?: "default" | "lg" | "sm" | "icon";
  fullWidth?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "default",
      fullWidth = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-bold tracking-wide transition-all duration-150 select-none cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100";

    const variants = {
      primary:
        "bg-game-crimson text-white hover:bg-game-crimson-secondary shadow-[0_4px_20px_rgba(255,59,48,0.35)] focus-visible:ring-game-crimson",
      secondary:
        "bg-game-card text-game-text border border-game-border hover:bg-game-charcoal hover:border-neutral-700 focus-visible:ring-game-border",
      white:
        "bg-white text-game-black hover:bg-neutral-100 shadow-[0_4px_16px_rgba(255,255,255,0.2)] focus-visible:ring-white",
      amber:
        "bg-game-amber text-game-black hover:brightness-110 shadow-[0_4px_16px_rgba(255,149,0,0.3)] focus-visible:ring-game-amber",
      ghost:
        "bg-transparent text-game-text-muted hover:text-white hover:bg-game-charcoal/50",
    };

    const sizes = {
      sm: "h-9 min-h-[36px] px-3 text-xs rounded-xl",
      default: "h-11 min-h-[44px] px-5 text-sm rounded-2xl",
      lg: "h-14 min-h-[56px] px-6 text-base rounded-2xl font-extrabold",
      icon: "h-11 w-11 min-h-[44px] min-w-[44px] rounded-2xl p-0",
    };

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          fullWidth && "w-full",
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
