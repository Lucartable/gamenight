"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import { useRoom } from "@/lib/useRoom";
import { useCountdown } from "@/lib/useCountdown";
import {
  CATEGORIES,
  Category,
  getCategory,
  getQuestion,
  pickRandomQuestion,
  QUESTIONS,
} from "@/lib/questions";
import {
  DEBATE_DURATION_SEC,
  VOTE_DURATION_SEC,
  getOrCreateClientId,
  loadCategories,
  saveCategories,
  secondsLeft,
} from "@/lib/utils";
import type { Choice, Player, Vote } from "@/types/database";

export default function HostPage() {
  const params = useParams<{ code: string }>();
  const code = params.code?.toUpperCase() ?? "";
  const router = useRouter();
  const { room, players, votes, askedQuestionIds, loading, error, refresh } = useRoom(code);

  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showAllQuestions, setShowAllQuestions] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);
  const [optimisticHostVote, setOptimisticHostVote] = useState<{ qid: number; choice: Choice } | null>(null);

  // Charge les catégories sauvegardées pour cette salle.
  useEffect(() => {
    if (!code) return;
    const saved = loadCategories(code) as Category[];
    if (saved.length) setSelectedCategories(saved);
    else setSelectedCategories(["soft"]); // défaut
  }, [code]);

  useEffect(() => {
    if (code) saveCategories(code, selectedCategories);
  }, [code, selectedCategories]);

  // Auto-redirect : si on n'est plus l'hôte (transfert), aller en /play.
  useEffect(() => {
    if (!room) return;
    const me = getOrCreateClientId();
    if (me !== room.host_client_id) router.replace(`/play/${code}`);
  }, [room?.host_client_id, code, room, router]);

  const me = useMemo(() => {
    const id = getOrCreateClientId();
    return players.find((p) => p.client_id === id);
  }, [players]);

  const currentQ = getQuestion(room?.current_question_id);
  const currentVotes = useMemo(
    () => (currentQ ? votes.filter((v) => v.question_id === currentQ.id) : []),
    [votes, currentQ]
  );

  const filteredAvailable = useMemo(() => {
    const cats = selectedCategories.length ? selectedCategories : CATEGORIES.map((c) => c.id);
    return QUESTIONS.filter(
      (q) => cats.includes(q.category) && !askedQuestionIds.includes(q.id)
    );
  }, [selectedCategories, askedQuestionIds]);

  // Reset du vote optimiste quand on change de question.
  useEffect(() => {
    setOptimisticHostVote((prev) =>
      !currentQ || (prev && prev.qid !== currentQ.id) ? null : prev
    );
  }, [currentQ]);

  // Bascule auto vers la révélation quand le timer atteint 0.
  const votingStartedAt = room?.status === "voting" ? room.question_started_at : null;
  const voteLeft = useCountdown(votingStartedAt, VOTE_DURATION_SEC);
  const voteHasExpired =
    votingStartedAt !== null && secondsLeft(votingStartedAt, VOTE_DURATION_SEC) === 0;
  useEffect(() => {
    if (room?.status === "voting" && voteHasExpired && !busy) {
      void revealNow();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voteLeft, room?.status, voteHasExpired, busy]);

  function toggleCategory(cat: Category) {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  }

  async function askQuestion(questionId: number) {
    if (!room || busy) return;
    setBusy(true);
    setActionError(null);
    try {
      const supabase = getSupabase();
      const { error: aqErr } = await supabase
        .from("asked_questions")
        .upsert(
          { room_id: room.id, question_id: questionId },
          { onConflict: "room_id,question_id" }
        );
      if (aqErr) throw aqErr;

      const { error: rErr } = await supabase
        .from("rooms")
        .update({
          status: "voting",
          current_question_id: questionId,
          question_started_at: new Date().toISOString(),
          debate_started_at: null,
          debate_mode: false,
        })
        .eq("id", room.id);
      if (rErr) throw rErr;
      await refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Erreur inconnue.");
    } finally {
      setBusy(false);
    }
  }

  function askRandom() {
    const q = pickRandomQuestion(selectedCategories, askedQuestionIds);
    if (!q) {
      setActionError("Plus de questions dans ces catégories. Change la sélection.");
      return;
    }
    void askQuestion(q.id);
  }

  async function revealNow() {
    if (!room) return;
    setBusy(true);
    try {
      const { error } = await getSupabase()
        .from("rooms")
        .update({ status: "reveal" })
        .eq("id", room.id);
      if (error) throw error;
      await refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Erreur inconnue.");
    } finally {
      setBusy(false);
    }
  }

  async function startDebate() {
    if (!room) return;
    setBusy(true);
    try {
      const { error } = await getSupabase()
        .from("rooms")
        .update({
          status: "debate",
          debate_mode: true,
          debate_started_at: new Date().toISOString(),
        })
        .eq("id", room.id);
      if (error) throw error;
      await refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Erreur inconnue.");
    } finally {
      setBusy(false);
    }
  }

  async function nextStep() {
    if (!room) return;
    setBusy(true);
    try {
      const { error } = await getSupabase()
        .from("rooms")
        .update({
          status: "lobby",
          current_question_id: null,
          question_started_at: null,
          debate_started_at: null,
          debate_mode: false,
        })
        .eq("id", room.id);
      if (error) throw error;
      await refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Erreur inconnue.");
    } finally {
      setBusy(false);
    }
  }

  async function endGame() {
    if (!room) return;
    if (!confirm("Terminer la partie pour tout le monde ?")) return;
    await getSupabase().from("rooms").update({ status: "ended" }).eq("id", room.id);
    router.push("/");
  }

  async function transferHostTo(player: Player) {
    if (!room || busy) return;
    if (!confirm(`Passer le rôle d'hôte à ${player.name} ?`)) return;
    setBusy(true);
    setActionError(null);
    try {
      const supabase = getSupabase();
      // 1) On retire le statut d'hôte de l'actuel.
      const { error: e1 } = await supabase
        .from("players")
        .update({ is_host: false })
        .eq("room_id", room.id)
        .eq("client_id", room.host_client_id);
      if (e1) throw e1;
      // 2) On met le nouveau comme hôte.
      const { error: e2 } = await supabase
        .from("players")
        .update({ is_host: true })
        .eq("id", player.id);
      if (e2) throw e2;
      // 3) On met à jour la salle (déclenche le redirect).
      const { error: e3 } = await supabase
        .from("rooms")
        .update({ host_client_id: player.client_id })
        .eq("id", room.id);
      if (e3) throw e3;
      setShowTransfer(false);
      await refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Erreur inconnue.");
    } finally {
      setBusy(false);
    }
  }

  // Vote de l'hôte (en tant que joueur).
  async function castVote(choice: Choice) {
    console.log("[GameNight] host castVote()", choice, {
      hasRoom: !!room,
      hasCurrentQ: !!currentQ,
      hasMe: !!me,
      playersCount: players.length,
    });
    setActionError(null);
    if (!room) { setActionError("Salle non chargée."); return; }
    if (!currentQ) { setActionError("Aucune question active."); return; }
    if (!me) {
      setActionError(
        `Tu n'es pas dans la liste des joueurs (${players.length} chargé${players.length > 1 ? "s" : ""}). Recrée la salle.`
      );
      return;
    }

    setOptimisticHostVote({ qid: currentQ.id, choice });

    try {
      const { error } = await getSupabase().from("votes").upsert(
        {
          room_id: room.id,
          player_id: me.id,
          question_id: currentQ.id,
          choice,
        },
        { onConflict: "room_id,player_id,question_id" }
      );
      if (error) throw error;
      await refresh();
    } catch (err) {
      console.error("[GameNight] host vote failed:", err);
      setActionError(err instanceof Error ? err.message : "Erreur de vote.");
      setOptimisticHostVote(null);
    }
  }

  if (loading) return <CenteredMessage title="Chargement..." />;
  if (error || !room)
    return <CenteredMessage title="Salle introuvable" subtitle={error ?? undefined} />;
  if (room.status === "ended")
    return <CenteredMessage title="Partie terminée" action={{ label: "Retour", href: "/" }} />;

  // L'optimistic prime sur le DB (mêmes raisons que côté joueur — voir play page).
  const dbVote: Choice | null = me ? currentVotes.find((v) => v.player_id === me.id)?.choice ?? null : null;
  const myVote: Choice | null =
    optimisticHostVote && currentQ && optimisticHostVote.qid === currentQ.id
      ? optimisticHostVote.choice
      : dbVote;
  const otherPlayers = players.filter((p) => p.client_id !== room.host_client_id);

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col px-5 py-6">
      <RoomHeader
        code={room.code}
        status={room.status}
        playersCount={players.length}
        onEnd={endGame}
        onToggleTransfer={() => setShowTransfer((s) => !s)}
        canTransfer={otherPlayers.length > 0}
      />

      {showTransfer && (
        <TransferPanel
          players={otherPlayers}
          busy={busy}
          onPick={transferHostTo}
          onClose={() => setShowTransfer(false)}
        />
      )}

      {actionError && (
        <div className="card mb-3 border-neon-pink/60 bg-neon-pink/10 p-3 text-center text-neon-pink">
          {actionError}
        </div>
      )}

      {room.status === "lobby" && (
        <LobbyView
          players={players}
          available={filteredAvailable}
          totalUnasked={QUESTIONS.length - askedQuestionIds.length}
          selectedCategories={selectedCategories}
          onToggleCategory={toggleCategory}
          onPick={askQuestion}
          onRandom={askRandom}
          showAll={showAllQuestions}
          onToggleShowAll={() => setShowAllQuestions((s) => !s)}
          busy={busy}
        />
      )}

      {room.status === "voting" && currentQ && (
        <VotingView
          question={currentQ}
          voteLeft={voteLeft}
          votedCount={currentVotes.length}
          totalPlayers={players.length}
          onRevealNow={revealNow}
          onVote={castVote}
          myVote={myVote ?? null}
          busy={busy}
        />
      )}

      {(room.status === "reveal" || room.status === "debate") && currentQ && (
        <RevealView
          question={currentQ}
          players={players}
          votes={currentVotes}
          isDebate={room.status === "debate"}
          debateStartedAt={room.debate_started_at}
          onNext={nextStep}
          onDebate={startDebate}
          busy={busy}
        />
      )}
    </main>
  );
}

