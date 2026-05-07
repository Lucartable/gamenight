"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import {
  generateRoomCode,
  getOrCreateClientId,
  normalizeRoomCode,
} from "@/lib/utils";

type Mode = "menu" | "create" | "join";

const GAME_TEASERS = [
  { title: "Tu préfères", detail: "Choix rapides, débats immédiats.", tag: "Duel" },
  { title: "Qui de nous ?", detail: "Accusations sociales en douceur.", tag: "Social" },
  { title: "Majorité", detail: "Lis le groupe, marque des points.", tag: "Mindgame" },
  { title: "Minorité", detail: "Sois rare, mais pas seul dans le vide.", tag: "Chaos" },
  { title: "Mime les expressions", detail: "Un ordre auto, des grands gestes.", tag: "Show" },
];

export default function HomePage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("menu");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Entre ton prénom.");
      return;
    }
    setLoading(true);
    try {
      const supabase = getSupabase();
      const clientId = getOrCreateClientId();

      // On retente quelques fois en cas de collision de code (très rare).
      let roomId: string | null = null;
      let roomCode = "";
      for (let i = 0; i < 5 && !roomId; i++) {
        roomCode = generateRoomCode();
        const { data, error } = await supabase
          .from("rooms")
          .insert({ code: roomCode, host_client_id: clientId, status: "lobby" })
          .select("id")
          .single();
        if (!error && data) roomId = data.id;
      }
      if (!roomId) throw new Error("Impossible de créer la salle. Réessaie.");

      const { error: pErr } = await supabase.from("players").insert({
        room_id: roomId,
        client_id: clientId,
        name: trimmed,
        is_host: true,
      });
      if (pErr) throw pErr;

      router.push(`/host/${roomCode}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue.");
      setLoading(false);
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmedName = name.trim();
    const cleanCode = normalizeRoomCode(code);
    if (!trimmedName) return setError("Entre ton prénom.");
    if (!cleanCode) return setError("Entre un code de salle.");

    setLoading(true);
    try {
      const supabase = getSupabase();
      const clientId = getOrCreateClientId();

      const { data: room, error: rErr } = await supabase
        .from("rooms")
        .select("id, status")
        .eq("code", cleanCode)
        .maybeSingle();

      if (rErr) throw rErr;
      if (!room) throw new Error("Aucune salle trouvée avec ce code.");
      // upsert : si on rejoint deux fois (refresh), on met juste à jour le nom.
      const { error: pErr } = await supabase
        .from("players")
        .upsert(
          {
            room_id: room.id,
            client_id: clientId,
            name: trimmedName,
            is_host: false,
          },
          { onConflict: "room_id,client_id" }
        );
      if (pErr) throw pErr;

      router.push(`/play/${cleanCode}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue.");
      setLoading(false);
    }
  }

  return (
    <main className="home-stage min-h-dvh px-5 py-6 text-white">
      <div className="home-grid" aria-hidden="true" />
      <div className="relative z-10 mx-auto flex min-h-[calc(100dvh-3rem)] max-w-md flex-col">
        <header className="home-hero pt-6 text-center">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-[28px] border border-neon-yellow/40 bg-neon-yellow/10 shadow-glow">
            <span className="home-burst-mark">B</span>
          </div>
          <div className="text-xs font-black uppercase tracking-wider text-neon-cyan">party games calibrés soirée</div>
          <h1 className="home-brand mt-2 text-6xl font-black leading-none">Badaboum</h1>
          <p className="mx-auto mt-4 max-w-xs text-sm font-semibold text-white/65">
            Votes, mimes, accusations amicales et bilans de fin qui restent dans les mémoires.
          </p>
        </header>

        {mode === "menu" && (
          <div className="mt-8 flex flex-1 flex-col">
            <section className="home-action-panel p-3">
              <button
                type="button"
                onClick={() => setMode("create")}
                className="home-primary-action w-full"
              >
                <span>Créer une salle</span>
                <span className="home-action-key">HOST</span>
              </button>
              <button
                type="button"
                onClick={() => setMode("join")}
                className="home-secondary-action mt-3 w-full"
              >
                <span>Rejoindre</span>
                <span className="home-action-key">CODE</span>
              </button>
            </section>

            <section className="mt-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-black uppercase tracking-wider text-white/50">Modes prêts</h2>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-white/55">
                  mobile first
                </span>
              </div>
              <div className="grid gap-2">
                {GAME_TEASERS.map((game, index) => (
                  <article key={game.title} className="home-game-row" style={{ animationDelay: `${index * 70}ms` }}>
                    <div className="min-w-0">
                      <div className="truncate text-base font-black">{game.title}</div>
                      <div className="mt-0.5 truncate text-xs font-medium text-white/50">{game.detail}</div>
                    </div>
                    <span className="home-game-tag">{game.tag}</span>
                  </article>
                ))}
              </div>
            </section>
          </div>
        )}

        {mode === "create" && (
          <HomeFormShell title="Créer une salle" subtitle="Lance Badaboum et invite la table.">
            <form onSubmit={handleCreate} className="space-y-4">
              <input
                autoFocus
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ton prénom"
                maxLength={20}
              />
              {error && <p className="rounded-2xl border border-neon-pink/40 bg-neon-pink/10 p-3 text-sm font-bold text-neon-pink">{error}</p>}
              <button disabled={loading} className="btn-primary w-full" type="submit">
                {loading ? "Création..." : "Créer la salle"}
              </button>
              <button type="button" onClick={() => setMode("menu")} className="btn-ghost w-full">
                Retour
              </button>
            </form>
          </HomeFormShell>
        )}

        {mode === "join" && (
          <HomeFormShell title="Rejoindre" subtitle="Entre le code de la salle et ton prénom.">
            <form onSubmit={handleJoin} className="space-y-4">
              <input
                autoFocus
                className="input uppercase tracking-widest"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="CODE"
                maxLength={10}
              />
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ton prénom"
                maxLength={20}
              />
              {error && <p className="rounded-2xl border border-neon-pink/40 bg-neon-pink/10 p-3 text-sm font-bold text-neon-pink">{error}</p>}
              <button disabled={loading} className="btn-primary w-full" type="submit">
                {loading ? "Connexion..." : "Rejoindre la salle"}
              </button>
              <button type="button" onClick={() => setMode("menu")} className="btn-ghost w-full">
                Retour
              </button>
            </form>
          </HomeFormShell>
        )}
      </div>
    </main>
  );
}

function HomeFormShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section className="home-action-panel mt-8 p-5 animate-reveal-in">
      <div className="mb-5">
        <div className="text-xs font-black uppercase tracking-wider text-neon-yellow">Badaboum</div>
        <h2 className="mt-1 text-3xl font-black">{title}</h2>
        <p className="mt-2 text-sm font-medium text-white/55">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}
