"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Player } from "@/types/database";

const EVENT_TTL_MS = 1400;
const MAX_EVENTS = 12;

export interface ValidationEvent {
  id: string;
  voterPlayerId: string;
  player: Player | null;
  anonymous: boolean;
  ts: number;
}

interface UseValidationEventsArgs {
  voterIds: string[];
  players: Player[];
  questionKey: string | null;
  anonymous?: boolean;
  hideOwnId?: string | null;
}

/**
 * Détecte les nouveaux voter_ids pour la question courante et émet une animation
 * temporaire. La première vague de votes (lors du montage / changement de question)
 * est ignorée pour ne pas spammer de particules au refresh.
 */
export function useValidationEvents({
  voterIds,
  players,
  questionKey,
  anonymous = false,
  hideOwnId = null,
}: UseValidationEventsArgs): ValidationEvent[] {
  const [events, setEvents] = useState<ValidationEvent[]>([]);
  const seenRef = useRef<Set<string>>(new Set());
  const lastQuestionKey = useRef<string | null>(null);

  const playersById = useMemo(() => {
    const map = new Map<string, Player>();
    for (const player of players) map.set(player.id, player);
    return map;
  }, [players]);

  useEffect(() => {
    if (questionKey !== lastQuestionKey.current) {
      seenRef.current = new Set(voterIds);
      lastQuestionKey.current = questionKey;
      setEvents([]);
      return;
    }
    const now = Date.now();
    const next: ValidationEvent[] = [];
    for (const id of voterIds) {
      if (id === hideOwnId) {
        seenRef.current.add(id);
        continue;
      }
      if (seenRef.current.has(id)) continue;
      seenRef.current.add(id);
      next.push({
        id: `${id}-${now}-${Math.random().toString(36).slice(2, 6)}`,
        voterPlayerId: id,
        player: playersById.get(id) ?? null,
        anonymous,
        ts: now,
      });
    }
    if (!next.length) return;
    setEvents((prev) => {
      const combined = [...prev, ...next];
      return combined.length > MAX_EVENTS ? combined.slice(combined.length - MAX_EVENTS) : combined;
    });
  }, [voterIds, hideOwnId, questionKey, anonymous, playersById]);

  useEffect(() => {
    if (!events.length) return;
    const earliest = events[0]?.ts ?? Date.now();
    const remaining = Math.max(60, EVENT_TTL_MS - (Date.now() - earliest));
    const timer = window.setTimeout(() => {
      const cutoff = Date.now() - EVENT_TTL_MS;
      setEvents((prev) => prev.filter((event) => event.ts >= cutoff));
    }, remaining);
    return () => window.clearTimeout(timer);
  }, [events]);

  return events;
}
