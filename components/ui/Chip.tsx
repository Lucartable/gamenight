"use client";

import { type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type ChipTone = "neutral" | "pink" | "cyan" | "yellow" | "green" | "purple";
type ChipSize = "sm" | "md";

const TONE: Record<ChipTone, string> = {
  neutral: "bg-white/8 text-white/85 border-white/12",
  pink: "bg-neon-pink/14 text-neon-pink border-neon-pink/35",
  cyan: "bg-neon-cyan/14 text-neon-cyan border-neon-cyan/35",
  yellow: "bg-neon-yellow/14 text-neon-yellow border-neon-yellow/35",
  green: "bg-neon-green/14 text-neon-green border-neon-green/35",
  purple: "bg-neon-purple/14 text-neon-purple border-neon-purple/35",
};

const SIZE: Record<ChipSize, string> = {
  sm: "px-2.5 py-1 text-[10px] tracking-[0.16em] uppercase",
  md: "px-3 py-1.5 text-xs tracking-[0.12em] uppercase",
};

export interface ChipProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: ChipTone;
  size?: ChipSize;
  leading?: ReactNode;
}

export function Chip({ tone = "neutral", size = "md", leading, className, children, ...rest }: ChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-black [background-clip:padding-box]",
        TONE[tone],
        SIZE[size],
        className,
      )}
      {...rest}
    >
      {leading && <span aria-hidden="true">{leading}</span>}
      {children}
    </span>
  );
}
