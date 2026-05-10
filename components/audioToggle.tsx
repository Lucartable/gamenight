"use client";

import { useState } from "react";
import { useAudioControls } from "@/lib/audioSettings";
import { playSfx } from "@/lib/audio";

export function AudioToggle({ compact = false }: { compact?: boolean }) {
  const audio = useAudioControls();
  const [open, setOpen] = useState(false);

  function handleToggle() {
    audio.prime();
    audio.toggleMute();
    if (!audio.muted) {
      // we just muted, no sound
    } else {
      playSfx("click");
    }
  }

  return (
    <div className={`audio-toggle-wrap ${compact ? "is-compact" : ""}`}>
      <button
        type="button"
        className="audio-toggle-button"
        aria-label={audio.muted ? "Activer le son" : "Couper le son"}
        aria-pressed={audio.muted}
        onClick={() => {
          handleToggle();
        }}
      >
        <span aria-hidden="true">{audio.muted ? "🔇" : "🔊"}</span>
        {!compact && <span className="audio-toggle-label">{audio.muted ? "Muet" : "Son"}</span>}
      </button>
      <button
        type="button"
        className="audio-toggle-cog"
        aria-label="Réglages audio"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span aria-hidden="true">⚙︎</span>
      </button>
      {open && (
        <div className="audio-toggle-popover" role="dialog" aria-label="Volume audio">
          <label className="audio-toggle-slider">
            <span>Volume effets</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={audio.muted ? 0 : audio.volume}
              onChange={(event) => {
                const next = Number(event.target.value);
                audio.setVolume(next);
                if (next > 0 && audio.muted) audio.setMuted(false);
              }}
            />
            <span className="audio-toggle-volume-tick">{Math.round((audio.muted ? 0 : audio.volume) * 100)}%</span>
          </label>
          <button
            type="button"
            className="audio-toggle-test"
            onClick={() => {
              audio.prime();
              if (audio.muted) audio.setMuted(false);
              playSfx("validate");
            }}
          >
            Tester un son
          </button>
        </div>
      )}
    </div>
  );
}
