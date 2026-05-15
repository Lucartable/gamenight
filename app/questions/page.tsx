"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { AdminStatusBar } from "@/components/adminStatus";
import { Button, Card, Chip, Input, Section } from "@/components/ui";
import { getSupabase } from "@/lib/supabase";
import { useProfile } from "@/lib/useProfile";
import { useSavedQuestions } from "@/lib/useSavedQuestions";
import { generateLocalQuestionId } from "@/lib/questionPoolTransform";
import type { GameType, QuestionPack, QuestionPackItem, SavedCustomQuestion } from "@/types/database";

const GAME_LABELS: Record<GameType, string> = {
  who_would: "Tu préfères",
  who_of_us: "Qui de nous ?",
  majority: "Majorité",
  minority: "Minorité",
  mime_expressions: "Mime les expressions",
  jauge: "Jauge",
  intrus: "L'Intrus",
};

const GAME_OPTIONS = Object.keys(GAME_LABELS) as GameType[];
const QUESTION_ENGINE_GAME_OPTIONS = GAME_OPTIONS.filter((gameType) => gameType !== "intrus");

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
  const [editPayloadOptions, setEditPayloadOptions] = useState("");
  const [packs, setPacks] = useState<QuestionPack[]>([]);
  const [packItems, setPackItems] = useState<QuestionPackItem[]>([]);
  const [packName, setPackName] = useState("");
  const [packDescription, setPackDescription] = useState("");
  const [packGame, setPackGame] = useState<GameType | "all">("all");
  const [activePackId, setActivePackId] = useState("");
  const [editingPackId, setEditingPackId] = useState<string | null>(null);
  const [editPackName, setEditPackName] = useState("");
  const [editPackDescription, setEditPackDescription] = useState("");
  const [editPackGame, setEditPackGame] = useState<GameType | "all">("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showCreateQuestion, setShowCreateQuestion] = useState(false);
  const [newGameType, setNewGameType] = useState<GameType>("who_of_us");
  const [newQuestionText, setNewQuestionText] = useState("");
  const [newQuestionCategory, setNewQuestionCategory] = useState("sauvegardees");
  const [newQuestionOptions, setNewQuestionOptions] = useState("");
  const [newQuestionPackId, setNewQuestionPackId] = useState("");
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(() => new Set());
  const [bulkCategory, setBulkCategory] = useState("");

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
  const activePack = useMemo(() => packs.find((pack) => pack.id === activePackId) ?? null, [activePackId, packs]);
  const activePackQuestionIds = useMemo(
    () => new Set(packItems.filter((item) => item.pack_id === activePackId).map((item) => item.saved_question_id)),
    [activePackId, packItems]
  );
  const activePackQuestions = useMemo(
    () => savedQuestions.filter((question) => activePackQuestionIds.has(question.id)),
    [activePackQuestionIds, savedQuestions]
  );
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
      description: packDescription.trim() || null,
      game_type: packGame === "all" ? null : packGame,
    });
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setPackName("");
    setPackDescription("");
    await refreshPacks();
  }

  async function createQuestion(e: FormEvent) {
    e.preventDefault();
    if (!profile.userId) return;
    setError(null);
    const category = newQuestionCategory.trim() || "sauvegardees";
    const payload = buildPayloadForGame(newGameType, newQuestionOptions);
    const text = newQuestionText.trim() || payloadToFallbackText(newGameType, payload);
    if (!payload || text.length < 4) {
      setError("Question incomplète ou options invalides pour ce jeu.");
      return;
    }

    setBusyId("new-question");
    const { data: insertedQuestion, error: insertError } = await getSupabase().from("saved_custom_questions").insert({
      host_user_id: profile.userId,
      game_type: newGameType,
      local_question_id: generateLocalQuestionId("saved"),
      question_text: text,
      category,
      payload,
      source_game: newGameType,
      original_author_id: null,
      original_room_id: null,
    }).select("id").single();
    setBusyId(null);
    if (insertError) {
      setError(insertError.message);
      return;
    }

    const insertedQuestionId = typeof insertedQuestion?.id === "string" ? insertedQuestion.id : null;
    if (newQuestionPackId && insertedQuestionId) {
      const position = packItems.filter((item) => item.pack_id === newQuestionPackId).length;
      const { error: packInsertError } = await getSupabase()
        .from("question_pack_items")
        .upsert({ pack_id: newQuestionPackId, saved_question_id: insertedQuestionId, position }, { onConflict: "pack_id,saved_question_id" });
      if (packInsertError) {
        setError(packInsertError.message);
        await refresh();
        return;
      }
    }

    setNewQuestionText("");
    setNewQuestionOptions("");
    setNewQuestionCategory("sauvegardees");
    setNewQuestionPackId("");
    setShowCreateQuestion(false);
    await Promise.all([refresh(), refreshPacks()]);
  }

  function startEdit(question: SavedCustomQuestion) {
    setEditingId(question.id);
    setEditText(question.question_text);
    setEditCategory(question.category);
    setEditPayloadOptions(payloadOptionsToText(question));
  }

  async function saveEdit(question: SavedCustomQuestion) {
    const text = editText.trim();
    const category = editCategory.trim() || "sauvegardees";
    if (!text) return;
    const payload = buildEditedPayload(question, editPayloadOptions);
    if (!payload) {
      setError("Options invalides pour ce jeu.");
      return;
    }
    setBusyId(question.id);
    setError(null);
    const { error: updateError } = await getSupabase()
      .from("saved_custom_questions")
      .update({ question_text: text, category, payload, updated_at: new Date().toISOString() })
      .eq("id", question.id);
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

  async function duplicateQuestion(question: SavedCustomQuestion) {
    if (!profile.userId) return;
    setBusyId(question.id);
    setError(null);
    const { error: insertError } = await getSupabase().from("saved_custom_questions").insert({
      host_user_id: profile.userId,
      game_type: question.game_type,
      local_question_id: generateLocalQuestionId("saved"),
      question_text: `${question.question_text} (copie)`,
      category: question.category,
      payload: question.payload,
      source_game: question.source_game,
      original_author_id: question.original_author_id,
      original_room_id: question.original_room_id,
    });
    setBusyId(null);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    await refresh();
  }

  async function toggleQuestionActive(question: SavedCustomQuestion) {
    const active = questionIsActive(question);
    setBusyId(question.id);
    setError(null);
    const { error: updateError } = await getSupabase()
      .from("saved_custom_questions")
      .update({
        payload: { ...question.payload, active: !active },
        updated_at: new Date().toISOString(),
      })
      .eq("id", question.id);
    setBusyId(null);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    await refresh();
  }

  function toggleSelectedQuestion(questionId: string) {
    setSelectedQuestionIds((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
  }

  async function deleteSelectedQuestions() {
    const ids = [...selectedQuestionIds];
    if (!ids.length) return;
    if (!confirm(`Supprimer ${ids.length} question${ids.length > 1 ? "s" : ""} de la bibliothèque ?`)) return;
    setBusyId("bulk-delete");
    setError(null);
    const { error: deleteError } = await getSupabase().from("saved_custom_questions").delete().in("id", ids);
    setBusyId(null);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setSelectedQuestionIds(new Set());
    await Promise.all([refresh(), refreshPacks()]);
  }

  async function addSelectedToPack() {
    if (!activePackId || selectedQuestionIds.size === 0) return;
    const existingCount = packItems.filter((item) => item.pack_id === activePackId).length;
    const rows = [...selectedQuestionIds].map((questionId, index) => ({
      pack_id: activePackId,
      saved_question_id: questionId,
      position: existingCount + index,
    }));
    setBusyId("bulk-pack");
    setError(null);
    const { error: upsertError } = await getSupabase()
      .from("question_pack_items")
      .upsert(rows, { onConflict: "pack_id,saved_question_id" });
    setBusyId(null);
    if (upsertError) {
      setError(upsertError.message);
      return;
    }
    await refreshPacks();
  }

  async function removeSelectedFromPack() {
    if (!activePackId || selectedQuestionIds.size === 0) return;
    setBusyId("bulk-remove-pack");
    setError(null);
    const { error: deleteError } = await getSupabase()
      .from("question_pack_items")
      .delete()
      .eq("pack_id", activePackId)
      .in("saved_question_id", [...selectedQuestionIds]);
    setBusyId(null);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    await refreshPacks();
  }

  async function updateSelectedCategory() {
    const category = bulkCategory.trim();
    if (!category || selectedQuestionIds.size === 0) return;
    setBusyId("bulk-category");
    setError(null);
    const { error: updateError } = await getSupabase()
      .from("saved_custom_questions")
      .update({ category, updated_at: new Date().toISOString() })
      .in("id", [...selectedQuestionIds]);
    setBusyId(null);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setBulkCategory("");
    await refresh();
  }

  function exportSelectedQuestions() {
    const ids = new Set(selectedQuestionIds);
    const rows = savedQuestions.filter((question) => ids.has(question.id));
    if (!rows.length) return;
    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = `badaboum-questions-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(href);
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

  async function removeFromPack(questionId: string) {
    if (!activePackId) return;
    setBusyId(questionId);
    setError(null);
    const { error: deleteError } = await getSupabase()
      .from("question_pack_items")
      .delete()
      .eq("pack_id", activePackId)
      .eq("saved_question_id", questionId);
    setBusyId(null);
    if (deleteError) {
      setError(deleteError.message);
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

  function startPackEdit(pack: QuestionPack) {
    setEditingPackId(pack.id);
    setEditPackName(pack.name);
    setEditPackDescription(pack.description ?? "");
    setEditPackGame(pack.game_type ?? "all");
  }

  async function savePackEdit() {
    if (!editingPackId || !editPackName.trim()) return;
    setBusyId(editingPackId);
    setError(null);
    const { error: updateError } = await getSupabase()
      .from("question_packs")
      .update({
        name: editPackName.trim(),
        description: editPackDescription.trim() || null,
        game_type: editPackGame === "all" ? null : editPackGame,
        updated_at: new Date().toISOString(),
      })
      .eq("id", editingPackId);
    setBusyId(null);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setEditingPackId(null);
    await refreshPacks();
  }

  async function duplicatePack(pack: QuestionPack) {
    if (!profile.userId) return;
    setBusyId(`duplicate-pack-${pack.id}`);
    setError(null);
    const { data: insertedPack, error: insertError } = await getSupabase()
      .from("question_packs")
      .insert({
        owner_user_id: profile.userId,
        name: `${pack.name} (copie)`,
        description: pack.description,
        game_type: pack.game_type,
      })
      .select("id")
      .single();
    if (insertError) {
      setBusyId(null);
      setError(insertError.message);
      return;
    }
    const newPackId = typeof insertedPack?.id === "string" ? insertedPack.id : null;
    if (newPackId) {
      const rows = packItems
        .filter((item) => item.pack_id === pack.id)
        .map((item) => ({
          pack_id: newPackId,
          saved_question_id: item.saved_question_id,
          position: item.position,
        }));
      if (rows.length) {
        const { error: copyError } = await getSupabase().from("question_pack_items").insert(rows);
        if (copyError) {
          setBusyId(null);
          setError(copyError.message);
          return;
        }
      }
      setActivePackId(newPackId);
    }
    setBusyId(null);
    await refreshPacks();
  }

  const gameFilterChips: Array<{ value: GameType | "all"; label: string; tone: "neutral" | "pink" | "cyan" | "yellow" | "green" | "purple" }> = [
    { value: "all", label: "Tous", tone: "neutral" },
    { value: "who_would", label: "Tu préfères", tone: "pink" },
    { value: "who_of_us", label: "Qui de nous ?", tone: "cyan" },
    { value: "majority", label: "Majorité", tone: "yellow" },
    { value: "minority", label: "Minorité", tone: "pink" },
    { value: "mime_expressions", label: "Mime", tone: "cyan" },
    { value: "jauge", label: "Jauge", tone: "yellow" },
    { value: "intrus", label: "L'Intrus", tone: "purple" },
  ];

  return (
    <main className="game-stage min-h-dvh px-4 pb-8 pt-3 text-white sm:px-5 sm:pt-5 safe-area-pb">
      <div className="mx-auto max-w-5xl space-y-5">
        <AdminStatusBar
          userEmail={profile.userEmail}
          role={profile.role}
          canManageQuestions={profile.canManageQuestions}
          loading={profile.loading}
          onSignOut={() => void profile.signOut()}
        />

        <Card variant="hero" padding="lg" className="animate-slideUp">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <Chip tone="yellow" size="sm">Badaboum · admin</Chip>
              <h1 className="text-brand mt-3 text-3xl font-black leading-none sm:text-5xl">Bibliothèque</h1>
              <p className="mt-2 max-w-2xl text-sm font-semibold text-white/65">
                Questions sauvegardées et packs. Synchronisé, filtrable, multi-jeu.
              </p>
            </div>
            <Link
              href="/"
              className="focus-ring inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-4 py-2 text-xs font-black uppercase tracking-wider text-white/80 transition hover:bg-white/14"
            >
              ← Accueil
            </Link>
            {profile.canManageQuestions && (
              <Button type="button" variant="primary" size="md" onClick={() => setShowCreateQuestion((value) => !value)} leading="+">
                Ajouter une question
              </Button>
            )}
          </div>
        </Card>

        {profile.loading && (
          <Card padding="md" className="text-sm font-bold text-white/60">
            Chargement du profil…
          </Card>
        )}

        {!profile.loading && !profile.userId && (
          <Card variant="default" padding="lg" className="mx-auto max-w-md animate-slideUp">
            <Chip tone="cyan" size="sm">Supabase Auth</Chip>
            <h2 className="mt-2 text-2xl font-black">Connexion requise</h2>
            <p className="mt-2 text-sm font-semibold text-white/60">
              Les questions sauvegardées et les packs sont protégés par RLS.
            </p>
            <form onSubmit={signIn} className="mt-5 space-y-3">
              <Input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="email@exemple.com" type="email" />
              <Input value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mot de passe" type="password" />
              <Button type="submit" variant="primary" size="lg" fullWidth>Connexion admin</Button>
            </form>
            {authMessage && (
              <p className="mt-3 rounded-2xl border border-neon-green/30 bg-neon-green/10 p-3 text-sm font-bold text-neon-green">
                {authMessage}
              </p>
            )}
            {error && (
              <p className="mt-3 rounded-2xl border border-neon-pink/40 bg-neon-pink/10 p-3 text-sm font-bold text-neon-pink">
                {error}
              </p>
            )}
          </Card>
        )}

        {!profile.loading && profile.userId && !profile.canManageQuestions && (
          <Card variant="default" padding="lg" className="mx-auto max-w-xl animate-slideUp">
            <Chip tone="pink" size="sm">Rôle actuel : {profile.role}</Chip>
            <h2 className="mt-2 text-2xl font-black">Accès réservé</h2>
            <p className="mt-2 text-sm font-semibold text-white/60">
              Ton compte est connecté, mais la sauvegarde, la suppression et les packs demandent un rôle trusted ou admin.
            </p>
            <Button onClick={() => void profile.signOut()} variant="ghost" size="md" fullWidth className="mt-5">
              Se déconnecter
            </Button>
          </Card>
        )}

        {!profile.loading && profile.canManageQuestions && (
          <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(300px,380px)]">
            <section className="min-w-0 space-y-4">
              {showCreateQuestion && (
                <Card padding="lg" className="animate-slideUp">
                  <Section eyebrow="Nouvelle question" title="Ajouter à la bibliothèque" spacing="tight">
                    <form onSubmit={createQuestion} className="mt-4 grid gap-3">
                      <select
                        className="input"
                        value={newGameType}
                        onChange={(event) => {
                          setNewGameType(event.target.value as GameType);
                          setNewQuestionOptions("");
                        }}
                      >
                        {QUESTION_ENGINE_GAME_OPTIONS.map((gameType) => (
                          <option key={gameType} value={gameType}>{GAME_LABELS[gameType]}</option>
                        ))}
                      </select>
                      <p className="text-xs font-semibold text-white/45">
                        L&apos;Intrus utilise pour l&apos;instant sa banque de paires dédiée, séparée de cette bibliothèque de questions.
                      </p>
                      <textarea
                        className="input min-h-24 resize-none"
                        value={newQuestionText}
                        onChange={(event) => setNewQuestionText(event.target.value)}
                        placeholder={newGameType === "who_would" ? "Question / contexte (optionnel)" : "Texte de la question"}
                      />
                      <Input
                        value={newQuestionCategory}
                        onChange={(event) => setNewQuestionCategory(event.target.value)}
                        placeholder="Catégorie"
                      />
                      <select
                        className="input"
                        value={newQuestionPackId}
                        onChange={(event) => setNewQuestionPackId(event.target.value)}
                      >
                        <option value="">Ne pas ajouter à un pack</option>
                        {packs.map((pack) => (
                          <option key={pack.id} value={pack.id}>
                            Ajouter à : {pack.name}
                          </option>
                        ))}
                      </select>
                      {questionNeedsOptions(newGameType) && (
                        <textarea
                          className="input min-h-24 resize-none"
                          value={newQuestionOptions}
                          onChange={(event) => setNewQuestionOptions(event.target.value)}
                          placeholder={newGameType === "who_would" ? "Option A\nOption B" : "Options, une par ligne (2 à 8)"}
                        />
                      )}
                      <div className="flex flex-wrap gap-2">
                        <Button type="submit" variant="primary" disabled={busyId === "new-question"}>
                          Créer
                        </Button>
                        <Button type="button" variant="ghost" onClick={() => setShowCreateQuestion(false)}>
                          Annuler
                        </Button>
                      </div>
                    </form>
                  </Section>
                </Card>
              )}

              <Card padding="md" className="animate-slideUp">
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Rechercher une question, catégorie…"
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  {gameFilterChips.map((chip) => {
                    const active = gameFilter === chip.value;
                    return (
                      <button
                        key={chip.value}
                        type="button"
                        onClick={() => setGameFilter(chip.value)}
                        className={`focus-ring rounded-full border px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.1em] transition ${
                          active
                            ? "border-white/30 bg-white/10 text-white shadow-glow-cyan"
                            : "border-white/8 bg-white/4 text-white/55 hover:border-white/16 hover:text-white"
                        }`}
                      >
                        {chip.label}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 text-[10px] font-black uppercase tracking-[0.2em] text-white/45">
                  {loading
                    ? "Synchronisation…"
                    : `${filteredQuestions.length} question${filteredQuestions.length > 1 ? "s" : ""} visible${filteredQuestions.length > 1 ? "s" : ""}`}
                </div>
              </Card>

              {error && (
                <p className="rounded-2xl border border-neon-pink/40 bg-neon-pink/10 p-3 text-sm font-bold text-neon-pink">
                  {error}
                </p>
              )}

              {selectedQuestionIds.size > 0 && (
                <Card padding="md" className="sticky top-3 z-20 animate-slideUp border-neon-cyan/35 bg-neon-cyan/10">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="text-sm font-black">
                      {selectedQuestionIds.size} sélectionnée{selectedQuestionIds.size > 1 ? "s" : ""}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="secondary" size="sm" disabled={!activePackId || busyId === "bulk-pack"} onClick={() => void addSelectedToPack()}>
                        Ajouter au pack actif
                      </Button>
                      <Button variant="ghost" size="sm" disabled={!activePackId || busyId === "bulk-remove-pack"} onClick={() => void removeSelectedFromPack()}>
                        Retirer du pack actif
                      </Button>
                      <div className="flex min-w-48 flex-1 gap-2">
                        <Input
                          value={bulkCategory}
                          onChange={(event) => setBulkCategory(event.target.value)}
                          placeholder="Nouvelle catégorie"
                          className="min-w-0"
                        />
                        <Button variant="secondary" size="sm" disabled={!bulkCategory.trim() || busyId === "bulk-category"} onClick={() => void updateSelectedCategory()}>
                          Appliquer
                        </Button>
                      </div>
                      <Button variant="ghost" size="sm" onClick={exportSelectedQuestions}>
                        Export JSON
                      </Button>
                      <Button variant="danger" size="sm" disabled={busyId === "bulk-delete"} onClick={() => void deleteSelectedQuestions()}>
                        Supprimer
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedQuestionIds(new Set())}>
                        Annuler
                      </Button>
                    </div>
                  </div>
                </Card>
              )}

              <div className="grid gap-3">
                {filteredQuestions.map((question, index) => (
                  <Card
                    key={question.id}
                    padding="md"
                    className="library-card max-w-full overflow-hidden animate-slideUp"
                    style={{ animationDelay: `${Math.min(index, 10) * 30}ms` }}
                  >
                    <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
                      <label className="mt-1 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-white/45">
                        <input
                          type="checkbox"
                          checked={selectedQuestionIds.has(question.id)}
                          onChange={() => toggleSelectedQuestion(question.id)}
                          className="accent-cyan-400"
                        />
                        Select
                      </label>
                      <div className="min-w-0 flex-1">
                        <Chip tone="cyan" size="sm">{GAME_LABELS[question.game_type]}</Chip>
                        {editingId === question.id ? (
                          <div className="mt-3 space-y-3">
                            <textarea
                              className="input min-h-28 resize-none"
                              value={editText}
                              onChange={(event) => setEditText(event.target.value)}
                            />
                            <Input
                              value={editCategory}
                              onChange={(event) => setEditCategory(event.target.value)}
                              placeholder="Catégorie"
                            />
                            {questionHasEditablePayload(question) && (
                              <textarea
                                className="input min-h-24 resize-none"
                                value={editPayloadOptions}
                                onChange={(event) => setEditPayloadOptions(event.target.value)}
                                placeholder={question.game_type === "who_would" ? "Option A\nOption B" : "Options, une par ligne"}
                              />
                            )}
                          </div>
                        ) : (
                          <>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <h2 className="min-w-0 flex-1 break-words text-base font-black leading-snug sm:text-lg">{question.question_text}</h2>
                              {!questionIsActive(question) && <Chip tone="pink" size="sm">Inactive</Chip>}
                            </div>
                            <p className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/40">
                              {question.category}
                            </p>
                          </>
                        )}
                      </div>
                      <Chip tone="neutral" size="sm">{question.source_game}</Chip>
                    </div>

                    <div className="mt-4 flex w-full flex-wrap gap-2">
                      {editingId === question.id ? (
                        <>
                          <Button
                            variant="primary"
                            size="md"
                            disabled={busyId === question.id}
                            onClick={() => void saveEdit(question)}
                          >
                            Valider
                          </Button>
                          <Button variant="ghost" size="md" onClick={() => setEditingId(null)}>
                            Annuler
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button variant="secondary" size="sm" onClick={() => startEdit(question)}>
                            Modifier
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={busyId === question.id}
                            onClick={() => void duplicateQuestion(question)}
                          >
                            Dupliquer
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={busyId === question.id}
                            onClick={() => void toggleQuestionActive(question)}
                          >
                            {questionIsActive(question) ? "Désactiver" : "Activer"}
                          </Button>
                          {activePackQuestionIds.has(question.id) ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={!activePackId || busyId === question.id}
                              onClick={() => void removeFromPack(question.id)}
                            >
                              Retirer du pack
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={!activePackId || busyId === question.id}
                              onClick={() => void addToPack(question.id)}
                            >
                              + Pack actif
                            </Button>
                          )}
                          <Button
                            variant="danger"
                            size="sm"
                            disabled={busyId === question.id}
                            onClick={() => void deleteQuestion(question.id)}
                            className="sm:ml-auto"
                          >
                            Supprimer
                          </Button>
                        </>
                      )}
                    </div>
                  </Card>
                ))}

                {!loading && filteredQuestions.length === 0 && (
                  <Card padding="lg" className="text-center animate-slideUp">
                    <div className="text-4xl" aria-hidden="true">📚</div>
                    <h2 className="mt-2 text-xl font-black">Bibliothèque vide</h2>
                    <p className="mt-2 text-sm font-semibold text-white/55">
                      Sauvegarde une question pendant un reveal pour la retrouver ici.
                    </p>
                  </Card>
                )}
              </div>
            </section>

            <aside className="min-w-0 space-y-4">
              <Card padding="md" className="animate-slideUp">
                <Section eyebrow="Packs" title="Créer un pack" spacing="tight">
                  <form onSubmit={createPack} className="mt-1 space-y-3">
                    <Input value={packName} onChange={(event) => setPackName(event.target.value)} placeholder="Nom du pack" />
                    <textarea
                      className="input min-h-20 resize-none"
                      value={packDescription}
                      onChange={(event) => setPackDescription(event.target.value)}
                      placeholder="Description courte (optionnel)"
                    />
                    <select
                      className="input"
                      value={packGame}
                      onChange={(event) => setPackGame(event.target.value as GameType | "all")}
                    >
                      <option value="all">Multi-jeux</option>
                      {QUESTION_ENGINE_GAME_OPTIONS.map((gameType) => (
                        <option key={gameType} value={gameType}>{GAME_LABELS[gameType]}</option>
                      ))}
                    </select>
                    <Button type="submit" variant="primary" size="md" fullWidth>
                      Créer le pack
                    </Button>
                  </form>
                </Section>
              </Card>

              <Card padding="md" className="animate-slideUp">
                <Chip tone="cyan" size="sm">Pack actif</Chip>
                <select
                  className="input mt-3"
                  value={activePackId}
                  onChange={(event) => setActivePackId(event.target.value)}
                >
                  <option value="">Aucun pack</option>
                  {packs.map((pack) => (
                    <option key={pack.id} value={pack.id}>
                      {pack.name} · {countPackItems(packItems, pack.id)}
                    </option>
                  ))}
                </select>
                {activePack && (
                  <div className="mt-3 max-w-full overflow-hidden rounded-2xl border border-neon-cyan/30 bg-neon-cyan/10 p-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="break-words text-sm font-black">{activePack.name}</div>
                        {activePack.description && (
                          <p className="mt-1 break-words text-xs font-semibold text-white/55">{activePack.description}</p>
                        )}
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => startPackEdit(activePack)} className="w-full sm:w-auto">
                        Modifier
                      </Button>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {formatPackDistribution(activePackQuestions).map(({ gameType, count }) => (
                        <span key={gameType} className="rounded-full bg-black/30 px-2 py-0.5 text-[10px] font-black text-white/60">
                          {GAME_LABELS[gameType]} {count}
                        </span>
                      ))}
                    </div>
                    <div className="mt-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/50">
                      {activePackQuestions.length} question{activePackQuestions.length > 1 ? "s" : ""} · {activePack.game_type ? GAME_LABELS[activePack.game_type] : "multi-jeux"}
                    </div>
                    <div className="mt-3 grid gap-2">
                      {activePackQuestions.slice(0, 6).map((question) => (
                        <div
                          key={question.id}
                          className="grid max-w-full gap-2 overflow-hidden rounded-xl border border-white/8 bg-black/25 px-3 py-2 text-xs font-bold sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start"
                        >
                          <span className="min-w-0 whitespace-normal break-words leading-snug text-white/85">{question.question_text}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => void removeFromPack(question.id)}
                            className="justify-self-start text-neon-pink sm:justify-self-end"
                          >
                            Retirer
                          </Button>
                        </div>
                      ))}
                      {activePackQuestions.length === 0 && (
                        <p className="text-xs font-semibold text-white/55">
                          Clique sur &quot;+ Pack actif&quot; sur une question pour l&apos;ajouter.
                        </p>
                      )}
                    </div>
                  </div>
                )}
                <div className="mt-4 grid gap-2">
                  {packs.map((pack) => (
                    <div
                      key={pack.id}
                      className="rounded-2xl border border-white/10 bg-white/[0.04] p-3"
                    >
                      {editingPackId === pack.id ? (
                        <div className="space-y-2">
                          <Input value={editPackName} onChange={(event) => setEditPackName(event.target.value)} placeholder="Nom du pack" />
                          <textarea
                            className="input min-h-20 resize-none"
                            value={editPackDescription}
                            onChange={(event) => setEditPackDescription(event.target.value)}
                            placeholder="Description"
                          />
                          <select
                            className="input"
                            value={editPackGame}
                            onChange={(event) => setEditPackGame(event.target.value as GameType | "all")}
                          >
                            <option value="all">Multi-jeux</option>
                            {QUESTION_ENGINE_GAME_OPTIONS.map((gameType) => (
                              <option key={gameType} value={gameType}>{GAME_LABELS[gameType]}</option>
                            ))}
                          </select>
                          <div className="flex flex-wrap gap-2">
                            <Button variant="primary" size="sm" disabled={busyId === pack.id} onClick={() => void savePackEdit()}>
                              Enregistrer
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setEditingPackId(null)}>
                              Annuler
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-3">
                          <button
                            type="button"
                            onClick={() => setActivePackId(pack.id)}
                            className="min-w-0 flex-1 text-left"
                          >
                            <div className="truncate text-sm font-black">{pack.name}</div>
                            <div className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/45">
                              {pack.game_type ? GAME_LABELS[pack.game_type] : "Multi-jeux"} · {countPackItems(packItems, pack.id)}
                            </div>
                            {pack.description && <p className="mt-1 line-clamp-2 text-xs font-semibold text-white/45">{pack.description}</p>}
                          </button>
                          <div className="flex flex-wrap justify-end gap-1.5">
                            <Button variant="ghost" size="sm" onClick={() => startPackEdit(pack)}>
                              Modif.
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={busyId === `duplicate-pack-${pack.id}`}
                              onClick={() => void duplicatePack(pack)}
                            >
                              Copier
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              disabled={busyId === pack.id}
                              onClick={() => void deletePack(pack.id)}
                            >
                              Suppr.
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {packs.length === 0 && (
                    <p className="text-sm font-semibold text-white/55">Aucun pack pour le moment.</p>
                  )}
                </div>
              </Card>

              <Card padding="md" className="animate-slideUp">
                <Chip tone="green" size="sm">Sécurité</Chip>
                <p className="mt-2 text-sm font-semibold text-white/55">
                  Connecté en {profile.role}. Les opérations sensibles sont aussi bloquées côté Supabase par RLS.
                </p>
                <Button
                  onClick={() => void profile.signOut()}
                  variant="ghost"
                  size="md"
                  fullWidth
                  className="mt-4"
                >
                  Se déconnecter
                </Button>
              </Card>
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

function formatPackDistribution(questions: SavedCustomQuestion[]): Array<{ gameType: GameType; count: number }> {
  const counts = new Map<GameType, number>();
  for (const question of questions) counts.set(question.game_type, (counts.get(question.game_type) ?? 0) + 1);
  return GAME_OPTIONS
    .map((gameType) => ({ gameType, count: counts.get(gameType) ?? 0 }))
    .filter((item) => item.count > 0);
}

function questionHasEditablePayload(question: SavedCustomQuestion): boolean {
  return question.game_type === "who_would" || question.game_type === "majority" || question.game_type === "minority";
}

function questionIsActive(question: SavedCustomQuestion): boolean {
  return question.payload.active !== false;
}

function questionNeedsOptions(gameType: GameType): boolean {
  return gameType === "who_would" || gameType === "majority" || gameType === "minority";
}

function buildPayloadForGame(gameType: GameType, payloadText: string): Record<string, unknown> | null {
  if (gameType === "who_would") {
    const [optionA, optionB] = payloadText.split(/\n/).map((option) => option.trim()).filter(Boolean);
    if (!optionA || !optionB) return null;
    return { optionA, optionB };
  }
  if (gameType === "majority" || gameType === "minority") {
    const options = payloadText.split(/\n|,/).map((option) => option.trim()).filter(Boolean).slice(0, 8);
    if (options.length < 2) return null;
    return { options };
  }
  return {};
}

function payloadToFallbackText(gameType: GameType, payload: Record<string, unknown> | null): string {
  if (gameType === "who_would" && payload) {
    const optionA = typeof payload.optionA === "string" ? payload.optionA : "";
    const optionB = typeof payload.optionB === "string" ? payload.optionB : "";
    return optionA && optionB ? `${optionA} / ${optionB}` : "";
  }
  return "";
}

function payloadOptionsToText(question: SavedCustomQuestion): string {
  if (question.game_type === "who_would") {
    const optionA = typeof question.payload.optionA === "string" ? question.payload.optionA : "";
    const optionB = typeof question.payload.optionB === "string" ? question.payload.optionB : "";
    return [optionA, optionB].filter(Boolean).join("\n");
  }
  if (question.game_type === "majority" || question.game_type === "minority") {
    return Array.isArray(question.payload.options)
      ? question.payload.options.filter((option): option is string => typeof option === "string").join("\n")
      : "";
  }
  return "";
}

function buildEditedPayload(question: SavedCustomQuestion, payloadText: string): Record<string, unknown> | null {
  if (question.game_type === "who_would") {
    const [optionA, optionB] = payloadText.split(/\n/).map((option) => option.trim()).filter(Boolean);
    if (!optionA || !optionB) return null;
    return { ...question.payload, optionA, optionB };
  }
  if (question.game_type === "majority" || question.game_type === "minority") {
    const options = payloadText.split(/\n|,/).map((option) => option.trim()).filter(Boolean).slice(0, 8);
    if (options.length < 2) return null;
    return { ...question.payload, options };
  }
  return question.payload;
}
