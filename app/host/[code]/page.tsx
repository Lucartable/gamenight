"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  DEFAULT_REVEAL_DURATION_SEC,
  DEFAULT_TOTAL_QUESTIONS,
  DEFAULT_VOTE_DURATION_SEC,
  QUESTION_COUNT_PRESETS,
  REVEAL_DURATION_OPTIONS,
  VOTE_DURATION_OPTIONS,
  clampInt,
  getOrCreateClientId,
  loadCategories,
  saveCategories,
  secondsLeft,
} from "@/lib/utils";
import type { Choice, Player, Room, Vote } from "@/types/database";

type RoomConfigPatch = Partial<
  Pick<Room, "total_questions" | "vote_duration_sec" | "reveal_duration_sec" | "autoplay">
>;

export default function HostPage() {
  const params = useParams<{ code: string }>();
  const code = params.code?.toUpperCase() ?? "";
  const router = useRouter();
  const { room, players, votes, askedQuestionIds, loading, error, refresh } = useRoom(code);

  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showTransfer, setShowTransfer] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);
  const [customQuestionCount, setCustomQuestionCount] = useState(String(DEFAULT_TOTAL_QUESTIONS));
  const [hostSelectedChoice, setHostSelectedChoice] = useState<Choice | null>(null);
  const [hostSubmitting, setHostSubmitting] = useState(false);
  const [optimisticHostVote, setOptimisticHostVote] = useState<{ qid: number; choice: Choice } | null>(null);
  const transitionRef = useRef(false);

  useEffect(() => {
    if (!code) return;
    const saved = loadCategories(code) as Category[];
    setSelectedCategories(saved.length ? saved : ["soft"]);
  }, [code]);

  useEffect(() => {
    if (code) saveCategories(code, selectedCategories);
  }, [code, selectedCategories]);

  useEffect(() => {
    if (room?.total_questions) setCustomQuestionCount(String(room.total_questions));
  }, [room?.total_questions]);

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
  const totalQuestions = room?.total_questions ?? DEFAULT_TOTAL_QUESTIONS;
  const voteDuration = room?.vote_duration_sec ?? DEFAULT_VOTE_DURATION_SEC;
  const revealDuration = room?.reveal_duration_sec ?? DEFAULT_REVEAL_DURATION_SEC;
  const autoplay = room?.autoplay ?? false;

  const blockedQuestionIds = useMemo(() => {
    if (!currentQ || askedQuestionIds.includes(currentQ.id)) return askedQuestionIds;
    return [...askedQuestionIds, currentQ.id];
  }, [askedQuestionIds, currentQ]);

  const roundsPlayed = blockedQuestionIds.length;
  const currentVotes = useMemo(
    () => (currentQ ? votes.filter((v) => v.question_id === currentQ.id) : []),
    [votes, currentQ]
  );
  const filteredAvailable = useMemo(() => {
    const cats = selectedCategories.length ? selectedCategories : CATEGORIES.map((c) => c.id);
    return QUESTIONS.filter(
      (q) => cats.includes(q.category) && !blockedQuestionIds.includes(q.id)
    );
  }, [selectedCategories, blockedQuestionIds]);

  useEffect(() => {
    setHostSelectedChoice(null);
    setHostSubmitting(false);
    setOptimisticHostVote(null);
  }, [currentQ?.id]);

  const votingStartedAt = room?.status === "question_active" ? room.question_started_at : null;
  const voteLeft = useCountdown(votingStartedAt, voteDuration);
  const voteHasExpired =
    votingStartedAt !== null && secondsLeft(votingStartedAt, voteDuration) === 0;

  const revealStartedAt = room?.status === "reveal_results" ? room.reveal_started_at : null;
  const revealLeft = useCountdown(revealStartedAt, revealDuration);
  const revealHasExpired =
    revealStartedAt !== null && secondsLeft(revealStartedAt, revealDuration) === 0;

  useEffect(() => {
    if (room?.status === "question_active" && voteHasExpired) {
      void revealNow();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.status, voteHasExpired, currentQ?.id]);

  useEffect(() => {
    if (room?.status === "reveal_results" && autoplay && revealHasExpired) {
      void goToNextQuestion();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.status, autoplay, revealHasExpired, roundsPlayed, filteredAvailable.length]);

  async function runTransition(action: () => Promise<void>) {
    if (transitionRef.current) return;
    transitionRef.current = true;
    setBusy(true);
    setActionError(null);
    try {
      await action();
      await refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Erreur inconnue.");
    } finally {
      transitionRef.current = false;
      setBusy(false);
    }
  }

  async function updateConfig(patch: RoomConfigPatch) {
    if (!room || busy || room.status !== "lobby") return;
    setBusy(true);
    setActionError(null);
    try {
      const { error } = await getSupabase().from("rooms").update(patch).eq("id", room.id);
      if (error) throw error;
      await refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Erreur de configuration.");
    } finally {
      setBusy(false);
    }
  }

  function toggleCategory(cat: Category) {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  }

  function commitCustomQuestionCount() {
    const next = clampInt(Number.parseInt(customQuestionCount, 10), 1, QUESTIONS.length);
    setCustomQuestionCount(String(next));
    void updateConfig({ total_questions: next });
  }

  async function askQuestion(questionId: number) {
    if (!room) return;
    await runTransition(async () => {
      const supabase = getSupabase();
      const { error: aqErr } = await supabase
        .from("asked_questions")
        .upsert(
          { room_id: room.id, question_id: questionId },
          { onConflict: "room_id,question_id" }
        );
      if (aqErr) throw aqErr;

      const { error: roomErr } = await supabase
        .from("rooms")
        .update({
          status: "question_active",
          current_question_id: questionId,
          question_started_at: new Date().toISOString(),
          reveal_started_at: null,
        })
        .eq("id", room.id);
      if (roomErr) throw roomErr;
    });
  }

  async function goToNextQuestion() {
    if (!room) return;
    if (roundsPlayed >= totalQuestions || filteredAvailable.length === 0) {
      await finishGame(false);
      return;
    }
    const question = pickRandomQuestion(selectedCategories, blockedQuestionIds);
    if (!question) {
      await finishGame(false);
      return;
    }
    await askQuestion(question.id);
  }

  async function revealNow() {
    if (!room || !currentQ) return;
    await runTransition(async () => {
      const { error } = await getSupabase()
        .from("rooms")
        .update({
          status: "reveal_results",
          reveal_started_at: new Date().toISOString(),
        })
        .eq("id", room.id);
      if (error) throw error;
    });
  }

  async function resetToLobby() {
    if (!room) return;
    await runTransition(async () => {
      const { error } = await getSupabase()
        .from("rooms")
        .update({
          status: "lobby",
          current_question_id: null,
          question_started_at: null,
          reveal_started_at: null,
        })
        .eq("id", room.id);
      if (error) throw error;
    });
  }

  async function finishGame(requireConfirm: boolean) {
    if (!room) return;
    if (requireConfirm && !confirm("Terminer la partie pour tout le monde ?")) return;
    await runTransition(async () => {
      const { error } = await getSupabase().from("rooms").update({ status: "ended" }).eq("id", room.id);
      if (error) throw error;
    });
  }

  async function transferHostTo(player: Player) {
    if (!room || busy) return;
    if (!confirm(`Passer le rôle d'hôte à ${player.name} ?`)) return;
    await runTransition(async () => {
      const supabase = getSupabase();
      const { error: e1 } = await supabase
        .from("players")
        .update({ is_host: false })
        .eq("room_id", room.id)
        .eq("client_id", room.host_client_id);
      if (e1) throw e1;

      const { error: e2 } = await supabase.from("players").update({ is_host: true }).eq("id", player.id);
      if (e2) throw e2;

      const { error: e3 } = await supabase
        .from("rooms")
        .update({ host_client_id: player.client_id })
        .eq("id", room.id);
      if (e3) throw e3;
      setShowTransfer(false);
    });
  }

  async function submitHostVote() {
    if (!room || !currentQ || !me || !hostSelectedChoice || hostSubmitting) return;
    setHostSubmitting(true);
    setActionError(null);
    setOptimisticHostVote({ qid: currentQ.id, choice: hostSelectedChoice });
    try {
      const { error } = await getSupabase().from("votes").upsert(
        {
          room_id: room.id,
          player_id: me.id,
          question_id: currentQ.id,
          choice: hostSelectedChoice,
        },
        { onConflict: "room_id,player_id,question_id" }
      );
      if (error) throw error;
      await refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Erreur de vote.");
      setOptimisticHostVote(null);
    } finally {
      setHostSubmitting(false);
    }
  }

  if (loading) return <CenteredMessage title="Chargement..." />;
  if (error || !room)
    return <CenteredMessage title="Salle introuvable" subtitle={error ?? undefined} />;
  if (room.status === "ended")
    return <CenteredMessage title="Partie terminée" action={{ label: "Retour", href: "/" }} />;

  const dbVote: Choice | null = me ? currentVotes.find((v) => v.player_id === me.id)?.choice ?? null : null;
  const myVote: Choice | null =
    optimisticHostVote && currentQ && optimisticHostVote.qid === currentQ.id
      ? optimisticHostVote.choice
      : dbVote;
  const otherPlayers = players.filter((p) => p.client_id !== room.host_client_id);
  const stats = getVoteStats(players, currentVotes);
  const isFinalReveal = room.status === "reveal_results" && roundsPlayed >= totalQuestions;

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col px-5 py-6">
      <RoomHeader
        code={room.code}
        status={room.status}
        playersCount={players.length}
        round={roundsPlayed}
        totalQuestions={totalQuestions}
        onEnd={() => void finishGame(true)}
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
          availableCount={filteredAvailable.length}
          selectedCategories={selectedCategories}
          room={room}
          busy={busy}
          customQuestionCount={customQuestionCount}
          onCustomQuestionCountChange={setCustomQuestionCount}
          onCommitCustomQuestionCount={commitCustomQuestionCount}
          onToggleCategory={toggleCategory}
          onUpdateConfig={updateConfig}
          onStart={goToNextQuestion}
        />
      )}

      {room.status === "question_active" && currentQ && (
        <QuestionActiveView
          question={currentQ}
          voteLeft={voteLeft}
          votedCount={stats.total}
          totalPlayers={players.length}
          selectedChoice={hostSelectedChoice}
          validatedChoice={myVote}
          submitting={hostSubmitting}
          busy={busy}
          onSelect={setHostSelectedChoice}
          onSubmit={submitHostVote}
          onRevealNow={revealNow}
        />
      )}

      {room.status === "reveal_results" && currentQ && (
        <RevealView
          question={currentQ}
          players={players}
          votes={currentVotes}
          stats={stats}
          revealLeft={revealLeft}
          autoplay={autoplay}
          isFinal={isFinalReveal || filteredAvailable.length === 0}
          busy={busy}
          onNext={goToNextQuestion}
          onEnd={() => void finishGame(false)}
          onBackToLobby={resetToLobby}
        />
      )}
    </main>
  );
}

