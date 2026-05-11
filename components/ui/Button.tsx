"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "success" | "icon";
type ButtonSize = "sm" | "md" | "lg";

const BASE = "inline-flex items-center justify-center gap-2 font-black tracking-wide select-none transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 focus-ring [background-clip:padding-box] [transform:translateZ(0)]";

const VARIANT: Record<ButtonVariant, string> = {
  primary:
    "text-white shadow-glow-pink border border-white/12 relative isolate overflow-hidden " +
    "bg-[linear-gradient(135deg,#ff3ea5_0%,#a855f7_55%,#22d3ee_100%)] " +
    "hover:brightness-110",
  secondary:
    "text-white border border-white/12 bg-white/5 hover:bg-white/10 hover:border-white/20",
  ghost:
    "text-white/80 hover:text-white hover:bg-white/5 border border-transparent",
  danger:
    "text-neon-pink border border-neon-pink/30 bg-neon-pink/10 hover:bg-neon-pink/20",
  success:
    "text-neon-green border border-neon-green/30 bg-neon-green/10 hover:bg-neon-green/20",
  icon:
    "text-white/80 hover:text-white bg-white/5 border border-white/8 hover:bg-white/10",
};

const SIZE: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs rounded-full",
  md: "px-4 py-2.5 text-sm rounded-full",
  lg: "px-6 py-4 text-base rounded-2xl",
};

const ICON_SIZE: Record<ButtonSize, string> = {
  sm: "h-8 w-8 rounded-full text-base p-0",
  md: "h-10 w-10 rounded-full text-lg p-0",
  lg: "h-12 w-12 rounded-2xl text-xl p-0",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  leading?: ReactNode;
  trailing?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", fullWidth, leading, trailing, className, children, type = "button", ...rest },
  ref,
) {
  const isIcon = variant === "icon";
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        BASE,
        isIcon ? ICON_SIZE[size] : SIZE[size],
        VARIANT[variant],
        fullWidth && !isIcon && "w-full",
        className,
      )}
      {...rest}
    >
      {leading && <span aria-hidden="true" className="inline-flex">{leading}</span>}
      {children}
      {trailing && <span aria-hidden="true" className="inline-flex">{trailing}</span>}
    </button>
  );
});
