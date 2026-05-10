"use client";

import { useCallback, useEffect, useState } from "react";
import { primeAudio, setMuted, setSfxVolume } from "./audio";

const STORAGE_KEY = "badaboum_audio_v1";

interface StoredSettings {
  muted: boolean;
  volume: number;
}

const DEFAULTS: StoredSettings = { muted: false, volume: 0.7 };

function readStored(): StoredSettings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<StoredSettings>;
    return {
      muted: Boolean(parsed.muted),
      volume: typeof parsed.volume === "number" && Number.isFinite(parsed.volume)
        ? Math.min(1, Math.max(0, parsed.volume))
        : DEFAULTS.volume,
    };
  } catch {
    return DEFAULTS;
  }
}

function writeStored(settings: StoredSettings): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore quota
  }
}

export interface AudioControls {
  muted: boolean;
  volume: number;
  toggleMute: () => void;
  setMuted: (value: boolean) => void;
  setVolume: (value: number) => void;
  prime: () => void;
}

export function useAudioControls(): AudioControls {
  const [settings, setSettings] = useState<StoredSettings>(DEFAULTS);

  useEffect(() => {
    const stored = readStored();
    setSettings(stored);
    setMuted(stored.muted);
    setSfxVolume(stored.volume);
  }, []);

  const update = useCallback((patch: Partial<StoredSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      writeStored(next);
      setMuted(next.muted);
      setSfxVolume(next.volume);
      return next;
    });
  }, []);

  return {
    muted: settings.muted,
    volume: settings.volume,
    toggleMute: () => update({ muted: !settings.muted }),
    setMuted: (value: boolean) => update({ muted: value }),
    setVolume: (value: number) => update({ volume: Math.min(1, Math.max(0, value)) }),
    prime: primeAudio,
  };
}