function RoomHeader({
  code,
  status,
  playersCount,
  round,
  totalQuestions,
  onEnd,
  onToggleTransfer,
  canTransfer,
}: {
  code: string;
  status: string;
  playersCount: number;
  round: number;
  totalQuestions: number;
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
            {round > 0 && ` · ${Math.min(round, totalQuestions)} / ${totalQuestions}`}
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
  availableCount,
  selectedCategories,
  room,
  busy,
  customQuestionCount,
  onCustomQuestionCountChange,
  onCommitCustomQuestionCount,
  onToggleCategory,
  onUpdateConfig,
  onStart,
}: {
  players: Player[];
  availableCount: number;
  selectedCategories: Category[];
  room: Room;
  busy: boolean;
  customQuestionCount: string;
  onCustomQuestionCountChange: (value: string) => void;
  onCommitCustomQuestionCount: () => void;
  onToggleCategory: (c: Category) => void;
  onUpdateConfig: (patch: RoomConfigPatch) => void;
  onStart: () => void;
}) {
  const enoughPlayers = players.length >= 2;
  const canStart = enoughPlayers && availableCount > 0 && !busy;

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
      </section>

      <section className="card mb-4 p-5">
        <h2 className="mb-4 text-lg font-bold">Configuration</h2>
        <ConfigGroup label="Questions">
          {QUESTION_COUNT_PRESETS.map((count) => (
            <ConfigButton
              key={count}
              active={room.total_questions === count}
              disabled={busy}
              onClick={() => onUpdateConfig({ total_questions: count })}
            >
              {count}
            </ConfigButton>
          ))}
          <div className="flex min-w-[128px] flex-1 gap-2">
            <input
              className="input min-w-0 rounded-xl px-3 py-2 text-base"
              inputMode="numeric"
              value={customQuestionCount}
              onChange={(e) => onCustomQuestionCountChange(e.target.value.replace(/\D/g, ""))}
              onBlur={onCommitCustomQuestionCount}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
              }}
              disabled={busy}
            />
            <button
              type="button"
              disabled={busy}
              onClick={onCommitCustomQuestionCount}
              className="btn-secondary rounded-xl px-3 py-2 text-sm"
            >
              OK
            </button>
          </div>
        </ConfigGroup>

        <ConfigGroup label="Vote">
          {VOTE_DURATION_OPTIONS.map((duration) => (
            <ConfigButton
              key={duration}
              active={room.vote_duration_sec === duration}
              disabled={busy}
              onClick={() => onUpdateConfig({ vote_duration_sec: duration })}
            >
              {duration}s
            </ConfigButton>
          ))}
        </ConfigGroup>

        <ConfigGroup label="Révélation">
          {REVEAL_DURATION_OPTIONS.map((duration) => (
            <ConfigButton
              key={duration}
              active={room.reveal_duration_sec === duration}
              disabled={busy}
              onClick={() => onUpdateConfig({ reveal_duration_sec: duration })}
            >
              {duration}s
            </ConfigButton>
          ))}
        </ConfigGroup>

        <button
          type="button"
          disabled={busy}
          onClick={() => onUpdateConfig({ autoplay: !room.autoplay })}
          className={`mt-2 flex w-full items-center justify-between rounded-2xl border p-4 text-left transition ${
            room.autoplay
              ? "border-neon-cyan bg-neon-cyan/10 text-white"
              : "border-white/10 bg-white/5 text-white/70"
          }`}
        >
          <span className="font-bold">Lecture automatique</span>
          <span className={room.autoplay ? "text-neon-cyan" : "text-white/50"}>
            {room.autoplay ? "ON" : "OFF"}
          </span>
        </button>
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
          {availableCount} question{availableCount > 1 ? "s" : ""} disponible{availableCount > 1 ? "s" : ""}.
        </p>
      </section>

      <section className="card p-5">
        <button onClick={onStart} disabled={!canStart} className="btn-primary w-full text-xl">
          Lancer la partie
        </button>
        {!enoughPlayers && (
          <p className="mt-3 text-center text-sm text-neon-yellow">
            Il faut au moins 2 joueurs pour lancer.
          </p>
        )}
        {availableCount === 0 && (
          <p className="mt-3 text-center text-sm text-neon-pink">
            Aucune question disponible avec ces ambiances.
          </p>
        )}
      </section>
    </>
  );
}

function ConfigGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="mb-2 text-xs font-bold uppercase tracking-wider text-white/50">{label}</div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function ConfigButton({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-xl border px-4 py-2 text-sm font-bold transition disabled:opacity-50 ${
        active
          ? "border-neon-pink bg-neon-pink/20 text-white shadow-glow-pink"
          : "border-white/10 bg-white/5 text-white/70 hover:border-white/20"
      }`}
    >
      {children}
    </button>
  );
}

function QuestionActiveView({
  question,
  voteLeft,
  votedCount,
  totalPlayers,
  selectedChoice,
  validatedChoice,
  submitting,
  busy,
  onSelect,
  onSubmit,
  onRevealNow,
}: {
  question: { id: number; optionA: string; optionB: string; category: Category };
  voteLeft: number;
  votedCount: number;
  totalPlayers: number;
  selectedChoice: Choice | null;
  validatedChoice: Choice | null;
  submitting: boolean;
  busy: boolean;
  onSelect: (choice: Choice) => void;
  onSubmit: () => void;
  onRevealNow: () => void;
}) {
  const cat = getCategory(question.category);
  const locked = Boolean(validatedChoice) || submitting || voteLeft === 0;

  return (
    <section className="card flex flex-1 flex-col p-5 text-center">
      <div className="flex items-center justify-center gap-2">
        <span className="chip">{cat?.emoji} {cat?.label}</span>
        <span className="rounded-full bg-neon-pink/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-neon-pink animate-pulseSoft">
          Vote ouvert
        </span>
      </div>
      <div className="mt-4 text-7xl font-black tabular-nums text-white">{voteLeft}</div>
      <div className="text-sm text-white/50">{votedCount} / {totalPlayers} vote{totalPlayers > 1 ? "s" : ""} envoyés</div>

      <ChoicePicker
        optionA={question.optionA}
        optionB={question.optionB}
        selectedChoice={validatedChoice ?? selectedChoice}
        locked={locked}
        onSelect={onSelect}
      />

      <button
        type="button"
        disabled={!selectedChoice || locked}
        onClick={onSubmit}
        className="btn-primary mt-4 w-full disabled:shadow-none"
      >
        {submitting ? "Envoi..." : validatedChoice ? "Vote envoyé" : "Valider mon choix"}
      </button>

      {validatedChoice && (
        <p className="mt-3 text-sm font-semibold text-neon-green">Vote envoyé</p>
      )}

      <button
        type="button"
        onClick={onRevealNow}
        disabled={busy}
        className="btn-secondary mt-4"
      >
        Révéler maintenant
      </button>
    </section>
  );
}

function ChoicePicker({
  optionA,
  optionB,
  selectedChoice,
  locked,
  onSelect,
}: {
  optionA: string;
  optionB: string;
  selectedChoice: Choice | null;
  locked: boolean;
  onSelect: (choice: Choice) => void;
}) {
  return (
    <div className="mt-6 grid gap-3 sm:grid-cols-2">
      <ChoiceButton
        accent="pink"
        label="A"
        text={optionA}
        selected={selectedChoice === "A"}
        disabled={locked}
        onClick={() => onSelect("A")}
      />
      <ChoiceButton
        accent="cyan"
        label="B"
        text={optionB}
        selected={selectedChoice === "B"}
        disabled={locked}
        onClick={() => onSelect("B")}
      />
    </div>
  );
}

function ChoiceButton({
  accent,
  label,
  text,
  selected,
  disabled,
  onClick,
}: {
  accent: "pink" | "cyan";
  label: string;
  text: string;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const base = accent === "pink" ? "border-neon-pink/40 bg-neon-pink/10" : "border-neon-cyan/40 bg-neon-cyan/10";
  const selectedClass = accent === "pink" ? "ring-4 ring-neon-pink shadow-glow-pink" : "ring-4 ring-neon-cyan shadow-glow-cyan";
  const labelColor = accent === "pink" ? "text-neon-pink" : "text-neon-cyan";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex min-h-40 flex-col items-center justify-center rounded-2xl border-2 p-4 text-center transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 ${base} ${selected ? selectedClass : ""}`}
    >
      <span className={`text-xs font-bold uppercase tracking-widest ${labelColor}`}>Option {label}</span>
      <span className="mt-2 text-base font-bold leading-tight">{text}</span>
    </button>
  );
}

