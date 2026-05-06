"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import {
  generateRoomCode,
  getOrCreateClientId,
  normalizeRoomCode,
} from "@/lib/utils";

type Mode = "menu" | "create" | "join";

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
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center px-5 py-10">
      <header className="mb-10 text-center">
        <h1 className="bg-gradient-to-r from-neon-pink via-neon-purple to-neon-cyan bg-clip-text text-5xl font-black tracking-tight text-transparent">
          GameNight
        </h1>
        <p className="mt-3 text-white/60">Jeux de soirée à jouer ensemble depuis ton tel.</p>
      </header>

      {mode === "menu" && (
        <div className="w-full space-y-4">
          <button onClick={() => setMode("create")} className="btn-primary w-full">
            Créer une salle
          </button>
          <button onClick={() => setMode("join")} className="btn-secondary w-full">
            Rejoindre une salle
          </button>

          <div className="card mt-8 p-5 text-sm text-white/70">
            <div className="mb-3 font-semibold text-white">Jeux disponibles</div>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-base font-bold text-white">Tu préfères</div>
                  <div className="text-white/50">Choisis entre deux options.</div>
                </div>
                <div className="chip">2+ joueurs</div>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-base font-bold text-white">Qui de nous ?</div>
                  <div className="text-white/50">Désigne quelqu'un du groupe.</div>
                </div>
                <div className="chip">Nouveau</div>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-base font-bold text-white">Majorité</div>
                  <div className="text-white/50">Prédit la réponse du groupe.</div>
                </div>
                <div className="chip">Party</div>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-base font-bold text-white">Minorité</div>
                  <div className="text-white/50">Marque avec les choix rares.</div>
                </div>
                <div className="chip">Stratégie</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {mode === "create" && (
        <form onSubmit={handleCreate} className="w-full space-y-4">
          <h2 className="text-xl font-bold">Ton prénom</h2>
          <input
            autoFocus
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex : Léa"
            maxLength={20}
          />
          {error && <p className="text-neon-pink">{error}</p>}
          <button disabled={loading} className="btn-primary w-full" type="submit">
            {loading ? "Création..." : "Créer la salle"}
          </button>
          <button type="button" onClick={() => setMode("menu")} className="btn-ghost w-full">
            ← Retour
          </button>
        </form>
      )}

      {mode === "join" && (
        <form onSubmit={handleJoin} className="w-full space-y-4">
          <h2 className="text-xl font-bold">Rejoindre une salle</h2>
          <input
            autoFocus
            className="input uppercase tracking-widest"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="CODE (ex : LOUP-42)"
            maxLength={10}
          />
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ton prénom"
            maxLength={20}
          />
          {error && <p className="text-neon-pink">{error}</p>}
          <button disabled={loading} className="btn-primary w-full" type="submit">
            {loading ? "On rejoint..." : "Rejoindre"}
          </button>
          <button type="button" onClick={() => setMode("menu")} className="btn-ghost w-full">
            ← Retour
          </button>
        </form>
      )}
    </main>
  );
}
