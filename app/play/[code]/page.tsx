"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import { useRoom } from "@/lib/useRoom";
import { useCountdown } from "@/lib/useCountdown";
import {
  type MimeExpressionQuestion,
  type PredictionGameQuestion,
  type WhoOfUsGameQuestion,
  type WhoWouldQuestion,
  getCategoryForGame,
  getGameDefinition,
  getQuestionForGame,
} from "@/lib/gameQuestions";
import { getMimeGameState, isMimeGame } from "@/lib/mimeGame";
import {
  getJaugeCurrentQuestion,
  getJaugeGameState,
  getJaugeRequiredVoters,
  isJaugeGame,
} from "@/lib/jaugeGame";
import {
  generateLocalQuestionId,
  getQuestionSourceSettings,
  questionFromSnapshot,
} from "@/lib/questionPoolEngine";
import {
  PredictionRevealPanel,
  PredictionScoreboardPanel,
  PredictionVoteScreen,
} from "@/components/predictionMode";
import {
  JaugeRevealPanel,
  JaugeVoteScreen,
} from "@/components/jaugeMode";
import { EndGameSummaryPanel } from "@/components/endGameSummary";
import { isPredictionGame } from "@/lib/scoring";
import { useCountUp } from "@/lib/useCountUp";
import {
  DEFAULT_REVEAL_DURATION_SEC,
  DEFAULT_VOTE_DURATION_SEC,
  getOrCreateClientId,
  triggerHaptic,
} from "@/lib/utils";
import type { Choice, GameType, MimeGameState, Player, Rating, Vote } from "@/types/database";

interface LocalVote {
  qid: number;
  selected_option: Choice | null;
  selected_player_id: string | null;
}

interface LocalRating {
  qid: number;
  rating: number;
}

