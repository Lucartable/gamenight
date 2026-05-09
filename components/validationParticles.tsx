"use client";

import { memo, useMemo } from "react";
import { PlayerAvatar } from "./playerAvatar";
import type { ValidationEvent } from "@/lib/useValidationEvents";

interface ValidationParticlesProps {
  events: ValidationEvent[];
  align?: "top" | "bottom";
  className?: string;
}

export const ValidationParticles = memo(function ValidationParticles({
  events,
  align = "bottom",
  className = "",
}: ValidationParticlesProps) {
  const particles = useMemo(() => events.map((event, index) => mapToVisual(event, index)), [events]);

  return (
    <div
      className={`validation-particles validation-particles-${align} ${className}`}
      aria-hidden="true"
    >
      {particles.map((particle) => (
        <span
          key={particle.id}
          className="validation-particle"
          style={{
            left: `${particle.left}%`,
            animationDuration: `${particle.duration}ms`,
            animationDelay: `${particle.delay}ms`,
          }}
        >
          <PlayerAvatar
            player={particle.event.anonymous ? null : particle.event.player}
            variant={particle.event.anonymous ? "anonymous" : "default"}
            size="sm"
            className="validation-particle-avatar"
          />
          <span className="validation-particle-check" aria-hidden="true">✓</span>
        </span>
      ))}
    </div>
  );
});

function mapToVisual(event: ValidationEvent, index: number) {
  const seedSource = `${event.id}-${index}`;
  const hash = simpleHash(seedSource);
  const left = 12 + (hash % 76);
  const duration = 1100 + ((hash >> 7) % 320);
  const delay = (index % 4) * 40;
  return { id: event.id, event, left, duration, delay };
}

function simpleHash(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}
