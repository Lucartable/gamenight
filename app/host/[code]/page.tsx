"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import { useRoom } from "@/lib/useRoom";
import { useCountdown } from "@/lib/useCountdown";
import {
  GAME_DEFINITIONS,
  type GameCategory,
  type GameQuestion,
  type WhoOfUsGameQuestion,
  type WhoWouldQuestion,
  getCategoryForGame,
  getDefaultCategories,
  getGameCategories,
  getGameDefinition,
  getQuestionForGame,
  getQuestionsForGame,
  pickRandomQuestionForGame,
} from "@/lib/gameQuestions";
import {
  DEFAULT_REVEAL_DURATION_SEC,
  DEFAULT_TOTAL_QUESTIONS,
  DEFAULT_VOTE_DURATION_SEC,
  QUESTION_COUNT_PRESETS,
  REVEAL_DURATION_OPTIONS,
  VOTE_DURATION_OPTIONS,
  clampInt,
  getOrCreateClientId,
  secondsLeft,
} from "@/lib/utils";
import type { Choice, GameType, Player, Room, Vote } from "@/types/database";

type RoomConfigPatch = Partial<
  Pick<
    Room,
    | "game_type"
    | "current_question_id"
    | "selected_categories"
    | "total_questions"
    | "vote_duration_sec"
    | "reveal_duration_sec"
    | "autoplay"
  >
>;

interface LocalVote {
  qid: number;
  selected_option: Choice | null;
  selected_player_id: string | null;
}