export default function PlayerPage() {
  const params = useParams<{ code: string }>();
  const code = params.code?.toUpperCase() ?? "";
  const router = useRouter();
  const { room, players, votes, ratings, customQuestions, askedQuestions, loading, error, refresh } = useRoom(code);
  const [selectedOption, setSelectedOption] = useState<Choice | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [selectedPredictionOption, setSelectedPredictionOption] = useState<string | null>(null);
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [questionDraft, setQuestionDraft] = useState("");
  const [questionOptionA, setQuestionOptionA] = useState("");
  const [questionOptionB, setQuestionOptionB] = useState("");
  const [questionOptions, setQuestionOptions] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submittingQuestion, setSubmittingQuestion] = useState(false);
  const [voteError, setVoteError] = useState<string | null>(null);
  const [optimisticVote, setOptimisticVote] = useState<LocalVote | null>(null);
  const [optimisticRating, setOptimisticRating] = useState<LocalRating | null>(null);

  const me = useMemo<Player | undefined>(() => {
    if (!players.length) return undefined;
    const id = getOrCreateClientId();
    return players.find((p) => p.client_id === id);
  }, [players]);

  useEffect(() => {
    if (!room) return;
    const id = getOrCreateClientId();
    if (id === room.host_client_id) router.replace(`/host/${code}`);
  }, [room?.host_client_id, code, room, router]);

  const gameType = room?.game_type ?? null;
  const predictionMode = isPredictionGame(gameType) ? gameType : null;
  const mimeMode = isMimeGame(gameType);
  const jaugeMode = isJaugeGame(gameType);
  const gameDefinition = getGameDefinition(gameType);
  const questionSourceSettings = useMemo(
    () => getQuestionSourceSettings(room?.question_source_settings),
    [room?.question_source_settings]
  );
  const currentSnapshotQuestion = useMemo(
    () => {
      const snapshot = questionFromSnapshot(room?.current_question_snapshot);
      return snapshot && snapshot.id === room?.current_question_id && snapshot.gameType === gameType ? snapshot : undefined;
    },
    [gameType, room?.current_question_id, room?.current_question_snapshot]
  );
  const currentQ = currentSnapshotQuestion ?? getQuestionForGame(gameType, room?.current_question_id);
  const mimeGameState = useMemo(() => getMimeGameState(room?.mime_game_state), [room?.mime_game_state]);
  const jaugeGameState = useMemo(() => getJaugeGameState(room?.jauge_game_state), [room?.jauge_game_state]);
  const currentMimePlayer = useMemo(
    () => players.find((player) => player.id === mimeGameState?.currentMimePlayerId),
    [mimeGameState?.currentMimePlayerId, players]
  );
  const currentJaugeQuestion = useMemo(
    () => getJaugeCurrentQuestion(jaugeGameState, room?.current_question_id),
    [jaugeGameState, room?.current_question_id]
  );
  const currentJaugeTarget = useMemo(
    () => players.find((player) => player.id === jaugeGameState?.currentTargetPlayerId) ?? null,
    [jaugeGameState?.currentTargetPlayerId, players]
  );
  const requiredJaugeVoters = useMemo(
    () => getJaugeRequiredVoters(players, jaugeGameState),
    [jaugeGameState, players]
  );
  const currentJaugeRatings = useMemo(
    () =>
      jaugeGameState && room?.current_question_id
        ? ratings.filter((rating) => rating.question_id === room.current_question_id && rating.target_player_id === jaugeGameState.currentTargetPlayerId)
        : [],
    [jaugeGameState, ratings, room?.current_question_id]
  );
  const mySubmittedQuestionCount = useMemo(
    () =>
      me && gameType
        ? customQuestions.filter((question) => question.game_type === gameType && question.author_player_id === me.id).length
        : 0,
    [customQuestions, gameType, me]
  );

  useEffect(() => {
    setSelectedOption(null);
    setSelectedPlayerId(null);
    setSelectedPredictionOption(null);
    setSelectedRating(null);
    setSubmitting(false);
    setOptimisticVote(null);
    setOptimisticRating(null);
  }, [currentQ?.id, currentJaugeQuestion?.id]);

  const currentVotes = useMemo(
    () =>
      currentQ && gameType
        ? votes.filter((vote) => vote.game_type === gameType && vote.question_id === currentQ.id)
        : [],
    [votes, currentQ, gameType]
  );
  const myVote = useMemo<Vote | undefined>(() => {
    if (!me) return undefined;
    return currentVotes.find((vote) => vote.voter_player_id === me.id);
  }, [me, currentVotes]);
  const myRating = useMemo(() => {
    if (!me || !currentJaugeQuestion) return undefined;
    return currentJaugeRatings.find((rating) => rating.voter_player_id === me.id);
  }, [currentJaugeQuestion, currentJaugeRatings, me]);

  const effectiveVote =
    optimisticVote && currentQ && optimisticVote.qid === currentQ.id
      ? optimisticVote
      : voteToLocalVote(myVote);
  const effectiveRating =
    optimisticRating && currentJaugeQuestion && optimisticRating.qid === currentJaugeQuestion.id
      ? optimisticRating.rating
      : myRating?.rating ?? null;
  const voteDuration = room?.vote_duration_sec ?? DEFAULT_VOTE_DURATION_SEC;
  const revealDuration = room?.reveal_duration_sec ?? DEFAULT_REVEAL_DURATION_SEC;
  const mimeRoundLeft = useCountdown(
    mimeMode && room?.status === "question_active" ? room.question_started_at : null,
    mimeGameState?.timerDuration ?? voteDuration
  );

  async function submitVote() {
    setVoteError(null);
    if (!room || !gameType) { setVoteError("Partie non configurée."); return; }
    if (!currentQ) { setVoteError("Aucune question active."); return; }
    if (!me) {
      setVoteError(
        `Tu n'es pas dans la liste des joueurs (${players.length} chargé${players.length > 1 ? "s" : ""}). Reviens à l'accueil pour rejoindre à nouveau.`
      );
      return;
    }
    if (effectiveVote || submitting) return;

    const selected_option =
      gameType === "who_would"
        ? selectedOption
        : isPredictionGame(gameType)
          ? selectedPredictionOption
          : null;
    const selected_player_id = gameType === "who_of_us" ? selectedPlayerId : null;
    if (gameType === "who_would" && !selected_option) return;
    if (isPredictionGame(gameType) && !selected_option) return;
    if (gameType === "who_of_us" && !selected_player_id) return;

    setSubmitting(true);
    setOptimisticVote({ qid: currentQ.id, selected_option, selected_player_id });

    try {
      const { error } = await getSupabase().from("votes").upsert(
        {
          room_id: room.id,
          game_type: gameType,
          voter_player_id: me.id,
          question_id: currentQ.id,
          selected_option,
          selected_player_id,
        },
        { onConflict: "room_id,game_type,question_id,voter_player_id" }
      );
      if (error) throw error;
      await refresh();
    } catch (err) {
      setVoteError(err instanceof Error ? err.message : "Erreur d'enregistrement du vote.");
      setOptimisticVote(null);
    } finally {
      setSubmitting(false);
    }
  }

  async function submitRating() {
    setVoteError(null);
    if (!room || !jaugeGameState || !currentJaugeQuestion) { setVoteError("Aucune jauge active."); return; }
    if (!me) { setVoteError("Tu n'es pas dans la liste des joueurs."); return; }
    if (!requiredJaugeVoters.some((player) => player.id === me.id)) return;
    if (!selectedRating || effectiveRating || submitting) return;

    setSubmitting(true);
    setOptimisticRating({ qid: currentJaugeQuestion.id, rating: selectedRating });

    try {
      const { error } = await getSupabase().from("ratings").upsert(
        {
          room_id: room.id,
          game_type: "jauge",
          voter_player_id: me.id,
          target_player_id: jaugeGameState.currentTargetPlayerId,
          question_id: currentJaugeQuestion.id,
          rating: selectedRating,
          is_anonymous: jaugeGameState.anonymityMode !== "visible",
        },
        { onConflict: "room_id,question_id,voter_player_id" }
      );
      if (error) throw error;
      await refresh();
    } catch (err) {
      setVoteError(err instanceof Error ? err.message : "Erreur d'enregistrement de la note.");
      setOptimisticRating(null);
    } finally {
      setSubmitting(false);
    }
  }

  async function submitPlayerQuestion() {
    setVoteError(null);
    if (!room || !gameType || !me || submittingQuestion) return;
    if (mySubmittedQuestionCount >= questionSourceSettings.maxQuestionsPerPlayer) {
      setVoteError("Tu as déjà proposé le maximum de questions pour ce jeu.");
      return;
    }
    const submission = buildCustomQuestionSubmission({
      gameType,
      text: questionDraft,
      optionA: questionOptionA,
      optionB: questionOptionB,
      options: questionOptions,
    });
    if (!submission) {
      setVoteError("Question incomplète pour ce mode.");
      return;
    }
    setSubmittingQuestion(true);
    try {
      const { error } = await getSupabase().from("custom_questions").insert({
        room_id: room.id,
        author_player_id: me.id,
        game_type: gameType,
        local_question_id: generateLocalQuestionId("live"),
        question_text: submission.questionText,
        category: submission.category,
        payload: submission.payload,
      });
      if (error) throw error;
      setQuestionDraft("");
      setQuestionOptionA("");
      setQuestionOptionB("");
      setQuestionOptions("");
      await refresh();
    } catch (err) {
      setVoteError(err instanceof Error ? err.message : "Erreur d'ajout de question.");
    } finally {
      setSubmittingQuestion(false);
    }
  }

  if (loading) return <CenteredMessage title="Chargement..." />;
  if (error || !room)
    return <CenteredMessage title="Salle introuvable" subtitle={error ?? undefined} action={{ label: "Retour", href: "/" }} />;
  if (!me)
    return <CenteredMessage title="Tu n'as pas encore rejoint cette salle" action={{ label: "Rejoindre", href: "/" }} />;
  if (room.status === "ended")
    return (
      <CenteredMessage
        title="Partie terminée"
        subtitle="L'hôte a clôturé la salle."
        action={{ label: "Accueil", href: "/" }}
      />
    );
  if (room.status === "end_game_summary")
    return (
      <EndGameSummaryPanel
        gameType={gameType}
        players={players}
        votes={votes}
        ratings={ratings}
        askedQuestions={askedQuestions}
        roundQuestionIds={room.round_question_ids ?? []}
        mimeGameState={mimeGameState}
        jaugeGameState={jaugeGameState}
      />
    );

  const targetPlayers = players;

  return (
    <main className="game-stage mx-auto flex min-h-dvh max-w-md flex-col px-5 py-6">
      <PlayerHeader
        code={room.code}
        me={me}
        totalPlayers={players.length}
        gameLabel={gameDefinition?.shortLabel}
      />

      {voteError && (
        <div className="card mb-3 border-neon-pink/60 bg-neon-pink/10 p-3 text-center text-neon-pink">
          {voteError}
        </div>
      )}

      {room.status === "lobby" && (
        <Lobby
          players={players}
          gameLabel={gameDefinition?.label}
          preparingMime={gameType === "mime_expressions"}
          preparingJauge={gameType === "jauge"}
          gameType={gameType}
          allowQuestions={questionSourceSettings.useLiveQuestions}
          playerQuestionCount={customQuestions.filter((question) => question.game_type === gameType).length}
          myQuestionCount={mySubmittedQuestionCount}
          maxQuestionsPerPlayer={questionSourceSettings.maxQuestionsPerPlayer}
          questionDraft={questionDraft}
          questionOptionA={questionOptionA}
          questionOptionB={questionOptionB}
          questionOptions={questionOptions}
          submittingQuestion={submittingQuestion}
          onQuestionDraftChange={setQuestionDraft}
          onQuestionOptionAChange={setQuestionOptionA}
          onQuestionOptionBChange={setQuestionOptionB}
          onQuestionOptionsChange={setQuestionOptions}
          onSubmitQuestion={submitPlayerQuestion}
        />
      )}

      {room.status === "question_active" && currentQ && mimeGameState && gameType === "mime_expressions" && (
        <MimeRoundScreen
          expression={currentQ as MimeExpressionQuestion}
          state={mimeGameState}
          me={me}
          currentMimePlayer={currentMimePlayer}
          roundLeft={mimeRoundLeft}
          totalRounds={room.total_questions}
        />
      )}

      {room.status === "question_active" && currentQ && gameType === "who_would" && (
        <WhoWouldVoteScreen
          question={currentQ as WhoWouldQuestion}
          startedAt={room.question_started_at}
          durationSec={voteDuration}
          selectedChoice={selectedOption}
          validatedChoice={effectiveVote?.selected_option ?? null}
          submitting={submitting}
          onSelect={setSelectedOption}
          onSubmit={submitVote}
        />
      )}

      {room.status === "question_active" && currentQ && gameType === "who_of_us" && (
        <WhoOfUsVoteScreen
          question={currentQ as WhoOfUsGameQuestion}
          startedAt={room.question_started_at}
          durationSec={voteDuration}
          players={targetPlayers}
          selectedPlayerId={selectedPlayerId}
          validatedPlayerId={effectiveVote?.selected_player_id ?? null}
          submitting={submitting}
          onSelect={setSelectedPlayerId}
          onSubmit={submitVote}
        />
      )}

      {room.status === "question_active" && currentQ && predictionMode && (
        <PredictionVoteScreen
          mode={predictionMode}
          question={currentQ as PredictionGameQuestion}
          startedAt={room.question_started_at}
          durationSec={voteDuration}
          selectedOption={selectedPredictionOption}
          validatedOption={effectiveVote?.selected_option ?? null}
          submitting={submitting}
          onSelect={setSelectedPredictionOption}
          onSubmit={submitVote}
        />
      )}

      {room.status === "question_active" && currentJaugeQuestion && jaugeGameState && jaugeMode && (
        <JaugeVoteScreen
          question={currentJaugeQuestion}
          targetPlayer={currentJaugeTarget}
          currentPlayer={me}
          startedAt={room.question_started_at}
          durationSec={voteDuration}
          selectedRating={selectedRating}
          validatedRating={effectiveRating}
          submitting={submitting}
          brutalMode={jaugeGameState.brutalMode}
          canRate={requiredJaugeVoters.some((player) => player.id === me.id) && !effectiveRating}
          votedCount={countSubmittedRatings(requiredJaugeVoters, currentJaugeRatings)}
          totalVoters={requiredJaugeVoters.length}
          onSelect={setSelectedRating}
          onSubmit={submitRating}
        />
      )}

      {room.status === "reveal_results" && currentQ && mimeGameState && gameType === "mime_expressions" && (
        <MimeRevealScreen
          expression={currentQ as MimeExpressionQuestion}
          state={mimeGameState}
          currentMimePlayer={currentMimePlayer}
          totalRounds={room.total_questions}
        />
      )}

      {room.status === "reveal_results" && currentQ && gameType === "who_would" && (
        <WhoWouldReveal
          question={currentQ as WhoWouldQuestion}
          players={players}
          votes={currentVotes}
          revealStartedAt={room.reveal_started_at}
          revealDurationSec={revealDuration}
          autoplay={room.autoplay}
        />
      )}

      {room.status === "reveal_results" && currentQ && gameType === "who_of_us" && (
        <WhoOfUsReveal
          question={currentQ as WhoOfUsGameQuestion}
          players={players}
          votes={currentVotes}
          revealStartedAt={room.reveal_started_at}
          revealDurationSec={revealDuration}
          autoplay={room.autoplay}
        />
      )}

      {room.status === "reveal_results" && currentQ && predictionMode && (
        <PredictionRevealPanel
          mode={predictionMode}
          question={currentQ as PredictionGameQuestion}
          players={players}
          votes={currentVotes}
          revealStartedAt={room.reveal_started_at}
          revealDurationSec={revealDuration}
          autoplay={room.autoplay}
        />
      )}

      {room.status === "reveal_results" && currentJaugeQuestion && jaugeGameState && jaugeMode && (
        <JaugeRevealPanel
          question={currentJaugeQuestion}
          targetPlayerId={jaugeGameState.currentTargetPlayerId}
          players={players}
          ratings={currentJaugeRatings}
          anonymityMode={jaugeGameState.anonymityMode}
        />
      )}

      {room.status === "scoreboard" && predictionMode && (
        <PredictionScoreboardPanel
          mode={predictionMode}
          players={players}
          votes={votes}
          currentQuestionId={currentQ?.id ?? null}
          scoreTarget={room.score_target}
        />
      )}
    </main>
  );
}

