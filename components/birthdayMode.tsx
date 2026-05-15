"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BIRTHDAY_BROADCAST_EVENT,
  BIRTHDAY_EMOTE_COOLDOWN_MS,
  BIRTHDAY_EMOTE_VISIBLE_MS,
  BIRTHDAY_MODE,
  BIRTHDAY_NAME,
  getBirthdayMessage,
} from "@/lib/birthday";
import { playSfx } from "@/lib/audio";
import { useAudioControls } from "@/lib/audioSettings";
import { getSupabase } from "@/lib/supabase";

type BirthdayChannel = ReturnType<ReturnType<typeof getSupabase>["channel"]>;

interface BirthdayBurst {
  id: string;
}

interface BirthdayPayload {
  id: string;
  senderName?: string;
  createdAt: number;
}

export function BirthdayBanner({
  variant = "compact",
  className = "",
}: {
  variant?: "hero" | "compact" | "tv";
  className?: string;
}) {
  if (!BIRTHDAY_MODE) return null;

  return (
    <p className={`birthday-banner birthday-banner-${variant} ${className}`.trim()}>
      {getBirthdayMessage()}
    </p>
  );
}

export function BirthdayEmote({
  roomId,
  senderName,
  enabled = true,
  placement = "default",
}: {
  roomId?: string | null;
  senderName?: string | null;
  enabled?: boolean;
  placement?: "default" | "tv";
}) {
  const [bursts, setBursts] = useState<BirthdayBurst[]>([]);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const audioControls = useAudioControls();
  const channelRef = useRef<BirthdayChannel | null>(null);
  const timeoutRefs = useRef<number[]>([]);
  const seenEventsRef = useRef<Set<string>>(new Set());
  const lastIncomingAtRef = useRef(0);

  const triggerBurst = useCallback((payload?: BirthdayPayload) => {
    const id = payload?.id ?? makeBirthdayId();
    setBursts((current) => [...current.slice(-2), { id }]);
    playSfx("birthday");

    const timeoutId = window.setTimeout(() => {
      setBursts((current) => current.filter((burst) => burst.id !== id));
    }, BIRTHDAY_EMOTE_VISIBLE_MS);
    timeoutRefs.current.push(timeoutId);
  }, []);

  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
      timeoutRefs.current = [];
    };
  }, []);

  useEffect(() => {
    if (!cooldownUntil) {
      setCooldownRemaining(0);
      return;
    }

    const updateRemaining = () => {
      const remainingMs = Math.max(0, cooldownUntil - Date.now());
      setCooldownRemaining(Math.ceil(remainingMs / 1000));
      if (remainingMs <= 0) setCooldownUntil(0);
    };

    updateRemaining();
    const intervalId = window.setInterval(updateRemaining, 250);
    return () => window.clearInterval(intervalId);
  }, [cooldownUntil]);

  useEffect(() => {
    if (!BIRTHDAY_MODE || !enabled || !roomId) return;

    let supabase: ReturnType<typeof getSupabase> | null = null;
    try {
      supabase = getSupabase();
    } catch {
      return;
    }

    const channel = supabase
      .channel(`birthday:${roomId}`, { config: { broadcast: { self: false } } })
      .on("broadcast", { event: BIRTHDAY_BROADCAST_EVENT }, ({ payload }) => {
        const event = payload as Partial<BirthdayPayload>;
        if (!event.id || seenEventsRef.current.has(event.id)) return;
        const now = Date.now();
        if (now - lastIncomingAtRef.current < 1200) return;

        seenEventsRef.current.add(event.id);
        lastIncomingAtRef.current = now;
        triggerBurst({
          id: event.id,
          senderName: event.senderName,
          createdAt: typeof event.createdAt === "number" ? event.createdAt : now,
        });
      })
      .subscribe();

    channelRef.current = channel;
    return () => {
      channelRef.current = null;
      if (supabase) void supabase.removeChannel(channel);
    };
  }, [enabled, roomId, triggerBurst]);

  if (!BIRTHDAY_MODE || !enabled) return null;

  const isCoolingDown = cooldownRemaining > 0;

  function handleClick() {
    const now = Date.now();
    if (now < cooldownUntil) return;

    audioControls.prime();
    const payload: BirthdayPayload = {
      id: makeBirthdayId(),
      senderName: senderName ?? undefined,
      createdAt: now,
    };

    seenEventsRef.current.add(payload.id);
    setCooldownUntil(now + BIRTHDAY_EMOTE_COOLDOWN_MS);
    triggerBurst(payload);

    if (channelRef.current) {
      void channelRef.current
        .send({
          type: "broadcast",
          event: BIRTHDAY_BROADCAST_EVENT,
          payload,
        })
        .catch(() => undefined);
    }
  }

  return (
    <div className={`birthday-emote-root ${placement === "tv" ? "is-tv" : ""}`} aria-live="polite">
      <button
        type="button"
        className="birthday-emote-button"
        disabled={isCoolingDown}
        onClick={handleClick}
        aria-label={isCoolingDown ? `Emote anniversaire disponible dans ${cooldownRemaining} secondes` : getBirthdayMessage()}
        title={isCoolingDown ? `Cooldown ${cooldownRemaining}s` : getBirthdayMessage()}
      >
        <span aria-hidden="true">🎉</span>
        <span>{BIRTHDAY_NAME}</span>
      </button>
      {isCoolingDown && <span className="birthday-emote-cooldown">{cooldownRemaining}s</span>}
      <div className="birthday-pop-layer">
        {bursts.map((burst) => (
          <div key={burst.id} className="birthday-pop">
            <span className="birthday-pop-message">{getBirthdayMessage()}</span>
            <span className="birthday-confetti birthday-confetti-1" aria-hidden="true" />
            <span className="birthday-confetti birthday-confetti-2" aria-hidden="true" />
            <span className="birthday-confetti birthday-confetti-3" aria-hidden="true" />
            <span className="birthday-confetti birthday-confetti-4" aria-hidden="true" />
            <span className="birthday-confetti birthday-confetti-5" aria-hidden="true" />
            <span className="birthday-confetti birthday-confetti-6" aria-hidden="true" />
          </div>
        ))}
      </div>
    </div>
  );
}

function makeBirthdayId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
