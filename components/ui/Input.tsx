"use client";

import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type InputSize = "sm" | "md" | "lg";
type InputTone = "neutral" | "danger";

const SIZE: Record<InputSize, string> = {
  sm: "px-3 py-2 text-sm rounded-lg",
  md: "px-4 py-3 text-base rounded-xl",
  lg: "px-5 py-4 text-lg rounded-2xl",
};

const TONE: Record<InputTone, string> = {
  neutral:
    "border-white/10 focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/30",
  danger:
    "border-neon-pink/45 focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/30",
};

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  inputSize?: InputSize;
  tone?: InputTone;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { inputSize = "md", tone = "neutral", className, ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cn(
        "w-full bg-bg-card border outline-none transition placeholder:text-white/30",
        "text-white",
        SIZE[inputSize],
        TONE[tone],
        className,
      )}
      {...rest}
    />
  );
});