function RevealView({
  question,
  players,
  votes,
  stats,
  revealLeft,
  autoplay,
  isFinal,
  busy,
  onNext,
  onEnd,
  onBackToLobby,
}: {
  question: { id: number; optionA: string; optionB: string; category: Category };
  players: Player[];
  votes: Vote[];
  stats: VoteStats;
  revealLeft: number;
  autoplay: boolean;
  isFinal: boolean;
  busy: boolean;
  onNext: () => void;
  onEnd: () => void;
  onBackToLobby: () => void;
}) {
  const cat = getCategory(question.category);
  const namesFor = (choice: Choice) =>
    votes
      .filter((v) => v.choice === choice)
      .map((v) => players.find((p) => p.id === v.player_id)?.name)
      .filter((name): name is string => Boolean(name));

  return (
    <section className="card flex flex-1 flex-col p-5">
      <div className="mb-4 flex items-center justify-center gap-2">
        <span className="chip">{cat?.emoji} {cat?.label}</span>
        <span className="text-xs uppercase tracking-wider text-white/50">Résultats</span>
      </div>

      <div className="grid flex-1 gap-3 sm:grid-cols-2">
        <ResultCard
          accent="pink"
          label="Option A"
          text={question.optionA}
          count={stats.aCount}
          percent={stats.aPercent}
          names={namesFor("A")}
        />
        <ResultCard
          accent="cyan"
          label="Option B"
          text={question.optionB}
          count={stats.bCount}
          percent={stats.bPercent}
          names={namesFor("B")}
        />
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
        <div className="text-xs uppercase tracking-wider text-white/50">
          {stats.total} vote{stats.total > 1 ? "s" : ""} validé{stats.total > 1 ? "s" : ""}
        </div>
        {autoplay && (
          <div className="mt-1 text-3xl font-black tabular-nums">
            {revealLeft}s
          </div>
        )}
      </div>

      {autoplay ? (
        <p className="mt-4 text-center text-sm font-semibold text-neon-cyan">
          {isFinal ? "Fin automatique en cours" : "Question suivante automatique"}
        </p>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            disabled={busy}
            onClick={isFinal ? onEnd : onNext}
            className="btn-primary"
          >
            {isFinal ? "Terminer la partie" : "Question suivante"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onBackToLobby}
            className="btn-secondary"
          >
            Retour au lobby
          </button>
        </div>
      )}
    </section>
  );
}