// ---------- Sous-vues ------------------------------------------------------

function RoomHeader({
  code,
  status,
  playersCount,
  onEnd,
  onToggleTransfer,
  canTransfer,
}: {
  code: string;
  status: string;
  playersCount: number;
  onEnd: () => void;
  onToggleTransfer: () => void;
  canTransfer: boolean;
}) {
  return (
    <header className="card mb-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wider text-white/50">Code de la salle</div>
          <div className="select-all bg-gradient-to-r from-neon-pink to-neon-cyan bg-clip-text text-4xl font-black tracking-widest text-transparent">
            {code}
          </div>
          <div className="mt-1 text-sm text-white/60">
            {playersCount} joueur{playersCount > 1 ? "s" : ""} · {labelStatus(status)}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          {canTransfer && (
            <button onClick={onToggleTransfer} className="btn-ghost text-neon-cyan">
              👑 Transférer
            </button>
          )}
          <button onClick={onEnd} className="btn-ghost text-neon-pink">Terminer</button>
        </div>
      </div>
    </header>
  );
}

function TransferPanel({
  players,
  busy,
  onPick,
  onClose,
}: {
  players: Player[];
  busy: boolean;
  onPick: (p: Player) => void;
  onClose: () => void;
}) {
  return (
    <section className="card mb-4 border-neon-cyan/40 bg-neon-cyan/5 p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold">Passer le rôle d'hôte</h2>
        <button onClick={onClose} className="btn-ghost">✕</button>
      </div>
      <p className="mb-3 text-sm text-white/60">
        Le nouveau hôte gagnera le contrôle de la partie. Tu deviendras un joueur normal.
      </p>
      <ul className="space-y-2">
        {players.map((p) => (
          <li key={p.id}>
            <button
              disabled={busy}
              onClick={() => onPick(p)}
              className="w-full rounded-2xl border border-white/10 bg-bg-soft p-3 text-left transition hover:border-neon-cyan/60 disabled:opacity-50"
            >
              👑 Donner le rôle à <b className="text-neon-cyan">{p.name}</b>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function LobbyView({
  players,
  available,
  totalUnasked,
  selectedCategories,
  onToggleCategory,
  onPick,
  onRandom,
  showAll,
  onToggleShowAll,
  busy,
}: {
  players: Player[];
  available: { id: number; optionA: string; optionB: string; category: Category }[];
  totalUnasked: number;
  selectedCategories: Category[];
  onToggleCategory: (c: Category) => void;
  onPick: (id: number) => void;
  onRandom: () => void;
  showAll: boolean;
  onToggleShowAll: () => void;
  busy: boolean;
}) {
  const enoughPlayers = players.length >= 2;
  return (
    <>
      <section className="card mb-4 p-5">
        <h2 className="mb-3 text-lg font-bold">Joueurs connectés</h2>
        {players.length === 0 ? (
          <p className="text-white/60">En attente des joueurs...</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {players.map((p) => (
              <li key={p.id} className="chip">
                {p.is_host ? "👑 " : ""}{p.name}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-sm text-white/50">
          Partage le code <b className="text-white">en haut</b> pour qu'ils rejoignent.
        </p>
      </section>

      <section className="card mb-4 p-5">
        <h2 className="mb-3 text-lg font-bold">Ambiances</h2>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => {
            const active = selectedCategories.includes(c.id);
            return (
              <button
                key={c.id}
                onClick={() => onToggleCategory(c.id)}
                className={`flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "border-neon-pink bg-neon-pink/20 text-white shadow-glow-pink"
                    : "border-white/10 bg-white/5 text-white/70 hover:border-white/20"
                }`}
                title={c.description}
              >
                <span>{c.emoji}</span>
                <span>{c.label}</span>
                {c.adult && (
                  <span className="rounded bg-neon-pink/30 px-1 text-[10px] uppercase">18+</span>
                )}
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-sm text-white/50">
          {available.length} question{available.length > 1 ? "s" : ""} disponible{available.length > 1 ? "s" : ""} dans cette sélection
          {totalUnasked !== available.length && ` · ${totalUnasked} restantes au total`}
        </p>
      </section>

      <section className="card p-5">
        <button
          onClick={onRandom}
          disabled={busy || !enoughPlayers || available.length === 0}
          className="btn-primary w-full text-xl"
        >
          🎲 Question aléatoire
        </button>

        {!enoughPlayers && (
          <p className="mt-3 text-center text-sm text-neon-yellow">
            Il faut au moins 2 joueurs pour lancer.
          </p>
        )}

        {available.length === 0 && (
          <p className="mt-3 text-center text-sm text-neon-pink">
            Aucune question disponible. Coche d'autres ambiances.
          </p>
        )}

        <button
          onClick={onToggleShowAll}
          className="btn-ghost mt-4 w-full"
        >
          {showAll ? "▲ Masquer la liste" : "▼ Choisir une question précise"}
        </button>

        {showAll && (
          <ul className="mt-3 max-h-96 space-y-2 overflow-y-auto pr-1">
            {available.map((q) => {
              const cat = getCategory(q.category);
              return (
                <li key={q.id}>
                  <button
                    disabled={busy || !enoughPlayers}
                    onClick={() => onPick(q.id)}
                    className="w-full rounded-2xl border border-white/10 bg-bg-soft p-3 text-left transition hover:border-neon-pink/60 disabled:opacity-50"
                  >
                    <div className="mb-1 flex items-center gap-2 text-xs">
                      <span className="chip">{cat?.emoji} {cat?.label}</span>
                      <span className="text-white/40">#{q.id}</span>
                    </div>
                    <div className="text-sm font-semibold leading-snug">
                      <span className="text-neon-pink">{q.optionA}</span>
                      <span className="text-white/40"> / </span>
                      <span className="text-neon-cyan">{q.optionB}</span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}

function VotingView({
  question,
  voteLeft,
  votedCount,
  totalPlayers,
  onRevealNow,
  onVote,
  myVote,
  busy,
}: {
  question: { id: number; optionA: string; optionB: string; category: Category };
  voteLeft: number;
  votedCount: number;
  totalPlayers: number;
  onRevealNow: () => void;
  onVote: (c: Choice) => void;
  myVote: Choice | null;
  busy: boolean;
}) {
  const cat = getCategory(question.category);
  return (
    <section className="card flex flex-1 flex-col p-5 text-center">
      <div className="flex items-center justify-center gap-2">
        <span className="chip">{cat?.emoji} {cat?.label}</span>
        <span className="rounded-full bg-neon-pink/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-neon-pink animate-pulseSoft">
          🗳️ Vote ouvert
        </span>
      </div>
      <div className="mt-4 text-7xl font-black tabular-nums text-white">{voteLeft}</div>
      <div className="text-sm text-white/50">secondes — clique sur ton choix !</div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <HostVoteButton
          accent="pink"
          label="A"
          text={question.optionA}
          selected={myVote === "A"}
          onClick={() => onVote("A")}
        />
        <HostVoteButton
          accent="cyan"
          label="B"
          text={question.optionB}
          selected={myVote === "B"}
          onClick={() => onVote("B")}
        />
      </div>

      <div className="mt-6 text-white/70">
        {votedCount} / {totalPlayers} {totalPlayers > 1 ? "ont voté" : "a voté"}
      </div>

      <button
        type="button"
        onClick={() => { console.log("[GameNight] Révéler click"); onRevealNow(); }}
        disabled={busy}
        style={{ cursor: busy ? "not-allowed" : "pointer", position: "relative", zIndex: 10 }}
        className="btn-secondary mt-4"
      >
        Révéler tout de suite
      </button>
    </section>
  );
}

function HostVoteButton({
  accent,
  label,
  text,
  selected,
  onClick,
}: {
  accent: "pink" | "cyan";
  label: string;
  text: string;
  selected: boolean;
  onClick: () => void;
}) {
  const base = accent === "pink" ? "border-neon-pink/40 bg-neon-pink/10" : "border-neon-cyan/40 bg-neon-cyan/10";
  const sel = accent === "pink" ? "ring-2 ring-neon-pink shadow-glow-pink" : "ring-2 ring-neon-cyan shadow-glow-cyan";
  const labelColor = accent === "pink" ? "text-neon-pink" : "text-neon-cyan";
  return (
    <button
      type="button"
      onClick={() => {
        console.log("[GameNight] HostVoteButton click", label);
        try { onClick(); } catch (e) { console.error("[GameNight] click handler threw", e); }
      }}
      style={{ touchAction: "manipulation", cursor: "pointer", position: "relative", zIndex: 10 }}
      className={`flex flex-col items-center justify-center rounded-2xl border-2 p-4 text-center transition active:scale-[0.98] ${base} ${selected ? sel : ""}`}
    >
      <span className={`pointer-events-none text-xs font-bold uppercase tracking-widest ${labelColor}`}>Option {label}</span>
      <span className="pointer-events-none mt-2 text-base font-bold leading-tight">{text}</span>
      {selected && <span className="pointer-events-none mt-2 text-xs text-white/70">✓ Ton vote</span>}
    </button>
  );
}

function RevealView({
  question,
  players,
  votes,
  isDebate,
  debateStartedAt,
  onNext,
  onDebate,
  busy,
}: {
  question: { id: number; optionA: string; optionB: string; category: Category };
  players: Player[];
  votes: Vote[];
  isDebate: boolean;
  debateStartedAt: string | null;
  onNext: () => void;
  onDebate: () => void;
  busy: boolean;
}) {
  const debateLeft = useCountdown(isDebate ? debateStartedAt : null, DEBATE_DURATION_SEC);
  const cat = getCategory(question.category);
  const byChoice = (c: "A" | "B") =>
    votes
      .filter((v) => v.choice === c)
      .map((v) => players.find((p) => p.id === v.player_id)?.name ?? "?");
  const a = byChoice("A");
  const b = byChoice("B");
  const noVote = players.filter((p) => !votes.some((v) => v.player_id === p.id));

  return (
    <section className="card flex flex-1 flex-col p-5">
      <div className="mb-4 flex items-center justify-center gap-2">
        <span className="chip">{cat?.emoji} {cat?.label}</span>
        <span className="text-xs uppercase tracking-wider text-white/50">Résultats</span>
      </div>

      <div className="grid flex-1 gap-3 sm:grid-cols-2">
        <ColumnReveal accent="pink" label="Option A" text={question.optionA} names={a} />
        <ColumnReveal accent="cyan" label="Option B" text={question.optionB} names={b} />
      </div>

      {noVote.length > 0 && (
        <div className="mt-4 text-center text-sm text-white/50">
          N'ont pas voté : {noVote.map((p) => p.name).join(", ")}
        </div>
      )}

      {isDebate ? (
        <div className="mt-6 rounded-2xl border border-neon-yellow/50 bg-neon-yellow/10 p-4 text-center">
          <div className="text-xs uppercase text-neon-yellow">Mode débat</div>
          <div className="mt-1 text-4xl font-black tabular-nums">{formatMMSS(debateLeft)}</div>
          <button
            type="button"
            onClick={() => { console.log("[GameNight] Passer à la suite click"); onNext(); }}
            disabled={busy}
            style={{ cursor: busy ? "not-allowed" : "pointer", position: "relative", zIndex: 10 }}
            className="btn-primary mt-4 w-full"
          >
            Passer à la suite
          </button>
        </div>
      ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => { console.log("[GameNight] Débat click"); onDebate(); }}
            disabled={busy}
            style={{ cursor: busy ? "not-allowed" : "pointer", position: "relative", zIndex: 10 }}
            className="btn-secondary"
          >
            🔥 Débat (2 min)
          </button>
          <button
            type="button"
            onClick={() => { console.log("[GameNight] Question suivante click"); onNext(); }}
            disabled={busy}
            style={{ cursor: busy ? "not-allowed" : "pointer", position: "relative", zIndex: 10 }}
            className="btn-primary"
          >
            Question suivante →
          </button>
        </div>
      )}
    </section>
  );
}

function ColumnReveal({
  accent,
  label,
  text,
  names,
}: {
  accent: "pink" | "cyan";
  label: string;
  text: string;
  names: string[];
}) {
  // NB : volontairement très différent des boutons de vote (border dashed,
  // bg neutre, pas de hover) pour qu'on ne puisse plus les confondre.
  const labelColor = accent === "pink" ? "text-neon-pink/70" : "text-neon-cyan/70";
  return (
    <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-4">
      <div className={`flex items-center justify-between text-xs uppercase ${labelColor}`}>
        <span>📊 {label}</span>
        <span className="text-white/40">{names.length} vote{names.length > 1 ? "s" : ""}</span>
      </div>
      <div className="mt-2 text-base font-semibold text-white/90">{text}</div>
      {names.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {names.map((n, i) => (
            <li key={i} className="chip">{n}</li>
          ))}
        </ul>
      ) : (
        <div className="mt-3 text-sm text-white/40">— Personne</div>
      )}
    </div>
  );
}

function CenteredMessage({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: { label: string; href: string };
}) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 text-center">
      <h1 className="text-3xl font-black">{title}</h1>
      {subtitle && <p className="mt-2 text-white/60">{subtitle}</p>}
      {action && (
        <a href={action.href} className="btn-primary mt-6">
          {action.label}
        </a>
      )}
    </main>
  );
}

function labelStatus(s: string) {
  switch (s) {
    case "lobby": return "Lobby";
    case "voting": return "Vote en cours";
    case "reveal": return "Révélation";
    case "debate": return "Débat";
    case "ended": return "Terminée";
    default: return s;
  }
}

function formatMMSS(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
