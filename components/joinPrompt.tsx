"use client";

import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { AvatarCustomizer } from "./avatarCustomizer";
import {
  createRandomAvatarConfig,
  normalizeAvatarConfig,
  type AvatarConfig,
} from "@/lib/avatar";
import { getOrCreateGuestSession, saveGuestSession } from "@/lib/guestSession";
import { getSupabase } from "@/lib/supabase";
import { playSfx, primeAudio } from "@/lib/audio";

interface JoinPromptProps {
  roomId: string;
  code: string;
  onJoined: () => Promise<void> | void;
}

export function JoinPrompt({ roomId, code, onJoined }: JoinPromptProps) {
  const [name, setName] = useState("");
  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig>(() => createRandomAvatarConfig("badaboum"));
  const [color, setColor] = useState("#ff3ea5");
  const [savedName, setSavedName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const guest = getOrCreateGuestSession();
    setName(guest.name);
    setSavedName(guest.name);
    setColor(guest.color);
    setAvatarConfig(
      normalizeAvatarConfig(
        {
          avatarStyle: guest.avatarStyle,
          avatarSeed: guest.avatarSeed,
          avatarOptions: guest.avatarOptions,
          avatarColor: guest.avatarColor,
        },
        guest.name
      )
    );
  }, []);

  const continueLabel = useMemo(() => {
    if (submitting) return "Connexion...";
    const trimmed = name.trim();
    if (!trimmed) return "Entre un pseudo pour rejoindre";
    if (trimmed === savedName) return `Continuer comme ${trimmed}`;
    return "Rejoindre la partie";
  }, [name, savedName, submitting]);

  async function handleJoin() {
    setError(null);
    if (!name.trim()) {
      setError("Choisis un pseudo avant de rejoindre.");
      return;
    }
    setSubmitting(true);
    primeAudio();
    playSfx("validate");
    try {
      const guest = saveGuestSession({
        name,
        color,
        avatarStyle: avatarConfig.avatarStyle,
        avatarSeed: avatarConfig.avatarSeed,
        avatarOptions: avatarConfig.avatarOptions,
        avatarColor: avatarConfig.avatarColor,
      });
      setName(guest.name);
      setSavedName(guest.name);
      const supabase = getSupabase();
      const { data: userData } = await supabase.auth.getUser();
      const userId = (userData.user as User | null)?.id ?? null;
      const { error: pErr } = await supabase
        .from("players")
        .upsert(
          {
            room_id: roomId,
            client_id: guest.guestId,
            guest_id: guest.guestId,
            auth_user_id: userId,
            name: guest.name,
            avatar: guest.avatar,
            color: guest.color,
            avatar_style: guest.avatarStyle,
            avatar_seed: guest.avatarSeed,
            avatar_options: guest.avatarOptions,
            avatar_color: guest.avatarColor,
            is_host: false,
            last_seen_at: new Date().toISOString(),
          },
          { onConflict: "room_id,client_id" }
        );
      if (pErr) throw pErr;
      await onJoined();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de connexion à la salle.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="game-stage mx-auto flex min-h-dvh max-w-md flex-col px-5 py-8 text-white">
      <section className="card animate-reveal-in p-5">
        <div className="text-center">
          <div className="text-xs font-black uppercase tracking-[0.24em] text-neon-cyan">
            Rejoindre
          </div>
          <div className="mt-2 select-all bg-gradient-to-r from-neon-pink via-neon-purple to-neon-cyan bg-clip-text text-4xl font-black tracking-[0.18em] text-transparent">
            {code}
          </div>
          <p className="mx-auto mt-3 max-w-xs text-sm font-semibold text-white/65">
            Entre ton pseudo et ton avatar, puis valide pour rejoindre la partie.
          </p>
        </div>

        <div className="mt-5 rounded-3xl border border-white/10 bg-white/5 p-3">
          <input
            className="input mb-3"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ton pseudo"
            maxLength={24}
            autoFocus
          />
          <AvatarCustomizer
            name={name || "Joueur"}
            config={avatarConfig}
            onChange={(next) => {
              setAvatarConfig(next);
              setColor(next.avatarColor);
            }}
            onColorChange={setColor}
          />
        </div>

        {error && (
          <p className="mt-4 rounded-2xl border border-neon-pink/40 bg-neon-pink/10 p-3 text-center text-sm font-bold text-neon-pink">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={() => void handleJoin()}
          disabled={submitting || !name.trim()}
          className="btn-primary mt-5 w-full"
        >
          {continueLabel}
        </button>

        <a href="/" className="btn-ghost mt-3 block w-full text-center">
          Annuler
        </a>
      </section>
    </main>
  );
}
