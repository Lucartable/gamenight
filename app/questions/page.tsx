"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { getSupabase } from "@/lib/supabase";
import { useProfile } from "@/lib/useProfile";
import { useSavedQuestions } from "@/lib/useSavedQuestions";
import type { GameType, QuestionPack, QuestionPackItem, SavedCustomQuestion } from "@/types/database";

const GAME_LABELS: Record<GameType, string> = {
  who_would: "Tu préfères",
  who_of_us: "Qui de nous ?",
  majority: "Majorité",
  minority: "Minorité",
  mime_expressions: "Mime les expressions",
  jauge: "Jauge",
};

const GAME_OPTIONS = Object.keys(GAME_LABELS) as GameType[];

export default function SavedQuestionsPage() {
  const profile = useProfile();
  const { savedQuestions, loading, refresh } = useSavedQuestions(null, profile.canManageQuestions);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [gameFilter, setGameFilter] = useState<GameType | "all">("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [packs, setPacks] = useState<QuestionPack[]>([]);
  const [packItems, setPackItems] = useState<QuestionPackItem[]>([]);
  const [packName, setPackName] = useState("");
  const [packGame, setPackGame] = useState<GameType | "all">("all");
  const [activePackId, setActivePackId] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const filteredQuestions = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();
    return savedQuestions.filter((question) => {
      const matchesGame = gameFilter === "all" || question.game_type === gameFilter;
      const matchesQuery =
        !cleanQuery ||
        question.question_text.toLowerCase().includes(cleanQuery) ||
        question.category.toLowerCase().includes(cleanQuery);
      return matchesGame && matchesQuery;
    });
  }, [gameFilter, query, savedQuestions]);

  const refreshPacks = useCallback(async () => {
    const supabase = getSupabase();
    const [{ data: nextPacks }, { data: nextItems }] = await Promise.all([
      supabase.from("question_packs").select("*").order("created_at", { ascending: false }),
      supabase.from("question_pack_items").select("*"),
    ]);
    setPacks((nextPacks as QuestionPack[] | null) ?? []);
    setPackItems((nextItems as QuestionPackItem[] | null) ?? []);
  }, []);

  useEffect(() => {
    if (!profile.canManageQuestions) {
      setPacks([]);
      setPackItems([]);
      return;
    }
    void refreshPacks();
  }, [profile.canManageQuestions, refreshPacks]);

  useEffect(() => {
    if (!activePackId && packs[0]) setActivePackId(packs[0].id);
  }, [activePackId, packs]);

  async function signIn(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setAuthMessage(null);
    const result = await profile.signInWithPassword(email, password);
    if (result) setError(result);
    else setAuthMessage("Connexion réussie.");
  }

  async function createPack(e: FormEvent) {
    e.preventDefault();
    if (!profile.userId || !packName.trim()) return;
    setError(null);
    const { error: insertError } = await getSupabase().from("question_packs").insert({
      owner_user_id: profile.userId,
      name: packName.trim(),
      game_type: packGame === "all" ? null : packGame,
    });
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setPackName("");
    await refreshPacks();
  }

  function startEdit(question: SavedCustomQuestion) {
    setEditingId(question.id);
    setEditText(question.question_text);
    setEditCategory(question.category);
  }

  async function saveEdit(questionId: string) {
    const text = editText.trim();
    const category = editCategory.trim() || "sauvegardees";
    if (!text) return;
    setBusyId(questionId);
    setError(null);
    const { error: updateError } = await getSupabase()
      .from("saved_custom_questions")
      .update({ question_text: text, category, updated_at: new Date().toISOString() })
      .eq("id", questionId);
    setBusyId(null);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setEditingId(null);
    await refresh();
  }

  async function deleteQuestion(questionId: string) {
    setBusyId(questionId);
    setError(null);
    const { error: deleteError } = await getSupabase().from("saved_custom_questions").delete().eq("id", questionId);
    setBusyId(null);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    await Promise.all([refresh(), refreshPacks()]);
  }

  async function addToPack(questionId: string) {
    if (!activePackId) return;
    setBusyId(questionId);
    setError(null);
    const position = packItems.filter((item) => item.pack_id === activePackId).length;
    const { error: upsertError } = await getSupabase()
      .from("question_pack_items")
      .upsert({ pack_id: activePackId, saved_question_id: questionId, position }, { onConflict: "pack_id,saved_question_id" });
    setBusyId(null);
    if (upsertError) {
      setError(upsertError.message);
      return;
    }
    await refreshPacks();
  }

  async function deletePack(packId: string) {
    setBusyId(packId);
    setError(null);
    const { error: deleteError } = await getSupabase().from("question_packs").delete().eq("id", packId);
    setBusyId(null);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    if (activePackId === packId) setActivePackId("");
    await refreshPacks();
  }

  return (
    <main className="game-stage min-h-dvh px-4 py-5 text-white">
      <div className="mx-auto max-w-5xl">
        <header className="game-topbar mb-5 rounded-[24px] border p-4 shadow-glow">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-black uppercase tracking-wider text-neon-yellow">Badaboum</div>
              <h1 className="mt-1 text-3xl font-black leading-tight md:text-5xl">Questions sauvegardées</h1>
              <p className="mt-2 max-w-2xl text-sm font-semibold text-white/60">
                Bibliothèque globale, triée par jeu, réservée aux rôles trusted et admin.
              </p>
            </div>
            <Link href="/" className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-sm font-black text-white/70 transition hover:scale-[1.02] hover:text-white">
              Accueil
            </Link>
          </div>
        </header>

        {profile.loading && <section className="card p-5 text-sm font-bold text-white/60">Chargement du profil...</section>}

        {!profile.loading && !profile.userId && (
          <section className="card mx-auto max-w-md p-5 animate-reveal-in">
            <div className="text-xs font-black uppercase tracking-wider text-neon-cyan">Supabase Auth</div>
            <h2 className="mt-2 text-2xl font-black">Connexion requise</h2>
            <p className="mt-2 text-sm font-semibold text-white/60">
              Les questions sauvegardées et les packs sont protégés par RLS.
            </p>
            <form onSubmit={signIn} className="mt-5 space-y-3">
              <input className="input" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="email@exemple.com" type="email" />
              <input className="input" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mot de passe" type="password" />
              <button className="btn-primary w-full" type="submit">Connexion admin</button>
            </form>
            {authMessage && <p className="mt-3 rounded-2xl border border-neon-green/30 bg-neon-green/10 p-3 text-sm font-bold text-neon-green">{authMessage}</p>}
            {error && <p className="mt-3 rounded-2xl border border-neon-pink/40 bg-neon-pink/10 p-3 text-sm font-bold text-neon-pink">{error}</p>}
          </section>
        )}

        {!profile.loading && profile.userId && !profile.canManageQuestions && (
          <section className="card mx-auto max-w-xl p-5 animate-reveal-in">
            <div className="text-xs font-black uppercase tracking-wider text-neon-pink">Rôle actuel : {profile.role}</div>
            <h2 className="mt-2 text-2xl font-black">Accès réservé</h2>
            <p className="mt-2 text-sm font-semibold text-white/60">
              Ton compte est connecté, mais la sauvegarde, la bibliothèque, la suppression et les packs demandent un rôle trusted ou admin.
            </p>
            <button onClick={() => void profile.signOut()} className="btn-ghost mt-5 w-full" type="button">Se déconnecter</button>
          </section>
        )}

        {!profile.loading && profile.canManageQuestions && (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
            <section className="space-y-4">
              <div className="card p-4 animate-reveal-in">
                <div className="flex flex-col gap-3 md:flex-row">
                  <input className="input md:flex-1" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher une question, catégorie..." />
                  <select className="input md:w-56" value={gameFilter} onChange={(event) => setGameFilter(event.target.value as GameType | "all")}>
                    <option value="all">Tous les jeux</option>
                    {GAME_OPTIONS.map((gameType) => (
                      <option key={gameType} value={gameType}>{GAME_LABELS[gameType]}</option>
                    ))}
                  </select>
                </div>
                <div className="mt-3 text-xs font-black uppercase tracking-wider text-white/45">
                  {loading ? "Synchronisation..." : `${filteredQuestions.length} question${filteredQuestions.length > 1 ? "s" : ""} visible${filteredQuestions.length > 1 ? "s" : ""}`}
                </div>
              </div>

              {error && <p className="rounded-2xl border border-neon-pink/40 bg-neon-pink/10 p-3 text-sm font-bold text-neon-pink">{error}</p>}

              <div className="grid gap-3">
                {filteredQuestions.map((question, index) => (
                  <article key={question.id} className="library-card p-4" style={{ animationDelay: `${Math.min(index, 10) * 34}ms` }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs font-black uppercase tracking-wider text-neon-cyan">{GAME_LABELS[question.game_type]}</div>
                        {editingId === question.id ? (
                          <div className="mt-3 space-y-3">
                            <textarea className="input min-h-28 resize-none" value={editText} onChange={(event) => setEditText(event.target.value)} />
                            <input className="input" value={editCategory} onChange={(event) => setEditCategory(event.target.value)} placeholder="Catégorie" />
                          </div>
                        ) : (
                          <>
                            <h2 className="mt-1 text-lg font-black leading-snug">{question.question_text}</h2>
                            <p className="mt-2 text-xs font-bold uppercase tracking-wider text-white/40">{question.category}</p>
                          </>
                        )}
                      </div>
                      <span className="rounded-2xl border border-white/10 bg-white/8 px-3 py-2 text-xs font-black text-white/55">
                        {question.source_game}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-2 sm:grid-cols-4">
                      {editingId === question.id ? (
                        <>
                          <button disabled={busyId === question.id} onClick={() => void saveEdit(question.id)} className="btn-primary sm:col-span-2" type="button">Valider</button>
                          <button onClick={() => setEditingId(null)} className="btn-ghost sm:col-span-2" type="button">Annuler</button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => void startEdit(question)} className="btn-ghost" type="button">Modifier</button>
                          <button disabled={!activePackId || busyId === question.id} onClick={() => void addToPack(question.id)} className="btn-ghost" type="button">Ajouter pack</button>
                          <button disabled={busyId === question.id} onClick={() => void deleteQuestion(question.id)} className="btn-danger sm:col-span-2" type="button">Supprimer</button>
                        </>
                      )}
                    </div>
                  </article>
                ))}

                {!loading && filteredQuestions.length === 0 && (
                  <section className="card p-6 text-center animate-reveal-in">
                    <h2 className="text-xl font-black">Bibliothèque vide</h2>
                    <p className="mt-2 text-sm font-semibold text-white/55">
                      Sauvegarde une question pendant un reveal pour la retrouver ici.
                    </p>
                  </section>
                )}
              </div>
            </section>

            <aside className="space-y-4">
              <section className="card p-4 animate-reveal-in">
                <div className="text-xs font-black uppercase tracking-wider text-neon-yellow">Packs</div>
                <h2 className="mt-1 text-2xl font-black">Créer un pack</h2>
                <form onSubmit={createPack} className="mt-4 space-y-3">
                  <input className="input" value={packName} onChange={(event) => setPackName(event.target.value)} placeholder="Nom du pack" />
                  <select className="input" value={packGame} onChange={(event) => setPackGame(event.target.value as GameType | "all")}>
                    <option value="all">Multi-jeux</option>
                    {GAME_OPTIONS.map((gameType) => (
                      <option key={gameType} value={gameType}>{GAME_LABELS[gameType]}</option>
                    ))}
                  </select>
                  <button className="btn-primary w-full" type="submit">Créer le pack</button>
                </form>
              </section>

              <section className="card p-4 animate-reveal-in">
                <div className="text-xs font-black uppercase tracking-wider text-neon-cyan">Pack actif</div>
                <select className="input mt-3" value={activePackId} onChange={(event) => setActivePackId(event.target.value)}>
                  <option value="">Aucun pack</option>
                  {packs.map((pack) => (
                    <option key={pack.id} value={pack.id}>
                      {pack.name} · {countPackItems(packItems, pack.id)}
                    </option>
                  ))}
                </select>
                <div className="mt-4 grid gap-2">
                  {packs.map((pack) => (
                    <div key={pack.id} className="rounded-2xl border border-white/10 bg-white/6 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-black">{pack.name}</div>
                          <div className="mt-1 text-xs font-bold text-white/45">
                            {pack.game_type ? GAME_LABELS[pack.game_type] : "Multi-jeux"} · {countPackItems(packItems, pack.id)} question{countPackItems(packItems, pack.id) > 1 ? "s" : ""}
                          </div>
                        </div>
                        <button disabled={busyId === pack.id} onClick={() => void deletePack(pack.id)} className="rounded-xl border border-neon-pink/30 bg-neon-pink/10 px-3 py-2 text-xs font-black text-neon-pink" type="button">
                          Suppr.
                        </button>
                      </div>
                    </div>
                  ))}
                  {packs.length === 0 && <p className="text-sm font-semibold text-white/50">Aucun pack pour le moment.</p>}
                </div>
              </section>

              <section className="card p-4 animate-reveal-in">
                <div className="text-xs font-black uppercase tracking-wider text-neon-green">Sécurité</div>
                <p className="mt-2 text-sm font-semibold text-white/55">
                  Connecté en {profile.role}. Les opérations sensibles sont aussi bloquées côté Supabase par RLS.
                </p>
                <button onClick={() => void profile.signOut()} className="btn-ghost mt-4 w-full" type="button">Se déconnecter</button>
              </section>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}

function countPackItems(items: QuestionPackItem[], packId: string) {
  return items.filter((item) => item.pack_id === packId).length;
}
