"use client";

import { type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";

interface SectionProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  title?: ReactNode;
  eyebrow?: ReactNode;
  description?: ReactNode;
  trailing?: ReactNode;
  spacing?: "tight" | "normal" | "loose";
}

const SPACING = {
  tight: "gap-2",
  normal: "gap-3",
  loose: "gap-4",
} as const;

export function Section({
  title,
  eyebrow,
  description,
  trailing,
  spacing = "normal",
  className,
  children,
  ...rest
}: SectionProps) {
  return (
    <section className={cn("flex flex-col", SPACING[spacing], className)} {...rest}>
      {(eyebrow || title || trailing || description) && (
        <header className="flex flex-wrap items-end justify-between gap-2">
          <div className="flex flex-col gap-1 min-w-0">
            {eyebrow && (
              <span className="text-[10px] font-black uppercase tracking-[0.24em] text-neon-cyan">
                {eyebrow}
              </span>
            )}
            {title && (
              <h2 className="text-xl sm:text-2xl font-black leading-tight text-white">{title}</h2>
            )}
            {description && (
              <p className="text-sm font-medium text-white/55 leading-snug max-w-md">{description}</p>
            )}
          </div>
          {trailing && <div className="flex-shrink-0">{trailing}</div>}
        </header>
      )}
      {children}
    </section>
  );
}
