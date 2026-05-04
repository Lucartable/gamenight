"use client";

import { useEffect, useState } from "react";
import { secondsLeft } from "./utils";

/**
 * Recalcule le temps restant chaque seconde côté client à partir d'un
 * timestamp ISO de départ (la source de vérité reste la base).
 */
export function useCountdown(startIso: string | null, durationSec: number): number {
  const [left, setLeft] = useState(() => secondsLeft(startIso, durationSec));

  useEffect(() => {
    setLeft(secondsLeft(startIso, durationSec));
    if (!startIso) return;
    const id = setInterval(() => {
      setLeft(secondsLeft(startIso, durationSec));
    }, 250);
    return () => clearInterval(id);
  }, [startIso, durationSec]);

  return left;
}