export default function HostPage() {
  const params = useParams<{ code: string }>();
  const code = params.code?.toUpperCase() ?? "";
  const router = useRouter();
  const { room, players, votes, askedQuestions, loading, error, refresh } = useRoom(code);

  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showTransfer, setShowTransfer] = useState(false);
  const [customQuestionCount, setCustomQuestionCount] = useState(String(DEFAULT_TOTAL_QUESTIONS));
  const [hostSelectedOption, setHostSelectedOption] = useState<Choice | null>(null);
  const [hostSelectedPlayerId, setHostSelectedPlayerId] = useState<string | null>(null);
  const [hostSubmitting, setHostSubmitting] = useState(false);
  const [optimisticHostVote, setOptimisticHostVote] = useState<LocalVote | null>(null);
  const transitionRef = useRef(false);

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

  const gameType = room?.game_type ?? null;
  const selectedCategories = useMemo(
    () => getSelectedCategories(room),
    [room]
  );
  const gameDefinition = getGameDefinition(gameType);
  const currentQ = getQuestionForGame(gameType, room?.current_question_id);
  const totalQuestions = room?.total_questions ?? DEFAULT_TOTAL_QUESTIONS;
  const voteDuration = room?.vote_duration_sec ?? DEFAULT_VOTE_DURATION_SEC;
  const revealDuration = room?.reveal_duration_sec ?? DEFAULT_REVEAL_DURATION_SEC;
  const autoplay = room?.autoplay ?? false;

  const askedForGameIds = useMemo(
    () =>
      gameType
        ? askedQuestions
            .filter((asked) => asked.game_type === gameType)
            .map((asked) => asked.question_id)
        : [],
    [askedQuestions, gameType]
  );
  const blockedQuestionIds = useMemo(() => {
    if (!currentQ || askedForGameIds.includes(currentQ.id)) return askedForGameIds;
    return [...askedForGameIds, currentQ.id];
  }, [askedForGameIds, currentQ]);
  const roundsPlayed = blockedQuestionIds.length;

  const currentVotes = useMemo(
    () =>
      currentQ && gameType
        ? votes.filter((vote) => vote.game_type === gameType && vote.question_id === currentQ.id)
        : [],
    [votes, currentQ, gameType]
  );

  const filteredAvailable = useMemo(() => {
    if (!gameType) return [];
    return getQuestionsForGame(gameType).filter(
      (question) =>
        selectedCategories.includes(question.category) &&
        !blockedQuestionIds.includes(question.id)
    );
  }, [gameType, selectedCategories, blockedQuestionIds]);

  const submittedVotesCount = useMemo(
    () => countSubmittedVotes(gameType, players, currentVotes),
    [gameType, players, currentVotes]
  );
  const allVotesSubmitted = players.length > 0 && submittedVotesCount >= players.length;

  useEffect(() => {
    setHostSelectedOption(null);
    setHostSelectedPlayerId(null);
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
    if (room?.status === "question_active" && (voteHasExpired || allVotesSubmitted)) {
      void revealNow();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.status, voteHasExpired, allVotesSubmitted, currentQ?.id]);

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

  function chooseGame(nextGameType: GameType) {
    void updateConfig({
      game_type: nextGameType,
      selected_categories: getDefaultCategories(nextGameType),
      current_question_id: null,
    });
  }

  function changeGame() {
    void updateConfig({
      game_type: null,
      selected_categories: [],
      current_question_id: null,
    });
  }

  function toggleCategory(category: GameCategory) {
    const next = selectedCategories.includes(category)
      ? selectedCategories.filter((item) => item !== category)
      : [...selectedCategories, category];
    void updateConfig({ selected_categories: next });
  }

  function commitCustomQuestionCount() {
    const next = clampInt(Number.parseInt(customQuestionCount, 10), 1, getQuestionsForGame(gameType).length || 400);
    setCustomQuestionCount(String(next));
    void updateConfig({ total_questions: next });
  }

  async function askQuestion(question: GameQuestion) {
    if (!room || !gameType) return;
    await runTransition(async () => {
      const supabase = getSupabase();
      const { error: askedError } = await supabase
        .from("asked_questions")
        .upsert(
          { room_id: room.id, game_type: gameType, question_id: question.id },
          { onConflict: "room_id,game_type,question_id" }
        );
      if (askedError) throw askedError;

      const { error: roomError } = await supabase
        .from("rooms")
        .update({
          status: "question_active",
          current_question_id: question.id,
          question_started_at: new Date().toISOString(),
          reveal_started_at: null,
        })
        .eq("id", room.id);
      if (roomError) throw roomError;
    });
  }

  async function goToNextQuestion() {
    if (!room || !gameType) return;
    if (roundsPlayed >= totalQuestions || filteredAvailable.length === 0) {
      await finishGame(false);
      return;
    }
    const question = pickRandomQuestionForGame(gameType, selectedCategories, blockedQuestionIds);
    if (!question) {
      await finishGame(false);
      return;
    }
    await askQuestion(question);
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
      const { error: currentHostError } = await supabase
        .from("players")
        .update({ is_host: false })
        .eq("room_id", room.id)
        .eq("client_id", room.host_client_id);
      if (currentHostError) throw currentHostError;

      const { error: newHostError } = await supabase
        .from("players")
        .update({ is_host: true })
        .eq("id", player.id);
      if (newHostError) throw newHostError;

      const { error: roomError } = await supabase
        .from("rooms")
        .update({ host_client_id: player.client_id })
        .eq("id", room.id);
      if (roomError) throw roomError;
      setShowTransfer(false);
    });
  }

  async function submitHostVote() {
    if (!room || !gameType || !currentQ || !me || hostSubmitting) return;
    const selectedOption = gameType === "who_would" ? hostSelectedOption : null;
    const selectedPlayerId = gameType === "who_of_us" ? hostSelectedPlayerId : null;
    if (gameType === "who_would" && !selectedOption) return;
    if (gameType === "who_of_us" && (!selectedPlayerId || selectedPlayerId === me.id)) return;

    setHostSubmitting(true);
    setActionError(null);
    setOptimisticHostVote({ qid: currentQ.id, selected_option: selectedOption, selected_player_id: selectedPlayerId });

    try {
      const { error } = await getSupabase().from("votes").upsert(
        {
          room_id: room.id,
          game_type: gameType,
          voter_player_id: me.id,
          question_id: currentQ.id,
          selected_option: selectedOption,
          selected_player_id: selectedPlayerId,
        },
        { onConflict: "room_id,game_type,question_id,voter_player_id" }
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

  const dbVote = me ? currentVotes.find((vote) => vote.voter_player_id === me.id) : undefined;
  const effectiveHostVote =
    optimisticHostVote && currentQ && optimisticHostVote.qid === currentQ.id
      ? optimisticHostVote
      : voteToLocalVote(dbVote);
  const otherPlayers = players.filter((player) => player.client_id !== room.host_client_id);
  const targetPlayers = me ? players.filter((player) => player.id !== me.id) : players;
  const isFinalReveal = room.status === "reveal_results" && roundsPlayed >= totalQuestions;

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col px-5 py-6">
      <RoomHeader
        code={room.code}
        status={room.status}
        gameLabel={gameDefinition?.shortLabel}
        playersCount={players.length}
        round={roundsPlayed}
        totalQuestions={totalQuestions}
        onEnd={() => void finishGame(true)}
        onToggleTransfer={() => setShowTransfer((value) => !value)}
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

      {room.status === "lobby" && !gameType && (
        <GameSelectionView busy={busy} onChoose={chooseGame} />
      )}

      {room.status === "lobby" && gameType && gameDefinition && (
        <LobbyView
          players={players}
          availableCount={filteredAvailable.length}
          gameType={gameType}
          gameLabel={gameDefinition.label}
          selectedCategories={selectedCategories}
          room={room}
          busy={busy}
          customQuestionCount={customQuestionCount}
          onCustomQuestionCountChange={setCustomQuestionCount}
          onCommitCustomQuestionCount={commitCustomQuestionCount}
          onToggleCategory={toggleCategory}
          onUpdateConfig={updateConfig}
          onStart={goToNextQuestion}
          onChangeGame={changeGame}
        />
      )}

      {room.status === "question_active" && currentQ && gameType === "who_would" && (
        <WhoWouldActiveView
          question={currentQ as WhoWouldQuestion}
          voteLeft={voteLeft}
          votedCount={submittedVotesCount}
          totalPlayers={players.length}
          selectedChoice={hostSelectedOption}
          validatedChoice={effectiveHostVote?.selected_option ?? null}
          submitting={hostSubmitting}
          busy={busy}
          onSelect={setHostSelectedOption}
          onSubmit={submitHostVote}
          onRevealNow={revealNow}
        />
      )}

      {room.status === "question_active" && currentQ && gameType === "who_of_us" && (
        <WhoOfUsActiveView
          question={currentQ as WhoOfUsGameQuestion}
          voteLeft={voteLeft}
          votedCount={submittedVotesCount}
          totalPlayers={players.length}
          targetPlayers={targetPlayers}
          selectedPlayerId={hostSelectedPlayerId}
          validatedPlayerId={effectiveHostVote?.selected_player_id ?? null}
          submitting={hostSubmitting}
          busy={busy}
          onSelect={setHostSelectedPlayerId}
          onSubmit={submitHostVote}
          onRevealNow={revealNow}
        />
      )}

      {room.status === "reveal_results" && currentQ && gameType === "who_would" && (
        <WhoWouldRevealView
          question={currentQ as WhoWouldQuestion}
          players={players}
          votes={currentVotes}
          revealLeft={revealLeft}
          autoplay={autoplay}
          isFinal={isFinalReveal || filteredAvailable.length === 0}
          busy={busy}
          onNext={goToNextQuestion}
          onEnd={() => void finishGame(false)}
          onBackToLobby={resetToLobby}
        />
      )}

      {room.status === "reveal_results" && currentQ && gameType === "who_of_us" && (
        <WhoOfUsRevealView
          question={currentQ as WhoOfUsGameQuestion}
          players={players}
          votes={currentVotes}
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

function GameSelectionView({
  busy,
  onChoose,
}: {
  busy: boolean;
  onChoose: (gameType: GameType) => void;
}) {
  return (
    <section className="flex flex-1 flex-col justify-center">
      <div className="mb-5 text-center">
        <h1 className="text-3xl font-black">Choisir un jeu</h1>
        <p className="mt-2 text-white/60">Deux ambiances rapides, un seul code de salle.</p>
      </div>
      <div className="grid gap-3">
        {GAME_DEFINITIONS.map((game) => (
          <button
            key={game.id}
            type="button"
            disabled={busy}
            onClick={() => onChoose(game.id)}
            className="card p-5 text-left transition hover:border-neon-cyan/50 hover:bg-bg-soft disabled:opacity-50"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-2xl font-black">{game.label}</div>
                <div className="mt-2 text-sm text-white/60">{game.description}</div>
              </div>
              <span className="text-2xl text-neon-cyan">→</span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

function RoomHeader({
  code,
  status,
  gameLabel,
  playersCount,
  round,
  totalQuestions,
  onEnd,
  onToggleTransfer,
  canTransfer,
}: {
  code: string;
  status: string;
  gameLabel: string | undefined;
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
            {gameLabel && ` · ${gameLabel}`}
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
  gameType,
  gameLabel,
  selectedCategories,
  room,
  busy,
  customQuestionCount,
  onCustomQuestionCountChange,
  onCommitCustomQuestionCount,
  onToggleCategory,
  onUpdateConfig,
  onStart,
  onChangeGame,
}: {
  players: Player[];
  availableCount: number;
  gameType: GameType;
  gameLabel: string;
  selectedCategories: string[];
  room: Room;
  busy: boolean;
  customQuestionCount: string;
  onCustomQuestionCountChange: (value: string) => void;
  onCommitCustomQuestionCount: () => void;
  onToggleCategory: (category: GameCategory) => void;
  onUpdateConfig: (patch: RoomConfigPatch) => void;
  onStart: () => void;
  onChangeGame: () => void;
}) {
  const enoughPlayers = players.length >= 2;
  const canStart = enoughPlayers && availableCount > 0 && !busy;
  const categories = getGameCategories(gameType);

  return (
    <>
      <section className="card mb-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-wider text-white/50">Jeu sélectionné</div>
            <h2 className="text-2xl font-black">{gameLabel}</h2>
          </div>
          <button type="button" onClick={onChangeGame} disabled={busy} className="btn-ghost text-neon-cyan">
            Changer
          </button>
        </div>
      </section>

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
        <h2 className="mb-3 text-lg font-bold">Thèmes</h2>
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => {
            const active = selectedCategories.includes(category.id);
            return (
              <button
                key={category.id}
                onClick={() => onToggleCategory(category.id)}
                className={`flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "border-neon-pink bg-neon-pink/20 text-white shadow-glow-pink"
                    : "border-white/10 bg-white/5 text-white/70 hover:border-white/20"
                }`}
                title={category.description}
              >
                <span>{category.emoji}</span>
                <span>{category.label}</span>
                {category.adult && (
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
            Aucune question disponible avec ces thèmes.
          </p>
        )}
      </section>
    </>
  );
}

function ConfigGroup({ label, children }: { label: string; children: ReactNode }) {
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
  children: ReactNode;
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

function QuestionShell({
  category,
  voteLeft,
  votedCount,
  totalPlayers,
  children,
}: {
  category: ReturnType<typeof getCategoryForGame>;
  voteLeft: number;
  votedCount: number;
  totalPlayers: number;
  children: ReactNode;
}) {
  return (
    <section className="card flex flex-1 flex-col p-5 text-center">
      <div className="flex items-center justify-center gap-2">
        {category && <span className="chip">{category.emoji} {category.label}</span>}
        <span className="rounded-full bg-neon-pink/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-neon-pink animate-pulseSoft">
          Vote ouvert
        </span>
      </div>
      <div className="mt-4 text-7xl font-black tabular-nums text-white">{voteLeft}</div>
      <div className="text-sm text-white/50">{votedCount} / {totalPlayers} vote{totalPlayers > 1 ? "s" : ""} envoyés</div>
      {children}
    </section>
  );
}

function WhoWouldActiveView({
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
  question: WhoWouldQuestion;
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
  const locked = Boolean(validatedChoice) || submitting || voteLeft === 0;
  const category = getCategoryForGame("who_would", question.category);

  return (
    <QuestionShell category={category} voteLeft={voteLeft} votedCount={votedCount} totalPlayers={totalPlayers}>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <ChoiceButton
          accent="pink"
          label="A"
          text={question.optionA}
          selected={(validatedChoice ?? selectedChoice) === "A"}
          disabled={locked}
          onClick={() => onSelect("A")}
        />
        <ChoiceButton
          accent="cyan"
          label="B"
          text={question.optionB}
          selected={(validatedChoice ?? selectedChoice) === "B"}
          disabled={locked}
          onClick={() => onSelect("B")}
        />
      </div>
      <VoteActions
        canSubmit={Boolean(selectedChoice) && !locked}
        validated={Boolean(validatedChoice)}
        submitting={submitting}
        busy={busy}
        onSubmit={onSubmit}
        onRevealNow={onRevealNow}
      />
    </QuestionShell>
  );
}

function WhoOfUsActiveView({
  question,
  voteLeft,
  votedCount,
  totalPlayers,
  targetPlayers,
  selectedPlayerId,
  validatedPlayerId,
  submitting,
  busy,
  onSelect,
  onSubmit,
  onRevealNow,
}: {
  question: WhoOfUsGameQuestion;
  voteLeft: number;
  votedCount: number;
  totalPlayers: number;
  targetPlayers: Player[];
  selectedPlayerId: string | null;
  validatedPlayerId: string | null;
  submitting: boolean;
  busy: boolean;
  onSelect: (playerId: string) => void;
  onSubmit: () => void;
  onRevealNow: () => void;
}) {
  const locked = Boolean(validatedPlayerId) || submitting || voteLeft === 0;
  const category = getCategoryForGame("who_of_us", question.category);
  const activePlayerId = validatedPlayerId ?? selectedPlayerId;

  return (
    <QuestionShell category={category} voteLeft={voteLeft} votedCount={votedCount} totalPlayers={totalPlayers}>
      <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-left">
        <div className="text-xs font-bold uppercase tracking-wider text-white/50">Question</div>
        <h2 className="mt-2 text-2xl font-black leading-tight">{question.text}</h2>
      </div>
      <div className="mt-4 grid gap-2">
        {targetPlayers.map((player) => (
          <PlayerTargetButton
            key={player.id}
            player={player}
            selected={activePlayerId === player.id}
            disabled={locked}
            onClick={() => onSelect(player.id)}
          />
        ))}
      </div>
      <VoteActions
        canSubmit={Boolean(selectedPlayerId) && !locked}
        validated={Boolean(validatedPlayerId)}
        submitting={submitting}
        busy={busy}
        onSubmit={onSubmit}
        onRevealNow={onRevealNow}
      />
    </QuestionShell>
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

function PlayerTargetButton({
  player,
  selected,
  disabled,
  onClick,
}: {
  player: Player;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex items-center justify-between rounded-2xl border p-4 text-left transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 ${
        selected
          ? "border-neon-cyan bg-neon-cyan/10 shadow-glow-cyan"
          : "border-white/10 bg-white/5 hover:border-neon-cyan/50"
      }`}
    >
      <span className="text-xl font-black">{player.name}</span>
      {selected && <span className="text-sm font-bold text-neon-cyan">Sélectionné</span>}
    </button>
  );
}

function VoteActions({
  canSubmit,
  validated,
  submitting,
  busy,
  onSubmit,
  onRevealNow,
}: {
  canSubmit: boolean;
  validated: boolean;
  submitting: boolean;
  busy: boolean;
  onSubmit: () => void;
  onRevealNow: () => void;
}) {
  return (
    <>
      <button
        type="button"
        disabled={!canSubmit}
        onClick={onSubmit}
        className="btn-primary mt-4 w-full disabled:shadow-none"
      >
        {submitting ? "Envoi..." : validated ? "Vote envoyé" : "Valider mon choix"}
      </button>
      {validated && (
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
    </>
  );
}

function WhoWouldRevealView({
  question,
  players,
  votes,
  revealLeft,
  autoplay,
  isFinal,
  busy,
  onNext,
  onEnd,
  onBackToLobby,
}: {
  question: WhoWouldQuestion;
  players: Player[];
  votes: Vote[];
  revealLeft: number;
  autoplay: boolean;
  isFinal: boolean;
  busy: boolean;
  onNext: () => void;
  onEnd: () => void;
  onBackToLobby: () => void;
}) {
  const category = getCategoryForGame("who_would", question.category);
  const stats = getWhoWouldStats(players, votes);
  const namesFor = (choice: Choice) =>
    votes
      .filter((vote) => vote.selected_option === choice)
      .map((vote) => players.find((player) => player.id === vote.voter_player_id)?.name)
      .filter((name): name is string => Boolean(name));

  return (
    <RevealShell
      category={category}
      totalVotes={stats.total}
      revealLeft={revealLeft}
      autoplay={autoplay}
      isFinal={isFinal}
      busy={busy}
      onNext={onNext}
      onEnd={onEnd}
      onBackToLobby={onBackToLobby}
    >
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
    </RevealShell>
  );
}

function WhoOfUsRevealView({
  question,
  players,
  votes,
  revealLeft,
  autoplay,
  isFinal,
  busy,
  onNext,
  onEnd,
  onBackToLobby,
}: {
  question: WhoOfUsGameQuestion;
  players: Player[];
  votes: Vote[];
  revealLeft: number;
  autoplay: boolean;
  isFinal: boolean;
  busy: boolean;
  onNext: () => void;
  onEnd: () => void;
  onBackToLobby: () => void;
}) {
  const category = getCategoryForGame("who_of_us", question.category);
  const stats = getWhoOfUsStats(players, votes);

  return (
    <RevealShell
      category={category}
      totalVotes={stats.total}
      revealLeft={revealLeft}
      autoplay={autoplay}
      isFinal={isFinal}
      busy={busy}
      onNext={onNext}
      onEnd={onEnd}
      onBackToLobby={onBackToLobby}
    >
      <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="text-xs font-bold uppercase tracking-wider text-white/50">Question</div>
        <h2 className="mt-2 text-2xl font-black leading-tight">{question.text}</h2>
      </div>

      <div className="grid gap-3">
        {stats.ranking.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-center text-white/60">
            Aucun vote reçu.
          </div>
        ) : (
          stats.ranking.map((row) => (
            <RankingCard key={row.targetId} row={row} topCount={stats.topCount} />
          ))
        )}
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="mb-3 text-xs font-bold uppercase tracking-wider text-white/50">Détail des votes</div>
        <ul className="space-y-2">
          {stats.details.map((detail) => (
            <li key={detail.voterId} className="flex items-center justify-between gap-3 rounded-xl bg-bg-soft p-3">
              <span className="font-bold">{detail.voterName}</span>
              <span className="text-right text-sm text-white/70">{detail.targetName ?? "n'a pas voté"}</span>
            </li>
          ))}
        </ul>
      </div>
    </RevealShell>
  );
}

function RevealShell({
  category,
  totalVotes,
  revealLeft,
  autoplay,
  isFinal,
  busy,
  onNext,
  onEnd,
  onBackToLobby,
  children,
}: {
  category: ReturnType<typeof getCategoryForGame>;
  totalVotes: number;
  revealLeft: number;
  autoplay: boolean;
  isFinal: boolean;
  busy: boolean;
  onNext: () => void;
  onEnd: () => void;
  onBackToLobby: () => void;
  children: ReactNode;
}) {
  return (
    <section className="card flex flex-1 flex-col p-5">
      <div className="mb-4 flex items-center justify-center gap-2">
        {category && <span className="chip">{category.emoji} {category.label}</span>}
        <span className="text-xs uppercase tracking-wider text-white/50">Résultats</span>
      </div>

      {children}

      <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
        <div className="text-xs uppercase tracking-wider text-white/50">
          {totalVotes} vote{totalVotes > 1 ? "s" : ""} validé{totalVotes > 1 ? "s" : ""}
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

function RankingCard({ row, topCount }: { row: WhoOfUsRankingRow; topCount: number }) {
  const isTop = topCount > 0 && row.count === topCount;
  return (
    <div className={`rounded-2xl border p-4 ${isTop ? "border-neon-yellow/60 bg-neon-yellow/10" : "border-white/10 bg-white/5"}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-2xl font-black">{row.targetName}</div>
          {isTop && <div className="mt-1 text-xs font-bold uppercase tracking-wider text-neon-yellow">Meilleur suspect</div>}
        </div>
        <div className="text-right">
          <div className="text-3xl font-black tabular-nums">{row.count}</div>
          <div className="text-xs text-white/50">vote{row.count > 1 ? "s" : ""}</div>
        </div>
      </div>
      <div className="mt-3 text-sm text-white/60">Voté par</div>
      <ul className="mt-2 flex flex-wrap gap-2">
        {row.voters.map((name) => (
          <li key={name} className="chip">{name}</li>
        ))}
      </ul>
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

interface WhoWouldStats {
  total: number;
  aCount: number;
  bCount: number;
  aPercent: number;
  bPercent: number;
}

interface WhoOfUsRankingRow {
  targetId: string;
  targetName: string;
  count: number;
  voters: string[];
}

interface WhoOfUsDetailRow {
  voterId: string;
  voterName: string;
  targetName: string | null;
}

function getSelectedCategories(room: Room | null): string[] {
  if (!room?.game_type) return [];
  if (room.selected_categories?.length) return room.selected_categories;
  return getDefaultCategories(room.game_type);
}

function voteToLocalVote(vote: Vote | undefined): LocalVote | null {
  if (!vote) return null;
  return {
    qid: vote.question_id,
    selected_option: vote.selected_option,
    selected_player_id: vote.selected_player_id,
  };
}

function countSubmittedVotes(gameType: GameType | null, players: Player[], votes: Vote[]): number {
  const playerIds = new Set(players.map((player) => player.id));
  return votes.filter((vote) => {
    if (!playerIds.has(vote.voter_player_id)) return false;
    if (gameType === "who_would") return vote.selected_option === "A" || vote.selected_option === "B";
    if (gameType === "who_of_us") return Boolean(vote.selected_player_id);
    return false;
  }).length;
}

function getWhoWouldStats(players: Player[], votes: Vote[]): WhoWouldStats {
  const playerIds = new Set(players.map((player) => player.id));
  const validVotes = votes.filter(
    (vote) => playerIds.has(vote.voter_player_id) && (vote.selected_option === "A" || vote.selected_option === "B")
  );
  const total = validVotes.length;
  const aCount = validVotes.filter((vote) => vote.selected_option === "A").length;
  const bCount = validVotes.filter((vote) => vote.selected_option === "B").length;
  return {
    total,
    aCount,
    bCount,
    aPercent: total === 0 ? 0 : Math.round((aCount / total) * 100),
    bPercent: total === 0 ? 0 : Math.round((bCount / total) * 100),
  };
}

function getWhoOfUsStats(players: Player[], votes: Vote[]) {
  const playerById = new Map(players.map((player) => [player.id, player]));
  const ranking = new Map<string, WhoOfUsRankingRow>();
  const voteByVoter = new Map<string, Vote>();

  for (const vote of votes) {
    if (!playerById.has(vote.voter_player_id)) continue;
    voteByVoter.set(vote.voter_player_id, vote);
    if (!vote.selected_player_id) continue;
    const target = playerById.get(vote.selected_player_id);
    const targetId = vote.selected_player_id;
    const voterName = playerById.get(vote.voter_player_id)?.name ?? "Joueur parti";
    const row = ranking.get(targetId) ?? {
      targetId,
      targetName: target?.name ?? "Joueur parti",
      count: 0,
      voters: [],
    };
    row.count += 1;
    row.voters.push(voterName);
    ranking.set(targetId, row);
  }

  const sortedRanking = [...ranking.values()].sort(
    (a, b) => b.count - a.count || a.targetName.localeCompare(b.targetName)
  );
  const details: WhoOfUsDetailRow[] = players.map((player) => {
    const vote = voteByVoter.get(player.id);
    const target = vote?.selected_player_id ? playerById.get(vote.selected_player_id) : null;
    return {
      voterId: player.id,
      voterName: player.name,
      targetName: vote?.selected_player_id ? target?.name ?? "Joueur parti" : null,
    };
  });

  return {
    total: voteByVoter.size,
    ranking: sortedRanking,
    details,
    topCount: sortedRanking[0]?.count ?? 0,
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