function PlayerHeader({
  code,
  me,
  totalPlayers,
  gameLabel,
}: {
  code: string;
  me: Player;
  totalPlayers: number;
  gameLabel: string | undefined;
}) {
  return (
    <header className="card game-topbar mb-4 flex items-center justify-between p-4">
      <div>
        <div className="text-xs uppercase tracking-wider text-white/50">Salle</div>
        <div className="text-xl font-black tracking-widest">{code}</div>
        {gameLabel && <div className="mt-1 text-xs text-neon-cyan">{gameLabel}</div>}
      </div>
      <div className="text-right">
        <div className="text-xs uppercase tracking-wider text-white/50">Toi</div>
        <div className="text-lg font-bold">{me.name}</div>
        <div className="text-xs text-white/50">{totalPlayers} joueurs</div>
      </div>
    </header>
  );
}

function Lobby({
  players,
  gameLabel,
  preparingMime,
  preparingJauge,
  gameType,
  allowQuestions,
  playerQuestionCount,
  myQuestionCount,
  maxQuestionsPerPlayer,
  questionDraft,
  questionOptionA,
  questionOptionB,
  questionOptions,
  submittingQuestion,
  onQuestionDraftChange,
  onQuestionOptionAChange,
  onQuestionOptionBChange,
  onQuestionOptionsChange,
  onSubmitQuestion,
}: {
  players: Player[];
  gameLabel: string | undefined;
  preparingMime: boolean;
  preparingJauge: boolean;
  gameType: GameType | null;
  allowQuestions: boolean;
  playerQuestionCount: number;
  myQuestionCount: number;
  maxQuestionsPerPlayer: number;
  questionDraft: string;
  questionOptionA: string;
  questionOptionB: string;
  questionOptions: string;
  submittingQuestion: boolean;
  onQuestionDraftChange: (value: string) => void;
  onQuestionOptionAChange: (value: string) => void;
  onQuestionOptionBChange: (value: string) => void;
  onQuestionOptionsChange: (value: string) => void;
  onSubmitQuestion: () => void;
}) {
  const title = preparingMime
    ? "L'hôte prépare l'ordre de passage"
    : preparingJauge
      ? "L'hôte prépare la Jauge"
      : gameLabel
        ? "En attente de la question"
        : "Choix du jeu en cours";
  const subtitle = preparingMime
    ? "La partie démarre dès que l'ordre est validé."
    : preparingJauge
      ? "La cible et les règles de notes arrivent dans un instant."
      : gameLabel
        ? `${gameLabel} va commencer.`
        : "L'hôte prépare la partie.";

  return (
    <section className="card game-panel-enter flex flex-1 flex-col items-center justify-center p-8 text-center">
      <div className="animate-floaty text-6xl">🎉</div>
      <h2 className="mt-4 text-2xl font-bold">{title}</h2>
      <p className="mt-2 text-white/60">{subtitle}</p>

      {gameType && allowQuestions && (
        <div className="mt-6 w-full rounded-2xl border border-neon-cyan/30 bg-neon-cyan/10 p-4 text-left">
          <div className="text-xs font-black uppercase tracking-wider text-neon-cyan">Question joueur</div>
          {gameType === "who_would" ? (
            <div className="mt-3 grid gap-2">
              <input className="input rounded-2xl p-3" value={questionOptionA} onChange={(event) => onQuestionOptionAChange(event.target.value)} placeholder="Option A" />
              <input className="input rounded-2xl p-3" value={questionOptionB} onChange={(event) => onQuestionOptionBChange(event.target.value)} placeholder="Option B" />
            </div>
          ) : (
            <textarea
              value={questionDraft}
              onChange={(event) => onQuestionDraftChange(event.target.value)}
              maxLength={180}
              rows={3}
              className="input mt-3 min-h-24 w-full resize-none rounded-2xl p-3"
              placeholder={gameType === "jauge" ? "À quel point cette personne..." : "Écris ta question..."}
            />
          )}
          {(gameType === "majority" || gameType === "minority") && (
            <textarea
              value={questionOptions}
              onChange={(event) => onQuestionOptionsChange(event.target.value)}
              rows={3}
              className="input mt-2 min-h-20 w-full resize-none rounded-2xl p-3"
              placeholder="Options, une par ligne"
            />
          )}
          <button
            type="button"
            disabled={submittingQuestion || myQuestionCount >= maxQuestionsPerPlayer}
            onClick={onSubmitQuestion}
            className="btn-secondary mt-3 w-full"
          >
            {submittingQuestion ? "Ajout..." : myQuestionCount >= maxQuestionsPerPlayer ? "Limite atteinte" : "Proposer la question"}
          </button>
          <p className="mt-2 text-center text-xs font-semibold text-white/45">
            {playerQuestionCount} proposée{playerQuestionCount > 1 ? "s" : ""} dans la room · toi {myQuestionCount}/{maxQuestionsPerPlayer}
          </p>
        </div>
      )}

      <div className="mt-6 w-full">
        <div className="text-xs uppercase tracking-wider text-white/50">Joueurs</div>
        <ul className="mt-2 flex flex-wrap justify-center gap-2">
          {players.map((p) => (
            <li key={p.id} className="chip animate-pop-in">
              {p.is_host ? "👑 " : ""}{p.name}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function MimeRoundScreen({
  expression,
  state,
  me,
  currentMimePlayer,
  roundLeft,
  totalRounds,
}: {
  expression: MimeExpressionQuestion;
  state: MimeGameState;
  me: Player;
  currentMimePlayer: Player | undefined;
  roundLeft: number;
  totalRounds: number;
}) {
  const category = getCategoryForGame("mime_expressions", expression.category);
  const isMime = me.id === state.currentMimePlayerId;
  const isInOrder = state.playerOrder.includes(me.id);
  const timeIsHot = roundLeft <= 5;
  const ended = state.roundStatus === "ended" || roundLeft === 0;

  return (
    <section key={state.currentMimePlayerId} className="game-panel-enter flex flex-1 flex-col animate-reveal-in">
      <div className="card mb-3 flex items-center justify-between gap-3 p-3 px-4">
        {category && <span className="chip">{category.emoji} {category.label}</span>}
        <div className={timeIsHot ? "timer-hot text-neon-pink" : "text-white"}>
          <span className="text-3xl font-black tabular-nums">{roundLeft}</span>
          <span className="ml-2 text-white/60">sec</span>
        </div>
      </div>

      <div className="card flex flex-1 flex-col justify-center p-6 text-center">
        <div className="text-xs font-bold uppercase tracking-wider text-white/50">
          Manche {state.roundNumber} / {totalRounds}
        </div>
        <h2 className="mt-3 text-3xl font-black leading-tight">
          {isMime ? "À toi de mimer" : `${currentMimePlayer?.name ?? "Un joueur"} mime`}
        </h2>

        {isMime ? (
          <div className="mt-6 rounded-2xl border border-neon-cyan/40 bg-neon-cyan/10 p-5">
            <div className="text-xs font-bold uppercase tracking-wider text-neon-cyan">Expression à mimer</div>
            <div className="mt-3 text-3xl font-black leading-tight">{expression.text}</div>
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="text-xs font-bold uppercase tracking-wider text-white/50">À deviner</div>
            <div className="mt-3 text-xl font-bold text-white/80">
              Regarde le mime, pas besoin de toucher au téléphone.
            </div>
          </div>
        )}

        {!isInOrder && (
          <p className="mt-4 text-sm text-neon-yellow">
            Tu observes cette partie, l'hôte peut t'ajouter à l'ordre.
          </p>
        )}
        {ended && (
          <p className="mt-4 text-sm font-semibold text-neon-pink">
            Temps écoulé, l'hôte choisit la suite.
          </p>
        )}
      </div>
    </section>
  );
}

function MimeRevealScreen({
  expression,
  state,
  currentMimePlayer,
  totalRounds,
}: {
  expression: MimeExpressionQuestion;
  state: MimeGameState;
  currentMimePlayer: Player | undefined;
  totalRounds: number;
}) {
  const category = getCategoryForGame("mime_expressions", expression.category);

  return (
    <section key={`revealed-${state.currentExpressionId}`} className="card game-panel-enter flex flex-1 flex-col justify-center p-6 text-center animate-reveal-in">
      <div className="mb-4 flex flex-wrap justify-center gap-2">
        {category && <span className="chip">{category.emoji} {category.label}</span>}
        <span className="chip">Manche {state.roundNumber} / {totalRounds}</span>
      </div>

      <div className="rounded-2xl border border-neon-green/40 bg-neon-green/10 p-5">
        <div className="text-xs font-bold uppercase tracking-wider text-neon-green">Expression révélée</div>
        <div className="mt-3 text-4xl font-black leading-tight">{expression.text}</div>
      </div>
      <p className="mt-4 text-white/60">
        Mime : <span className="font-bold text-white">{currentMimePlayer?.name ?? "Joueur absent"}</span>
      </p>
    </section>
  );
}

function VoteShell({
  category,
  startedAt,
  durationSec,
  children,
}: {
  category: ReturnType<typeof getCategoryForGame>;
  startedAt: string | null;
  durationSec: number;
  children: ReactNode;
}) {
  const left = useCountdown(startedAt, durationSec);

  return (
    <section className="game-panel-enter flex flex-1 flex-col animate-reveal-in">
      <div className="card mb-3 flex items-center justify-between p-3 px-4">
        {category && <span className="chip">{category.emoji} {category.label}</span>}
        <div className={left <= 5 ? "timer-hot text-neon-pink" : ""}>
          <span className="text-3xl font-black tabular-nums">{left}</span>
          <span className="ml-2 text-white/60">sec</span>
        </div>
      </div>
      {children}
    </section>
  );
}

function WhoWouldVoteScreen({
  question,
  startedAt,
  durationSec,
  selectedChoice,
  validatedChoice,
  submitting,
  onSelect,
  onSubmit,
}: {
  question: WhoWouldQuestion;
  startedAt: string | null;
  durationSec: number;
  selectedChoice: Choice | null;
  validatedChoice: Choice | null;
  submitting: boolean;
  onSelect: (c: Choice) => void;
  onSubmit: () => void;
}) {
  const left = useCountdown(startedAt, durationSec);
  const locked = Boolean(validatedChoice) || submitting || left === 0;
  const category = getCategoryForGame("who_would", question.category);

  return (
    <VoteShell category={category} startedAt={startedAt} durationSec={durationSec}>
      <div className="grid flex-1 gap-3">
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
      <SubmitButton
        canSubmit={Boolean(selectedChoice) && !locked}
        validated={Boolean(validatedChoice)}
        submitting={submitting}
        onSubmit={onSubmit}
      />
    </VoteShell>
  );
}

function WhoOfUsVoteScreen({
  question,
  startedAt,
  durationSec,
  players,
  selectedPlayerId,
  validatedPlayerId,
  submitting,
  onSelect,
  onSubmit,
}: {
  question: WhoOfUsGameQuestion;
  startedAt: string | null;
  durationSec: number;
  players: Player[];
  selectedPlayerId: string | null;
  validatedPlayerId: string | null;
  submitting: boolean;
  onSelect: (playerId: string) => void;
  onSubmit: () => void;
}) {
  const left = useCountdown(startedAt, durationSec);
  const locked = Boolean(validatedPlayerId) || submitting || left === 0;
  const category = getCategoryForGame("who_of_us", question.category);
  const activePlayerId = validatedPlayerId ?? selectedPlayerId;

  return (
    <VoteShell category={category} startedAt={startedAt} durationSec={durationSec}>
      <div className="card mb-3 p-4">
        <div className="text-xs font-bold uppercase tracking-wider text-white/50">Question</div>
        <h2 className="mt-2 text-2xl font-black leading-tight">{question.text}</h2>
      </div>
      <div className="grid flex-1 gap-2">
        {players.map((player) => (
          <PlayerTargetButton
            key={player.id}
            player={player}
            selected={activePlayerId === player.id}
            disabled={locked}
            onClick={() => onSelect(player.id)}
          />
        ))}
      </div>
      <SubmitButton
        canSubmit={Boolean(selectedPlayerId) && !locked}
        validated={Boolean(validatedPlayerId)}
        submitting={submitting}
        onSubmit={onSubmit}
      />
    </VoteShell>
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
      onClick={() => {
        triggerHaptic(10);
        onClick();
      }}
      className={`prediction-card flex w-full flex-col items-center justify-center rounded-3xl border-2 p-6 text-center transition duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 ${base} ${selected ? selectedClass : "hover:-translate-y-0.5 hover:bg-white/10"}`}
    >
      <span className={`text-sm font-bold uppercase tracking-widest ${labelColor}`}>
        Option {label}
      </span>
      <span className="mt-3 text-2xl font-bold leading-tight">{text}</span>
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
      onClick={() => {
        triggerHaptic(10);
        onClick();
      }}
      className={`prediction-card flex items-center justify-between rounded-2xl border p-4 text-left transition duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 ${
        selected
          ? "border-neon-cyan bg-neon-cyan/10 shadow-glow-cyan"
          : "border-white/10 bg-white/5 hover:-translate-y-0.5 hover:border-neon-cyan/50"
      }`}
    >
      <span className="flex min-w-0 items-center gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-black text-white"
          style={{ background: player.color ? `linear-gradient(135deg, ${player.color}, rgba(34, 211, 238, 0.72))` : "rgba(255,255,255,0.12)" }}
        >
          {player.avatar || player.name.slice(0, 1).toUpperCase()}
        </span>
        <span className="truncate text-xl font-black">{player.name}</span>
      </span>
      {selected && <span className="text-sm font-bold text-neon-cyan">Sélectionné</span>}
    </button>
  );
}

function SubmitButton({
  canSubmit,
  validated,
  submitting,
  onSubmit,
}: {
  canSubmit: boolean;
  validated: boolean;
  submitting: boolean;
  onSubmit: () => void;
}) {
  return (
    <>
      <button
        type="button"
        disabled={!canSubmit}
        onClick={() => {
          triggerHaptic([12, 30, 18]);
          onSubmit();
        }}
        className="btn-primary mt-4 w-full disabled:shadow-none"
      >
        {submitting ? "Envoi..." : validated ? "Vote envoyé" : "Valider mon choix"}
      </button>
      {validated && (
        <p className="mt-3 text-center text-sm font-semibold text-neon-green">Vote envoyé</p>
      )}
    </>
  );
}

function WhoWouldReveal({
  question,
  players,
  votes,
  revealStartedAt,
  revealDurationSec,
  autoplay,
}: {
  question: WhoWouldQuestion;
  players: Player[];
  votes: Vote[];
  revealStartedAt: string | null;
  revealDurationSec: number;
  autoplay: boolean;
}) {
  const revealLeft = useCountdown(autoplay ? revealStartedAt : null, revealDurationSec);
  const category = getCategoryForGame("who_would", question.category);
  const stats = getWhoWouldStats(players, votes);
  const namesFor = (choice: Choice) =>
    votes
      .filter((vote) => vote.selected_option === choice)
      .map((vote) => players.find((player) => player.id === vote.voter_player_id)?.name)
      .filter((name): name is string => Boolean(name));

  return (
    <RevealShell category={category} totalVotes={stats.total} revealLeft={revealLeft} autoplay={autoplay}>
      <div className="grid flex-1 gap-3">
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

function WhoOfUsReveal({
  question,
  players,
  votes,
  revealStartedAt,
  revealDurationSec,
  autoplay,
}: {
  question: WhoOfUsGameQuestion;
  players: Player[];
  votes: Vote[];
  revealStartedAt: string | null;
  revealDurationSec: number;
  autoplay: boolean;
}) {
  const revealLeft = useCountdown(autoplay ? revealStartedAt : null, revealDurationSec);
  const category = getCategoryForGame("who_of_us", question.category);
  const stats = getWhoOfUsStats(players, votes);

  return (
    <RevealShell category={category} totalVotes={stats.total} revealLeft={revealLeft} autoplay={autoplay}>
      <div className="card mb-3 p-4">
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
  children,
}: {
  category: ReturnType<typeof getCategoryForGame>;
  totalVotes: number;
  revealLeft: number;
  autoplay: boolean;
  children: ReactNode;
}) {
  return (
    <section className="game-panel-enter flex flex-1 flex-col">
      <div className="card mb-3 flex items-center justify-between p-3 px-4">
        {category && <span className="chip">{category.emoji} {category.label}</span>}
        <span className="text-xs uppercase tracking-wider text-white/50">Résultats</span>
      </div>
      {children}
      <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
        <div className="text-xs uppercase tracking-wider text-white/50">
          {totalVotes} vote{totalVotes > 1 ? "s" : ""} validé{totalVotes > 1 ? "s" : ""}
        </div>
        {autoplay && <div className="mt-1 text-3xl font-black tabular-nums">{revealLeft}s</div>}
      </div>
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
  const shownPercent = useCountUp(percent);

  return (
    <div className="flex flex-col rounded-3xl border border-white/10 bg-white/5 p-4 animate-reveal-in">
      <div className={`text-sm font-bold uppercase tracking-widest ${labelColor}`}>{label}</div>
      <div className="mt-2 text-lg font-semibold text-white/90">{text}</div>
      <div className="mt-4 flex items-end justify-between gap-3">
        <div className="text-4xl font-black tabular-nums">{shownPercent}%</div>
        <div className="pb-1 text-sm text-white/60">
          {count} vote{count > 1 ? "s" : ""}
        </div>
      </div>
      <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/10">
        <div className={`result-fill h-full rounded-full ${barColor}`} style={{ width: `${percent}%` }} />
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
    <div className={`rounded-2xl border p-4 animate-reveal-in ${isTop ? "border-neon-yellow/60 bg-neon-yellow/10 shadow-glow" : "border-white/10 bg-white/5"}`}>
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
    <main className="game-stage mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 text-center">
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

function voteToLocalVote(vote: Vote | undefined): LocalVote | null {
  if (!vote) return null;
  return {
    qid: vote.question_id,
    selected_option: vote.selected_option,
    selected_player_id: vote.selected_player_id,
  };
}

function countSubmittedRatings(requiredPlayers: Player[], ratings: Rating[]): number {
  const requiredIds = new Set(requiredPlayers.map((player) => player.id));
  const voterIds = new Set(
    ratings
      .filter((rating) => requiredIds.has(rating.voter_player_id) && rating.rating >= 1 && rating.rating <= 10)
      .map((rating) => rating.voter_player_id)
  );
  return voterIds.size;
}

function buildCustomQuestionSubmission({
  gameType,
  text,
  optionA,
  optionB,
  options,
}: {
  gameType: GameType;
  text: string;
  optionA: string;
  optionB: string;
  options: string;
}): { questionText: string; category: string; payload: Record<string, unknown> } | null {
  if (gameType === "who_would") {
    const a = optionA.trim();
    const b = optionB.trim();
    if (a.length < 2 || b.length < 2) return null;
    return { questionText: `${a} / ${b}`, category: "joueurs", payload: { optionA: a, optionB: b } };
  }
  if (gameType === "majority" || gameType === "minority") {
    const cleanText = text.trim().replace(/\s+/g, " ");
    const parsedOptions = options
      .split(/\n|,/)
      .map((option) => option.trim())
      .filter(Boolean)
      .slice(0, 8);
    if (cleanText.length < 8 || parsedOptions.length < 2) return null;
    return { questionText: cleanText, category: "joueurs", payload: { options: parsedOptions } };
  }
  const cleanText = text.trim().replace(/\s+/g, " ");
  if (cleanText.length < 8) return null;
  return { questionText: cleanText, category: "joueurs", payload: {} };
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
    const voterName = playerById.get(vote.voter_player_id)?.name ?? "Joueur parti";
    const row = ranking.get(vote.selected_player_id) ?? {
      targetId: vote.selected_player_id,
      targetName: target?.name ?? "Joueur parti",
      count: 0,
      voters: [],
    };
    row.count += 1;
    row.voters.push(voterName);
    ranking.set(vote.selected_player_id, row);
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