function ResultCard({
  accent,
  label,
  text,
  count,
  percent,
  names,
}: {
  accent: "pink" | "cyan";
  label: string;
  text: string;
  count: number;
  percent: number;
  names: string[];
}) {
  const labelColor = accent === "pink" ? "text-neon-pink" : "text-neon-cyan";
  const barColor = accent === "pink" ? "bg-neon-pink" : "bg-neon-cyan";

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className={`text-xs font-bold uppercase tracking-widest ${labelColor}`}>{label}</div>
      <div className="mt-2 text-base font-semibold text-white/90">{text}</div>
      <div className="mt-4 flex items-end justify-between gap-3">
        <div className="text-4xl font-black tabular-nums">{percent}%</div>
        <div className="pb-1 text-sm text-white/60">
          {count} vote{count > 1 ? "s" : ""}
        </div>
      </div>
      <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/10">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${percent}%` }} />
      </div>
      {names.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {names.map((name) => (
            <li key={name} className="chip">{name}</li>
          ))}
        </ul>
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

interface VoteStats {
  total: number;
  aCount: number;
  bCount: number;
  aPercent: number;
  bPercent: number;
}

function getVoteStats(players: Player[], votes: Vote[]): VoteStats {
  const playerIds = new Set(players.map((p) => p.id));
  const validVotes = votes.filter((vote) => playerIds.has(vote.player_id));
  const total = validVotes.length;
  const aCount = validVotes.filter((vote) => vote.choice === "A").length;
  const bCount = validVotes.filter((vote) => vote.choice === "B").length;
  return {
    total,
    aCount,
    bCount,
    aPercent: total === 0 ? 0 : Math.round((aCount / total) * 100),
    bPercent: total === 0 ? 0 : Math.round((bCount / total) * 100),
  };
}

function labelStatus(status: string) {
  switch (status) {
    case "lobby": return "Lobby";
    case "question_active": return "Vote en cours";
    case "reveal_results": return "Révélation";
    case "ended": return "Terminée";
    default: return status;
  }
}
