"use client";

import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type CardVariant = "default" | "hero" | "subtle" | "interactive" | "danger" | "success" | "tv";
type CardPadding = "none" | "sm" | "md" | "lg" | "xl";
type CardTone = "neutral" | "pink" | "cyan" | "yellow" | "green" | "purple";

const VARIANT_CLASSES: Record<CardVariant, string> = {
  default:
    "surface-card border border-white/10",
  hero:
    "surface-hero border border-white/12 relative overflow-hidden",
  subtle:
    "bg-white/[0.04] border border-white/8",
  interactive:
    "surface-card border border-white/10 transition-transform duration-200 ease-out hover:-translate-y-0.5 hover:border-white/20 cursor-pointer",
  danger:
    "border border-neon-pink/40 bg-neon-pink/10",
  success:
    "border border-neon-green/40 bg-neon-green/10",
  tv:
    "surface-card-elev border border-white/12 relative overflow-hidden",
};

const PADDING_CLASSES: Record<CardPadding, string> = {
  none: "p-0",
  sm: "p-3",
  md: "p-4 sm:p-5",
  lg: "p-5 sm:p-6",
  xl: "p-6 sm:p-8",
};

const TONE_RING: Record<CardTone, string> = {
  neutral: "",
  pink: "shadow-glow-pink",
  cyan: "shadow-glow-cyan",
  yellow: "shadow-glow-yellow",
  green: "shadow-glow-green",
  purple: "shadow-glow",
};

const RADIUS_CLASSES = "rounded-xl sm:rounded-2xl";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: CardPadding;
  tone?: CardTone;
  asChild?: false;
  children?: ReactNode;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { variant = "default", padding = "md", tone = "neutral", className, children, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        RADIUS_CLASSES,
        VARIANT_CLASSES[variant],
        PADDING_CLASSES[padding],
        TONE_RING[tone],
        "[background-clip:padding-box] [transform:translateZ(0)]",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
});
