"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import { AdminStatusBar } from "@/components/adminStatus";
import { AdminDebugPanel } from "@/components/adminDebugPanel";
import { AudioToggle } from "@/components/audioToggle";
import { PlayerAvatar } from "@/components/playerAvatar";
import { PlayersLobbyGrid } from "@/components/playersLobbyGrid";
import { ValidationParticles } from "@/components/validationParticles";
import { SaveQuestionButton } from "@/components/saveQuestionButton";
import { playSfx, primeAudio } from "@/lib/audio";
import { getSupabase } from "@/lib/supabase";
import { useRoom } from "@/lib/useRoom";
import { useValidationEvents } from "@/lib/useValidationEvents";
import { useCountdown } from "@/lib/useCountdown";
import {
  GAME_DEFINITIONS,
  type GameCategory,
  type GameQuestion,
  type MimeExpressionQuestion,
  type PredictionGameQuestion,
  type WhoOfUsGameQuestion,
  type WhoWouldQuestion,
  getCategoryForGame,
  getDefaultCategories,
  getGameCategories,
  getGameDefinition,
  getQuestionForGame,
  getQuestionsForGame,
} from "@/lib/gameQuestions";
import { useProfile } from "@/lib/useProfile";
import { useSavedQuestions } from "@/lib/useSavedQuestions";
import {
  buildQuestionPlan,
  buildQuestionPlanWithDiagnostics,
  pickNextQuestionFromPlan,
} from "@/lib/questionPoolEngine";
import {
  generateLocalQuestionId,
  makeQuestionSnapshot,
  questionFromSnapshot,
} from "@/lib/questionPoolTransform";
import { getQuestionSourceSettings, type QuestionPoolDiagnostics, type QuestionPoolItem } from "@/lib/questionPoolTypes";
import { saveQuestionToLibrary } from "@/lib/saveQuestion";
import { buildCustomQuestionSubmission, hasDuplicateCustomQuestion } from "@/lib/customQuestionSubmission";
import {
  buildMimeGameState,
  findNextMimeIndex,
  getArrivalOrder,
  getMimeGameState,
  getOrderedPlayers,
  getPlayersOutsideOrder,
  isMimeGame,
  mergePlayerOrder,
  moveId,
  prunePlayerOrder,
  shuffleIds,
  type MimeOrderMode,
} from "@/lib/mimeGame";
import {
  MIME_MODES,
  getMimeModeMeta,
  getMimeModeTimerSeconds,
  pickModeFlavor,
  type MimeMode,
} from "@/lib/mimeModes";
import {
  buildInitialJaugeState,
  buildNextJaugeState,
  getJaugeCurrentQuestion,
  getJaugeGameState,
  getJaugeRequiredVoters,
  isJaugeGame,
  shuffleIds as shuffleJaugeIds,
} from "@/lib/jaugeGame";
import {
  PredictionRevealPanel,
  PredictionScoreboardPanel,
  PredictionVoteScreen,
} from "@/components/predictionMode";
import {
  JaugeRevealPanel,
  JaugeVoteScreen,
} from "@/components/jaugeMode";
import { IntrusHostFlow } from "@/components/intrusHostFlow";
import { isIntrusGame } from "@/lib/intrusGame";
import { EndGameSummaryPanel } from "@/components/endGameSummary";
import {
  computePredictionScores,
  hasReachedScoreTarget,
  isPredictionGame,
} from "@/lib/scoring";
import { useCountUp } from "@/lib/useCountUp";
import {
  DEFAULT_REVEAL_DURATION_SEC,
  DEFAULT_SCOREBOARD_DURATION_SEC,
  DEFAULT_TOTAL_QUESTIONS,
  DEFAULT_VOTE_DURATION_SEC,
  QUESTION_COUNT_PRESETS,
  REVEAL_DURATION_OPTIONS,
  SCORE_TARGET_OPTIONS,
  VOTE_DURATION_OPTIONS,
  clampInt,
  getOrCreateClientId,
  getParticipants,
  isTvRoom,
  secondsLeft,
  triggerHaptic,
} from "@/lib/utils";
import type {
  Choice,
  GameType,
  JaugeAnonymityMode,
  JaugeQuestionMode,
  JaugeTargetMode,
  Player,
  QuestionSourceSettings,
  Rating,
  Room,
  Vote,
} from "@/types/database";

type RoomConfigPatch = Partial<
  Pick<
    Room,
    | "game_type"
    | "current_question_id"
    | "selected_categories"
    | "total_questions"
    | "vote_duration_sec"
    | "reveal_duration_sec"
    | "scoreboard_duration_sec"
    | "autoplay"
    | "hide_scores"
    | "scoreboard_frequency"
    | "score_target"
    | "round_question_ids"
    | "question_source_settings"
    | "current_question_snapshot"
    | "mime_game_state"
    | "jauge_game_state"
    | "intrus_game_state"
  >
>;

interface LocalRating {
  qid: number;
  rating: number;
}

interface LocalVote {
  qid: number;
  selected_option: Choice | null;
  selected_player_id: string | null;
}

export default function HostPage() {
  const params = useParams<{ code: string }>();
  const code = params.code?.toUpperCase() ?? "";
  const router = useRouter();
  const { room, players, votes, ratings, customQuestions, askedQuestions, loading, error, refresh } = useRoom(code);
  const profileState = useProfile();
  const { savedQuestions, refresh: refreshSavedQuestions } = useSavedQuestions(room?.game_type, profileState.canManageQuestions);

  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showTransfer, setShowTransfer] = useState(false);
  const [customQuestionCount, setCustomQuestionCount] = useState(String(DEFAULT_TOTAL_QUESTIONS));
  const [hostSelectedOption, setHostSelectedOption] = useState<Choice | null>(null);
  const [hostSelectedPlayerId, setHostSelectedPlayerId] = useState<string | null>(null);
  const [hostSelectedPredictionOption, setHostSelectedPredictionOption] = useState<string | null>(null);
  const [hostSelectedRating, setHostSelectedRating] = useState<number | null>(null);
  const [hostSubmitting, setHostSubmitting] = useState(false);
  const [optimisticHostVote, setOptimisticHostVote] = useState<LocalVote | null>(null);
  const [optimisticHostRating, setOptimisticHostRating] = useState<LocalRating | null>(null);
  const [mimeOrderMode, setMimeOrderMode] = useState<MimeOrderMode>("arrival");
  const [mimeSelectedMode, setMimeSelectedMode] = useState<MimeMode>("classic");
  const [mimeCustomOrder, setMimeCustomOrder] = useState<string[]>([]);
  const [mimeRandomOrder, setMimeRandomOrder] = useState<string[]>([]);
  const [mimeHostPlayMode, setMimeHostPlayMode] = useState(true);
  const [jaugeTargetMode, setJaugeTargetMode] = useState<JaugeTargetMode>("random");
  const [jaugeQuestionMode, setJaugeQuestionMode] = useState<JaugeQuestionMode>("random");
  const [jaugeAnonymityMode, setJaugeAnonymityMode] = useState<JaugeAnonymityMode>("visible");
  const [jaugeCustomOrder, setJaugeCustomOrder] = useState<string[]>([]);
  const [jaugeRandomOrder, setJaugeRandomOrder] = useState<string[]>([]);
  const [jaugeBrutalMode, setJaugeBrutalMode] = useState(false);
  const [jaugeAutoJaugeMode, setJaugeAutoJaugeMode] = useState(false);
  const [jaugeAllowPlayerQuestions, setJaugeAllowPlayerQuestions] = useState(false);
  const [hostQuestionDraft, setHostQuestionDraft] = useState("");
  const [hostQuestionOptionA, setHostQuestionOptionA] = useState("");
  const [hostQuestionOptionB, setHostQuestionOptionB] = useState("");
  const [hostQuestionOptions, setHostQuestionOptions] = useState("");
  const [hostSubmittingQuestion, setHostSubmittingQuestion] = useState(false);
  const [savingQuestion, setSavingQuestion] = useState(false);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const transitionRef = useRef(false);

  useEffect(() => {
    if (room?.total_questions) setCustomQuestionCount(String(room.total_questions));
  }, [room?.total_questions]);

  useEffect(() => {
    setSaveNotice(null);
  }, [room?.current_question_id]);

  useEffect(() => {
    if (!room) return;
    const me = getOrCreateClientId();
    if (me !== room.host_client_id) router.replace(`/play/${code}`);
  }, [room?.host_client_id, code, room, router]);

  const me = useMemo(() => {
    const id = getOrCreateClientId();
    return players.find((p) => p.client_id === id);
  }, [players]);

  const tvMode = isTvRoom(room);
  const participants = useMemo(() => getParticipants(players, room), [players, room]);
  const participantCount = participants.length;

  const gameType = room?.game_type ?? null;
  const selectedCategories = useMemo(
    () => getSelectedCategories(room),
    [room]
  );

  useEffect(() => {
    setHostQuestionDraft("");
    setHostQuestionOptionA("");
    setHostQuestionOptionB("");
    setHostQuestionOptions("");
  }, [gameType]);

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
  const hostSubmittedQuestionCount = useMemo(
    () =>
      me && gameType
        ? customQuestions.filter((question) => question.game_type === gameType && question.author_player_id === me.id).length
        : 0,
    [customQuestions, gameType, me]
  );
  const liveQuestionCountForGame = useMemo(
    () => (gameType ? customQuestions.filter((question) => question.game_type === gameType).length : 0),
    [customQuestions, gameType]
  );
  const totalQuestions = room?.total_questions ?? DEFAULT_TOTAL_QUESTIONS;
  const voteDuration = room?.vote_duration_sec ?? DEFAULT_VOTE_DURATION_SEC;
  const revealDuration = room?.reveal_duration_sec ?? DEFAULT_REVEAL_DURATION_SEC;
  const scoreboardDuration = room?.scoreboard_duration_sec ?? DEFAULT_SCOREBOARD_DURATION_SEC;
  const autoplay = room?.autoplay ?? false;
  const predictionMode = isPredictionGame(gameType) ? gameType : null;
  const mimeMode = isMimeGame(gameType);
  const jaugeMode = isJaugeGame(gameType);
  const intrusMode = isIntrusGame(gameType);
  const mimeGameState = useMemo(() => getMimeGameState(room?.mime_game_state), [room?.mime_game_state]);
  const jaugeGameState = useMemo(() => getJaugeGameState(room?.jauge_game_state), [room?.jauge_game_state]);
  const mimeTimerDuration = mimeGameState?.timerDuration ?? voteDuration;
  const mimePlayerOrder = useMemo(() => mimeGameState?.playerOrder ?? [], [mimeGameState?.playerOrder]);
  const currentMimePlayer = useMemo(
    () => players.find((player) => player.id === mimeGameState?.currentMimePlayerId),
    [mimeGameState?.currentMimePlayerId, players]
  );
  const mimePlayersInOrder = useMemo(
    () => getOrderedPlayers(mimePlayerOrder, players),
    [mimePlayerOrder, players]
  );
  const mimePlayersOutsideOrder = useMemo(
    () => getPlayersOutsideOrder(mimePlayerOrder, players),
    [mimePlayerOrder, players]
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
  const submittedJaugeCount = useMemo(
    () => countSubmittedRatings(requiredJaugeVoters, currentJaugeRatings),
    [requiredJaugeVoters, currentJaugeRatings]
  );
  const allJaugeRatingsSubmitted =
    requiredJaugeVoters.length > 0 && submittedJaugeCount >= requiredJaugeVoters.length;
  const jaugeExternalQuestions = useMemo(
    () => {
      const externalSettings: QuestionSourceSettings = {
        ...questionSourceSettings,
        mode: questionSourceSettings.mode === "saved_only"
          ? "saved_only"
          : questionSourceSettings.mode === "players_only"
            ? "players_only"
            : "smart_mix",
        useSystemQuestions: false,
      };
      return buildQuestionPlan({
        gameType: "jauge",
        selectedCategories,
        totalQuestions,
        excludeIds: [],
        liveQuestions: customQuestions,
        savedQuestions,
        settings: externalSettings,
      })
        .filter((question) => question.gameType === "jauge")
        .map((question) => ({
          id: question.id,
          text: question.text,
          authorPlayerId: question.authorPlayerId ?? question.savedQuestionId ?? "saved",
          category: question.category,
          source: question.source === "saved" ? "saved" as const : "live" as const,
        }));
    },
    [customQuestions, questionSourceSettings, savedQuestions, selectedCategories, totalQuestions]
  );

  useEffect(() => {
    if (!mimeMode || room?.status !== "lobby") return;
    const arrivalOrder = getArrivalOrder(players);
    setMimeCustomOrder((prev) => {
      const base = prev.length ? prev : arrivalOrder;
      const next = mergePlayerOrder(base, players);
      return sameOrder(prev, next) ? prev : next;
    });
    setMimeRandomOrder((prev) => {
      const next = prev.length ? mergePlayerOrder(prev, players) : shuffleIds(arrivalOrder);
      return sameOrder(prev, next) ? prev : next;
    });
  }, [mimeMode, players, room?.status]);

  useEffect(() => {
    if (!jaugeMode || room?.status !== "lobby") return;
    const arrivalOrder = getArrivalOrder(players);
    setJaugeCustomOrder((prev) => {
      const base = prev.length ? prev : arrivalOrder;
      const next = mergePlayerOrder(base, players);
      return sameOrder(prev, next) ? prev : next;
    });
    setJaugeRandomOrder((prev) => {
      const next = prev.length ? mergePlayerOrder(prev, players) : shuffleJaugeIds(arrivalOrder);
      return sameOrder(prev, next) ? prev : next;
    });
  }, [jaugeMode, players, room?.status]);

  const askedForGameIds = useMemo(
    () =>
      gameType
        ? askedQuestions
            .filter((asked) => asked.game_type === gameType)
            .map((asked) => asked.question_id)
        : [],
    [askedQuestions, gameType]
  );
  const roundQuestionIds = useMemo(
    () => uniqueIds(room?.round_question_ids ?? []),
    [room?.round_question_ids]
  );
  const blockedQuestionIds = useMemo(() => {
    if (!currentQ || askedForGameIds.includes(currentQ.id)) return askedForGameIds;
    return [...askedForGameIds, currentQ.id];
  }, [askedForGameIds, currentQ]);
  const roundsPlayed = useMemo(() => {
    const ids = currentQ ? addUniqueId(roundQuestionIds, currentQ.id) : roundQuestionIds;
    return ids.length;
  }, [currentQ, roundQuestionIds]);

  const currentVotes = useMemo(
    () =>
      currentQ && gameType
        ? votes.filter((vote) => vote.game_type === gameType && vote.question_id === currentQ.id)
        : [],
    [votes, currentQ, gameType]
  );

  const questionPlanResult = useMemo(() => {
    if (!gameType) return null;
    return buildQuestionPlanWithDiagnostics({
      gameType,
      selectedCategories,
      totalQuestions,
      excludeIds: blockedQuestionIds,
      liveQuestions: customQuestions,
      savedQuestions,
      settings: questionSourceSettings,
    });
  }, [blockedQuestionIds, customQuestions, gameType, questionSourceSettings, savedQuestions, selectedCategories, totalQuestions]);
  const filteredAvailable = useMemo(() => {
    if (!gameType) return [];
    return questionPlanResult?.plan ?? [];
  }, [gameType, questionPlanResult]);
  const questionPoolDiagnostics = questionPlanResult?.diagnostics ?? null;

  const submittedVotesCount = useMemo(
    () => countSubmittedVotes(gameType, players, currentVotes),
    [gameType, players, currentVotes]
  );
  const allVotesSubmitted = players.length > 0 && submittedVotesCount >= players.length;

  const isHostQuestionActive = room?.status === "question_active";
  const hostJaugeAnonymous = jaugeMode && jaugeGameState ? jaugeGameState.anonymityMode !== "visible" : false;
  const validationVoterIds = useMemo(() => {
    if (!isHostQuestionActive) return [];
    if (jaugeMode) {
      return currentJaugeRatings
        .filter((rating) => rating.rating >= 1 && rating.rating <= 10)
        .map((rating) => rating.voter_player_id);
    }
    return currentVotes.map((vote) => vote.voter_player_id);
  }, [isHostQuestionActive, jaugeMode, currentJaugeRatings, currentVotes]);
  const validationQuestionKey = useMemo(() => {
    if (!isHostQuestionActive) return null;
    if (jaugeMode && currentJaugeQuestion) return `jauge-${currentJaugeQuestion.id}`;
    if (currentQ) return `${gameType ?? "game"}-${currentQ.id}`;
    return null;
  }, [isHostQuestionActive, jaugeMode, currentJaugeQuestion, currentQ, gameType]);
  const validationEvents = useValidationEvents({
    voterIds: validationVoterIds,
    players,
    questionKey: validationQuestionKey,
    anonymous: hostJaugeAnonymous,
    hideOwnId: me?.id ?? null,
  });

  const predictionScores = useMemo(
    () => (predictionMode ? computePredictionScores(predictionMode, players, votes, currentQ?.id ?? null) : []),
    [currentQ?.id, players, predictionMode, votes]
  );
  const scoreTargetReached = predictionMode
    ? hasReachedScoreTarget(predictionScores, room?.score_target)
    : false;
  const shouldShowRoundScoreboard =
    Boolean(predictionMode) && !room?.hide_scores && room?.scoreboard_frequency === "round";
  const shouldFinishAfterCurrentRound =
    roundsPlayed >= totalQuestions || filteredAvailable.length === 0 || scoreTargetReached;

  useEffect(() => {
    setHostSelectedOption(null);
    setHostSelectedPlayerId(null);
    setHostSelectedPredictionOption(null);
    setHostSelectedRating(null);
    setHostSubmitting(false);
    setOptimisticHostVote(null);
    setOptimisticHostRating(null);
  }, [currentQ?.id, currentJaugeQuestion?.id]);

  const votingStartedAt = room?.status === "question_active" ? room.question_started_at : null;
  const voteLeft = useCountdown(votingStartedAt, voteDuration);

  useEffect(() => {
    primeAudio();
  }, []);

  const lastStatusRef = useRef<string | null>(null);
  useEffect(() => {
    if (!room) return;
    const previous = lastStatusRef.current;
    if (previous === room.status) return;
    lastStatusRef.current = room.status;
    if (!previous) return;
    if (room.status === "question_active") playSfx("roundStart");
    else if (room.status === "reveal_results") playSfx("reveal");
    else if (room.status === "scoreboard") playSfx("leaderboard");
    else if (room.status === "end_game_summary") playSfx("leaderboard");
  }, [room?.status, room]);

  const lastPlayerCountRef = useRef(0);
  useEffect(() => {
    if (!room) return;
    if (lastPlayerCountRef.current === 0) {
      lastPlayerCountRef.current = players.length;
      return;
    }
    if (players.length > lastPlayerCountRef.current) playSfx("joined");
    lastPlayerCountRef.current = players.length;
  }, [players.length, room]);

  const lastTickRef = useRef<number>(-1);
  useEffect(() => {
    if (room?.status !== "question_active") {
      lastTickRef.current = -1;
      return;
    }
    if (voteLeft > 5 || voteLeft === 0) return;
    if (voteLeft === lastTickRef.current) return;
    lastTickRef.current = voteLeft;
    playSfx("urgent");
  }, [voteLeft, room?.status]);

  const mimeRoundLeft = useCountdown(mimeMode ? votingStartedAt : null, mimeTimerDuration);
  const voteHasExpired =
    votingStartedAt !== null && secondsLeft(votingStartedAt, voteDuration) === 0;
  const mimeTimerHasExpired =
    mimeMode && votingStartedAt !== null && secondsLeft(votingStartedAt, mimeTimerDuration) === 0;

  const revealStartedAt = room?.status === "reveal_results" ? room.reveal_started_at : null;
  const revealLeft = useCountdown(revealStartedAt, revealDuration);
  const revealHasExpired =
    revealStartedAt !== null && secondsLeft(revealStartedAt, revealDuration) === 0;

  const scoreboardStartedAt = room?.status === "scoreboard" ? room.scoreboard_started_at : null;
  const scoreboardLeft = useCountdown(scoreboardStartedAt, scoreboardDuration);
  const scoreboardHasExpired =
    scoreboardStartedAt !== null && secondsLeft(scoreboardStartedAt, scoreboardDuration) === 0;

  useEffect(() => {
    if (!mimeMode && !jaugeMode && !intrusMode && room?.status === "question_active" && (voteHasExpired || allVotesSubmitted)) {
      void revealNow();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mimeMode, jaugeMode, room?.status, voteHasExpired, allVotesSubmitted, currentQ?.id]);

  useEffect(() => {
    if (jaugeMode && room?.status === "question_active" && (voteHasExpired || allJaugeRatingsSubmitted)) {
      void revealNow();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jaugeMode, room?.status, voteHasExpired, allJaugeRatingsSubmitted, currentJaugeQuestion?.id]);

  useEffect(() => {
    if (
      mimeMode &&
      room?.status === "question_active" &&
      mimeGameState?.roundStatus === "playing" &&
      mimeTimerHasExpired
    ) {
      void markMimeRoundEnded();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mimeMode, room?.status, mimeGameState?.roundStatus, mimeTimerHasExpired, currentQ?.id]);

  useEffect(() => {
    if (!mimeMode || !room || !mimeGameState || room.status === "lobby" || room.status === "ended" || room.status === "end_game_summary") return;
    const liveOrder = prunePlayerOrder(mimeGameState.playerOrder, players);
    if (!liveOrder.length || sameOrder(liveOrder, mimeGameState.playerOrder)) return;
    if (!liveOrder.includes(mimeGameState.currentMimePlayerId)) {
      void goToNextMimeRound({ forceOrder: liveOrder });
      return;
    }
    void syncMimePlayerOrder(liveOrder);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mimeMode, room?.id, room?.status, mimeGameState?.currentMimePlayerId, mimeGameState?.playerOrder.join("|"), players]);

  useEffect(() => {
    if (!mimeMode && room?.status === "reveal_results" && autoplay && revealHasExpired) {
      if (shouldShowRoundScoreboard) {
        void showScoreboard();
      } else {
        void goToNextQuestion();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mimeMode, room?.status, autoplay, revealHasExpired, roundsPlayed, filteredAvailable.length, shouldShowRoundScoreboard]);

  useEffect(() => {
    if (room?.status === "scoreboard" && autoplay && scoreboardHasExpired) {
      void goToNextQuestion();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.status, autoplay, scoreboardHasExpired, roundsPlayed, filteredAvailable.length, scoreTargetReached]);

  async function runTransition(action: () => Promise<void>) {
    if (transitionRef.current) return;
    transitionRef.current = true;
    setBusy(true);
    setActionError(null);
    try {
      await action();
      await refresh();
    } catch (err) {
      setActionError(describeError(err, "Erreur inconnue."));
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
      setActionError(describeError(err, "Erreur de configuration."));
    } finally {
      setBusy(false);
    }
  }

  function patchJaugeLobbyState(patch: Partial<NonNullable<Room["jauge_game_state"]>>) {
    if (!room || room.status !== "lobby") return;
    const current = jaugeGameState;
    void updateConfig({
      jauge_game_state: {
        targetMode: patch.targetMode ?? current?.targetMode ?? jaugeTargetMode,
        targetOrder: patch.targetOrder ?? current?.targetOrder ?? [],
        currentTargetIndex: patch.currentTargetIndex ?? current?.currentTargetIndex ?? 0,
        currentTargetPlayerId: patch.currentTargetPlayerId ?? current?.currentTargetPlayerId ?? "",
        questionMode: patch.questionMode ?? current?.questionMode ?? jaugeQuestionMode,
        questionOrder: patch.questionOrder ?? current?.questionOrder ?? [],
        currentQuestionOrderIndex: patch.currentQuestionOrderIndex ?? current?.currentQuestionOrderIndex ?? 0,
        currentQuestionText: patch.currentQuestionText ?? current?.currentQuestionText ?? "",
        currentQuestionCategory: patch.currentQuestionCategory ?? current?.currentQuestionCategory ?? "jauge",
        usedQuestionIds: patch.usedQuestionIds ?? current?.usedQuestionIds ?? [],
        roundNumber: patch.roundNumber ?? current?.roundNumber ?? 0,
        anonymityMode: patch.anonymityMode ?? current?.anonymityMode ?? jaugeAnonymityMode,
        brutalMode: patch.brutalMode ?? current?.brutalMode ?? jaugeBrutalMode,
        autoJaugeMode: patch.autoJaugeMode ?? current?.autoJaugeMode ?? jaugeAutoJaugeMode,
        allowPlayerQuestions: patch.allowPlayerQuestions ?? current?.allowPlayerQuestions ?? jaugeAllowPlayerQuestions,
        playerQuestions: patch.playerQuestions ?? current?.playerQuestions ?? [],
      },
    });
  }

  function chooseGame(nextGameType: GameType) {
    if (nextGameType === "mime_expressions") {
      const arrivalOrder = getArrivalOrder(players);
      setMimeOrderMode("arrival");
      setMimeCustomOrder(arrivalOrder);
      setMimeRandomOrder(shuffleIds(arrivalOrder));
      setMimeHostPlayMode(true);
    }
    if (nextGameType === "jauge") {
      const arrivalOrder = getArrivalOrder(players);
      setJaugeTargetMode("random");
      setJaugeQuestionMode("random");
      setJaugeAnonymityMode("visible");
      setJaugeCustomOrder(arrivalOrder);
      setJaugeRandomOrder(shuffleJaugeIds(arrivalOrder));
      setJaugeBrutalMode(false);
      setJaugeAutoJaugeMode(false);
      setJaugeAllowPlayerQuestions(false);
    }
    void updateConfig({
      game_type: nextGameType,
      selected_categories: getDefaultCategories(nextGameType),
      current_question_id: null,
      round_question_ids: [],
      current_question_snapshot: null,
      question_source_settings: getQuestionSourceSettings(null),
      mime_game_state: null,
      jauge_game_state: null,
      intrus_game_state: null,
    });
  }

  function changeGame() {
    void updateConfig({
      game_type: null,
      selected_categories: [],
      current_question_id: null,
      round_question_ids: [],
      current_question_snapshot: null,
      mime_game_state: null,
      jauge_game_state: null,
      intrus_game_state: null,
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

  async function askQuestion(question: GameQuestion | QuestionPoolItem) {
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
          current_question_snapshot: makeQuestionSnapshot(question),
          round_question_ids: addUniqueId(room.round_question_ids ?? [], question.id),
          question_started_at: new Date().toISOString(),
          reveal_started_at: null,
          scoreboard_started_at: null,
        })
        .eq("id", room.id)
        .in("status", ["lobby", "reveal_results", "scoreboard"]);
      if (roomError) throw roomError;
    });
  }

  async function goToNextQuestion() {
    if (!room || !gameType) return;
    if (mimeMode) {
      await goToNextMimeRound();
      return;
    }
    if (jaugeMode) {
      await goToNextJaugeRound();
      return;
    }
    if (shouldFinishAfterCurrentRound) {
      await finishGame(false);
      return;
    }
    const question = pickNextQuestionFromPlan(
      buildQuestionPlan({
        gameType,
        selectedCategories,
        totalQuestions,
        excludeIds: blockedQuestionIds,
        liveQuestions: customQuestions,
        savedQuestions,
        settings: questionSourceSettings,
      })
    );
    if (!question) {
      await finishGame(false);
      return;
    }
    await askQuestion(question);
  }

  async function startJaugeGame(playerOrder: string[]) {
    if (!room || !jaugeMode) return;
    const liveOrder = mergePlayerOrder(playerOrder, players);
    if (players.length < 2 || liveOrder.length < 2) {
      setActionError("Il faut au moins 2 joueurs pour lancer Jauge.");
      return;
    }
    const effectiveQuestionMode = getEffectiveJaugeQuestionMode(questionSourceSettings, jaugeQuestionMode);
    const customSourcesEnabled =
      effectiveQuestionMode === "players" || jaugeAllowPlayerQuestions || questionSourceSettings.useLiveQuestions || questionSourceSettings.useSavedQuestions;
    const playerQuestions = customSourcesEnabled
      ? dedupeJaugePlayerQuestions([...(jaugeGameState?.playerQuestions ?? []), ...jaugeExternalQuestions])
      : [];
    if (effectiveQuestionMode === "players" && playerQuestions.length === 0) {
      setActionError(questionSourceSettings.mode === "saved_only" ? "Aucune question sauvegardée valide pour Jauge." : "Ajoute au moins une question joueur ou repasse en mix/système.");
      return;
    }
    const picked = buildInitialJaugeState({
      players,
      selectedCategories,
      targetMode: jaugeTargetMode,
      targetOrder: liveOrder,
      questionMode: effectiveQuestionMode,
      anonymityMode: jaugeAnonymityMode,
      brutalMode: jaugeBrutalMode,
      autoJaugeMode: jaugeAutoJaugeMode,
      allowPlayerQuestions: jaugeAllowPlayerQuestions,
      playerQuestions,
      usedQuestionIds: uniqueIds([...askedForGameIds, ...roundQuestionIds]),
      totalQuestions,
    });
    if (!picked) {
      setActionError("Aucune question Jauge disponible avec cette configuration.");
      return;
    }

    await runTransition(async () => {
      const supabase = getSupabase();
      const { error: askedError } = await supabase
        .from("asked_questions")
        .upsert(
          { room_id: room.id, game_type: "jauge", question_id: picked.question.id },
          { onConflict: "room_id,game_type,question_id" }
        );
      if (askedError) throw askedError;

      const { error } = await supabase
        .from("rooms")
        .update({
          status: "question_active",
          current_question_id: picked.question.id,
          current_question_snapshot: makeQuestionSnapshot({
            id: picked.question.id,
            gameType: "jauge",
            category: picked.question.category as never,
            text: picked.question.text,
            source: picked.question.source ?? (picked.question.playerQuestion ? "live" : "system"),
            authorPlayerId: picked.question.authorPlayerId ?? null,
          } as QuestionPoolItem),
          round_question_ids: [picked.question.id],
          question_started_at: new Date().toISOString(),
          reveal_started_at: null,
          scoreboard_started_at: null,
          jauge_game_state: picked.state,
        })
        .eq("id", room.id)
        .eq("status", "lobby");
      if (error) throw error;
    });
  }

  async function goToNextJaugeRound() {
    if (!room || !jaugeMode) return;
    if (!jaugeGameState) {
      const order = getJaugeLobbyOrder(jaugeTargetMode, players, jaugeRandomOrder, jaugeCustomOrder);
      await startJaugeGame(order);
      return;
    }
    if (jaugeGameState.roundNumber >= totalQuestions) {
      await finishGame(false);
      return;
    }
    const picked = buildNextJaugeState({
      players,
      selectedCategories,
      previous: jaugeGameState,
      extraUsedQuestionIds: uniqueIds([...askedForGameIds, ...roundQuestionIds]),
    });
    if (!picked) {
      await finishGame(false);
      return;
    }

    await runTransition(async () => {
      const supabase = getSupabase();
      const { error: askedError } = await supabase
        .from("asked_questions")
        .upsert(
          { room_id: room.id, game_type: "jauge", question_id: picked.question.id },
          { onConflict: "room_id,game_type,question_id" }
        );
      if (askedError) throw askedError;

      const { error } = await supabase
        .from("rooms")
        .update({
          status: "question_active",
          current_question_id: picked.question.id,
          current_question_snapshot: makeQuestionSnapshot({
            id: picked.question.id,
            gameType: "jauge",
            category: picked.question.category as never,
            text: picked.question.text,
            source: picked.question.source ?? (picked.question.playerQuestion ? "live" : "system"),
            authorPlayerId: picked.question.authorPlayerId ?? null,
          } as QuestionPoolItem),
          round_question_ids: addUniqueId(roundQuestionIds, picked.question.id),
          question_started_at: new Date().toISOString(),
          reveal_started_at: null,
          scoreboard_started_at: null,
          jauge_game_state: picked.state,
        })
        .eq("id", room.id)
        .in("status", ["question_active", "reveal_results"]);
      if (error) throw error;
    });
  }

  async function startMimeGame(playerOrder: string[], hostPlayMode: boolean, selectedMode: MimeMode = "classic") {
    if (!room || !mimeMode) return;
    const liveOrder = prunePlayerOrder(playerOrder, players);
    if (!liveOrder.length) {
      setActionError("Ajoute au moins un joueur dans l'ordre de passage.");
      return;
    }
    const expression = pickNextQuestionFromPlan(
      buildQuestionPlan({
        gameType: "mime_expressions",
        selectedCategories,
        totalQuestions,
        excludeIds: blockedQuestionIds,
        liveQuestions: customQuestions,
        savedQuestions,
        settings: questionSourceSettings,
      })
    ) as (MimeExpressionQuestion & QuestionPoolItem) | undefined;
    if (!expression) {
      setActionError("Aucune expression disponible avec ces thèmes.");
      return;
    }
    await runTransition(async () => {
      const supabase = getSupabase();
      const { error: askedError } = await supabase
        .from("asked_questions")
        .upsert(
          { room_id: room.id, game_type: "mime_expressions", question_id: expression.id },
          { onConflict: "room_id,game_type,question_id" }
        );
      if (askedError) throw askedError;

      const { error } = await supabase
        .from("rooms")
        .update({
          status: "question_active",
          current_question_id: expression.id,
          current_question_snapshot: makeQuestionSnapshot(expression),
          round_question_ids: [expression.id],
          question_started_at: new Date().toISOString(),
          reveal_started_at: null,
          scoreboard_started_at: null,
          mime_game_state: buildMimeGameState({
            playerOrder: liveOrder,
            currentMimeIndex: 0,
            expressionId: expression.id,
            usedExpressionIds: [expression.id],
            mimeHistory: [
              {
                roundNumber: 1,
                mimePlayerId: liveOrder[0] ?? "",
                expressionId: expression.id,
              },
            ],
            roundNumber: 1,
            timerDuration: getMimeModeTimerSeconds(selectedMode, voteDuration),
            roundStatus: "playing",
            hostPlayMode,
            mimeMode: selectedMode,
            mimeRuleFlavor: pickModeFlavor(selectedMode, Math.floor(Math.random() * 1000)) ?? undefined,
          }),
        })
        .eq("id", room.id)
        .eq("status", "lobby");
      if (error) throw error;
    });
  }

  async function goToNextMimeRound(options?: { forceOrder?: string[] }) {
    if (!room || !mimeMode || !mimeGameState) return;
    const liveOrder = options?.forceOrder?.length
      ? options.forceOrder
      : prunePlayerOrder(mimeGameState.playerOrder, players);
    if (!liveOrder.length) {
      await resetToLobby();
      return;
    }
    if (mimeGameState.roundNumber >= totalQuestions) {
      await finishGame(false);
      return;
    }
    const expression = pickNextQuestionFromPlan(
      buildQuestionPlan({
        gameType: "mime_expressions",
        selectedCategories,
        totalQuestions,
        excludeIds: uniqueIds([...blockedQuestionIds, ...mimeGameState.usedExpressionIds]),
        liveQuestions: customQuestions,
        savedQuestions,
        settings: questionSourceSettings,
      })
    ) as (MimeExpressionQuestion & QuestionPoolItem) | undefined;
    if (!expression) {
      await finishGame(false);
      return;
    }
    const nextIndex = findNextMimeIndex(mimeGameState, liveOrder);
    const usedExpressionIds = [...mimeGameState.usedExpressionIds, expression.id];
    const roundNumber = mimeGameState.roundNumber + 1;
    const mimeHistory = [
      ...mimeGameState.mimeHistory,
      {
        roundNumber,
        mimePlayerId: liveOrder[nextIndex] ?? "",
        expressionId: expression.id,
      },
    ];

    await runTransition(async () => {
      const supabase = getSupabase();
      const { error: askedError } = await supabase
        .from("asked_questions")
        .upsert(
          { room_id: room.id, game_type: "mime_expressions", question_id: expression.id },
          { onConflict: "room_id,game_type,question_id" }
        );
      if (askedError) throw askedError;

      const { error } = await supabase
        .from("rooms")
        .update({
          status: "question_active",
          current_question_id: expression.id,
          current_question_snapshot: makeQuestionSnapshot(expression),
          round_question_ids: addUniqueId(roundQuestionIds, expression.id),
          question_started_at: new Date().toISOString(),
          reveal_started_at: null,
          scoreboard_started_at: null,
          mime_game_state: buildMimeGameState({
            playerOrder: liveOrder,
            currentMimeIndex: nextIndex,
            expressionId: expression.id,
            usedExpressionIds,
            mimeHistory,
            roundNumber,
            timerDuration: mimeGameState.timerDuration || voteDuration,
            roundStatus: "playing",
            hostPlayMode: mimeGameState.hostPlayMode,
            mimeMode: (mimeGameState.mimeMode as MimeMode | undefined) ?? "classic",
            mimeRuleFlavor: pickModeFlavor(
              (mimeGameState.mimeMode as MimeMode | undefined) ?? "classic",
              roundNumber
            ) ?? mimeGameState.mimeRuleFlavor,
          }),
        })
        .eq("id", room.id)
        .in("status", ["question_active", "reveal_results"]);
      if (error) throw error;
    });
  }

  async function restartMimeRound() {
    if (!room || !mimeMode || !mimeGameState || !currentQ) return;
    await runTransition(async () => {
      const { error } = await getSupabase()
        .from("rooms")
        .update({
          status: "question_active",
          question_started_at: new Date().toISOString(),
          reveal_started_at: null,
          scoreboard_started_at: null,
          mime_game_state: { ...mimeGameState, roundStatus: "playing" },
        })
        .eq("id", room.id)
        .in("status", ["question_active", "reveal_results"]);
      if (error) throw error;
    });
  }

  async function revealMimeExpression() {
    if (!room || !mimeMode || !mimeGameState || !currentQ) return;
    await runTransition(async () => {
      const { error } = await getSupabase()
        .from("rooms")
        .update({
          status: "reveal_results",
          reveal_started_at: new Date().toISOString(),
          mime_game_state: { ...mimeGameState, roundStatus: "revealed" },
        })
        .eq("id", room.id)
        .in("status", ["question_active", "reveal_results"]);
      if (error) throw error;
    });
  }

  async function markMimeRoundEnded() {
    if (!room || !mimeMode || !mimeGameState) return;
    await runTransition(async () => {
      const { error } = await getSupabase()
        .from("rooms")
        .update({
          mime_game_state: { ...mimeGameState, roundStatus: "ended" },
        })
        .eq("id", room.id)
        .eq("status", "question_active");
      if (error) throw error;
    });
  }

  async function syncMimePlayerOrder(playerOrder: string[]) {
    if (!room || !mimeMode || !mimeGameState) return;
    const currentIndex = Math.max(0, playerOrder.indexOf(mimeGameState.currentMimePlayerId));
    await runTransition(async () => {
      const { error } = await getSupabase()
        .from("rooms")
        .update({
          mime_game_state: {
            ...mimeGameState,
            playerOrder,
            currentMimeIndex: currentIndex,
          },
        })
        .eq("id", room.id)
        .neq("status", "lobby");
      if (error) throw error;
    });
  }

  async function addPlayerToMimeOrder(player: Player) {
    if (!room || !mimeMode || !mimeGameState || mimeGameState.playerOrder.includes(player.id)) return;
    await runTransition(async () => {
      const { error } = await getSupabase()
        .from("rooms")
        .update({
          mime_game_state: {
            ...mimeGameState,
            playerOrder: [...mimeGameState.playerOrder, player.id],
          },
        })
        .eq("id", room.id)
        .neq("status", "lobby");
      if (error) throw error;
    });
  }

  async function revealNow() {
    if (mimeMode) {
      await revealMimeExpression();
      return;
    }
    if (!room || !(currentQ || currentJaugeQuestion || room.current_question_id)) return;
    await runTransition(async () => {
      const { error } = await getSupabase()
        .from("rooms")
        .update({
          status: "reveal_results",
          reveal_started_at: new Date().toISOString(),
        })
        .eq("id", room.id)
        .eq("status", "question_active");
      if (error) throw error;
    });
  }

  async function showScoreboard() {
    if (!room || !predictionMode) return;
    await runTransition(async () => {
      const { error } = await getSupabase()
        .from("rooms")
        .update({
          status: "scoreboard",
          scoreboard_started_at: new Date().toISOString(),
        })
        .eq("id", room.id)
        .eq("status", "reveal_results");
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
          current_question_snapshot: null,
          round_question_ids: [],
          question_started_at: null,
          reveal_started_at: null,
          scoreboard_started_at: null,
          mime_game_state: null,
          jauge_game_state: null,
        })
        .eq("id", room.id);
      if (error) throw error;
    });
  }

  async function finishGame(requireConfirm: boolean) {
    if (!room) return;
    if (requireConfirm && !confirm("Afficher le Bilan de soirée ?")) return;
    await runTransition(async () => {
      const { error } = await getSupabase()
        .from("rooms")
        .update({
          status: "end_game_summary",
          scoreboard_started_at: new Date().toISOString(),
        })
        .eq("id", room.id);
      if (error) throw error;
    });
  }

  async function resetFinishedGameToLobby() {
    if (!room) return;
    await runTransition(async () => {
      const supabase = getSupabase();
      const { error: votesError } = await supabase
        .from("votes")
        .delete()
        .eq("room_id", room.id);
      if (votesError) throw votesError;

      const { error: ratingsError } = await supabase
        .from("ratings")
        .delete()
        .eq("room_id", room.id);
      if (ratingsError) throw ratingsError;

      const { error: roomError } = await supabase
        .from("rooms")
        .update({
          status: "lobby",
          current_question_id: null,
          current_question_snapshot: null,
          round_question_ids: [],
          question_started_at: null,
          reveal_started_at: null,
          scoreboard_started_at: null,
          mime_game_state: null,
          jauge_game_state: null,
        })
        .eq("id", room.id);
      if (roomError) throw roomError;
    });
  }

  async function endRoomFromSummary() {
    if (!room) return;
    if (!confirm("Terminer la partie pour tout le monde ?")) return;
    await runTransition(async () => {
      const { error } = await getSupabase()
        .from("rooms")
        .update({
          status: "ended",
          current_question_id: null,
          current_question_snapshot: null,
          round_question_ids: [],
          question_started_at: null,
          reveal_started_at: null,
          scoreboard_started_at: null,
          mime_game_state: null,
          jauge_game_state: null,
        })
        .eq("id", room.id);
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
    const selectedOption =
      gameType === "who_would"
        ? hostSelectedOption
        : isPredictionGame(gameType)
          ? hostSelectedPredictionOption
          : null;
    const selectedPlayerId = gameType === "who_of_us" ? hostSelectedPlayerId : null;
    if (gameType === "who_would" && !selectedOption) return;
    if (isPredictionGame(gameType) && !selectedOption) return;
    if (gameType === "who_of_us" && !selectedPlayerId) return;

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

  async function submitHostRating() {
    if (!room || !me || !jaugeGameState || !currentJaugeQuestion || !hostSelectedRating || hostSubmitting) return;
    if (!requiredJaugeVoters.some((player) => player.id === me.id)) return;

    setHostSubmitting(true);
    setActionError(null);
    setOptimisticHostRating({ qid: currentJaugeQuestion.id, rating: hostSelectedRating });

    try {
      const { error } = await getSupabase().from("ratings").upsert(
        {
          room_id: room.id,
          game_type: "jauge",
          voter_player_id: me.id,
          target_player_id: jaugeGameState.currentTargetPlayerId,
          question_id: currentJaugeQuestion.id,
          rating: hostSelectedRating,
          is_anonymous: jaugeGameState.anonymityMode !== "visible",
        },
        { onConflict: "room_id,question_id,voter_player_id" }
      );
      if (error) throw error;
      await refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Erreur de note.");
      setOptimisticHostRating(null);
    } finally {
      setHostSubmitting(false);
    }
  }

  async function saveCurrentQuestion() {
    if (!room || !gameType || !currentQ || !profileState.userId || !profileState.canManageQuestions || savingQuestion) return;
    setSavingQuestion(true);
    setSaveNotice(null);
    setActionError(null);
    try {
      const result = await saveQuestionToLibrary({
        userId: profileState.userId,
        roomId: room.id,
        gameType,
        question: currentQ,
        snapshot: room.current_question_snapshot ?? undefined,
      });
      setSaveNotice(result === "already" ? "Déjà dans la bibliothèque." : "Question sauvegardée.");
      await refreshSavedQuestions();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Impossible de sauvegarder cette question.");
    } finally {
      setSavingQuestion(false);
    }
  }

  async function submitHostPlayerQuestion() {
    setActionError(null);
    if (!room || !gameType || !me || hostSubmittingQuestion) return;
    if (hostSubmittedQuestionCount >= questionSourceSettings.maxQuestionsPerPlayer) {
      setActionError("Tu as déjà proposé le maximum de questions pour ce jeu.");
      return;
    }
    const submission = buildCustomQuestionSubmission({
      gameType,
      text: hostQuestionDraft,
      optionA: hostQuestionOptionA,
      optionB: hostQuestionOptionB,
      options: hostQuestionOptions,
    });
    if (!submission) {
      setActionError("Question incomplète pour ce mode.");
      return;
    }
    if (hasDuplicateCustomQuestion(customQuestions, gameType, submission)) {
      setActionError("Cette question existe déjà dans la room.");
      return;
    }
    setHostSubmittingQuestion(true);
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
      setHostQuestionDraft("");
      setHostQuestionOptionA("");
      setHostQuestionOptionB("");
      setHostQuestionOptions("");
      await refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Erreur d'ajout de question.");
    } finally {
      setHostSubmittingQuestion(false);
    }
  }

  if (loading) return <CenteredMessage title="Chargement..." />;
  if (error || !room)
    return <CenteredMessage title="Salle introuvable" subtitle={error ?? undefined} />;
  if (room.status === "ended")
    return (
      <CenteredMessage
        title="Partie terminée"
        subtitle="La salle est clôturée. Tu peux revenir à l'accueil pour créer une nouvelle soirée."
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
        roundQuestionIds={roundQuestionIds}
        mimeGameState={mimeGameState}
        jaugeGameState={jaugeGameState}
        isHost
        busy={busy}
        onBackToLobby={resetFinishedGameToLobby}
        onEnd={endRoomFromSummary}
      />
    );

  const dbVote = me ? currentVotes.find((vote) => vote.voter_player_id === me.id) : undefined;
  const dbRating = me && currentJaugeQuestion
    ? currentJaugeRatings.find((rating) => rating.voter_player_id === me.id)
    : undefined;
  const effectiveHostVote =
    optimisticHostVote && currentQ && optimisticHostVote.qid === currentQ.id
      ? optimisticHostVote
      : voteToLocalVote(dbVote);
  const effectiveHostRating =
    optimisticHostRating && currentJaugeQuestion && optimisticHostRating.qid === currentJaugeQuestion.id
      ? optimisticHostRating.rating
      : dbRating?.rating ?? null;
  const otherPlayers = players.filter((player) => player.client_id !== room.host_client_id);
  const targetPlayers = players;
  const isFinalReveal = room.status === "reveal_results" && roundsPlayed >= totalQuestions;
  const mimeLobbyOrder =
    mimeOrderMode === "arrival"
      ? getArrivalOrder(players)
      : mimeOrderMode === "random"
        ? prunePlayerOrder(mimeRandomOrder, players)
        : mergePlayerOrder(mimeCustomOrder, players);
  const jaugeLobbyOrder = getJaugeLobbyOrder(jaugeTargetMode, players, jaugeRandomOrder, jaugeCustomOrder);
  const displayRound = mimeMode
    ? mimeGameState?.roundNumber ?? 0
    : jaugeMode
      ? jaugeGameState?.roundNumber ?? roundsPlayed
      : roundsPlayed;

  return (
    <main className={`game-stage mx-auto flex min-h-dvh ${tvMode ? "max-w-2xl px-4 py-4 lg:max-w-6xl lg:px-10 lg:py-8" : "max-w-2xl px-5 py-6"} flex-col`}>
      <RoomHeader
        code={room.code}
        status={room.status}
        gameLabel={gameDefinition?.shortLabel}
        playersCount={players.length}
        round={displayRound}
        totalQuestions={totalQuestions}
        onEnd={() => void finishGame(true)}
        onToggleTransfer={() => setShowTransfer((value) => !value)}
        canTransfer={otherPlayers.length > 0}
      />

      <AdminStatusBar
        userEmail={profileState.userEmail}
        role={profileState.role}
        canManageQuestions={profileState.canManageQuestions}
        loading={profileState.loading}
        compact
        onSignOut={() => void profileState.signOut()}
      />

      {tvMode && (
        <TvHostStage
          room={room}
          players={participants}
          gameLabel={gameDefinition?.label}
          gameType={gameType}
          currentQuestionText={currentQ?.text ?? currentJaugeQuestion?.text ?? null}
          voteLeft={voteLeft}
          submittedVotesCount={submittedVotesCount}
          submittedJaugeCount={submittedJaugeCount}
          totalParticipants={participantCount}
          totalJaugeVoters={requiredJaugeVoters.length}
          isJauge={Boolean(jaugeMode)}
          onRevealNow={revealNow}
          onNext={goToNextQuestion}
          onEnd={() => void finishGame(false)}
          busy={busy}
        />
      )}

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

      <AdminDebugPanel
        enabled={profileState.canManageQuestions}
        room={room}
        players={players}
        votes={votes}
        ratings={ratings}
        currentQuestion={currentQ ?? currentJaugeQuestion ?? null}
        availableCount={filteredAvailable.length}
        diagnostics={questionPoolDiagnostics}
      />

      {room.status === "lobby" && gameType && questionSourceSettings.useLiveQuestions && me && (
        <HostCustomQuestionPanel
          gameType={gameType}
          playerName={me.name}
          draft={hostQuestionDraft}
          optionA={hostQuestionOptionA}
          optionB={hostQuestionOptionB}
          options={hostQuestionOptions}
          submitting={hostSubmittingQuestion}
          myQuestionCount={hostSubmittedQuestionCount}
          liveQuestionCount={liveQuestionCountForGame}
          maxQuestionsPerPlayer={questionSourceSettings.maxQuestionsPerPlayer}
          expectedQuestionCount={players.length * questionSourceSettings.maxQuestionsPerPlayer}
          onDraftChange={setHostQuestionDraft}
          onOptionAChange={setHostQuestionOptionA}
          onOptionBChange={setHostQuestionOptionB}
          onOptionsChange={setHostQuestionOptions}
          onSubmit={submitHostPlayerQuestion}
        />
      )}

      {(room.status === "question_active" || room.status === "reveal_results") && currentQ && profileState.canManageQuestions && (
        <SaveQuestionButton saving={savingQuestion} notice={saveNotice} onSave={saveCurrentQuestion} />
      )}

      {room.status === "lobby" && !gameType && (
        <GameSelectionView busy={busy} onChoose={chooseGame} />
      )}

      {room.status === "lobby" && gameType === "mime_expressions" && gameDefinition && (
        <MimeLobbyView
          players={players}
          availableCount={filteredAvailable.length}
          gameLabel={gameDefinition.label}
          selectedCategories={selectedCategories}
          room={room}
          busy={busy}
          customQuestionCount={customQuestionCount}
          orderMode={mimeOrderMode}
          hostPlayMode={mimeHostPlayMode}
          finalOrder={mimeLobbyOrder}
          customOrder={mimeCustomOrder}
          onOrderModeChange={(mode) => {
            setMimeOrderMode(mode);
            if (mode === "random") setMimeRandomOrder(shuffleIds(getArrivalOrder(players)));
            if (mode === "custom") setMimeCustomOrder((prev) => mergePlayerOrder(prev, players));
          }}
          onShuffle={() => setMimeRandomOrder(shuffleIds(getArrivalOrder(players)))}
          onMoveCustomPlayer={(playerId, direction) => {
            setMimeCustomOrder((prev) => moveId(mergePlayerOrder(prev, players), playerId, direction));
          }}
          onHostPlayModeChange={setMimeHostPlayMode}
          onCustomQuestionCountChange={setCustomQuestionCount}
          onCommitCustomQuestionCount={commitCustomQuestionCount}
          onToggleCategory={toggleCategory}
          onUpdateConfig={updateConfig}
          questionSourceSettings={questionSourceSettings}
          canUseSavedQuestions={profileState.canManageQuestions}
          savedQuestionCount={savedQuestions.length}
          liveQuestionCount={liveQuestionCountForGame}
          questionPoolDiagnostics={questionPoolDiagnostics}
          onQuestionSourceSettingsChange={(next) => void updateConfig({ question_source_settings: next })}
          onStart={() => void startMimeGame(mimeLobbyOrder, mimeHostPlayMode, mimeSelectedMode)}
          selectedMode={mimeSelectedMode}
          onSelectedModeChange={setMimeSelectedMode}
          onChangeGame={changeGame}
        />
      )}

      {room.status === "lobby" && gameType === "jauge" && gameDefinition && (
        <JaugeLobbyView
          players={players}
          availableCount={filteredAvailable.length}
          gameLabel={gameDefinition.label}
          selectedCategories={selectedCategories}
          room={room}
          busy={busy}
          customQuestionCount={customQuestionCount}
          targetMode={jaugeTargetMode}
          questionMode={jaugeQuestionMode}
          anonymityMode={jaugeAnonymityMode}
          brutalMode={jaugeBrutalMode}
          autoJaugeMode={jaugeAutoJaugeMode}
          allowPlayerQuestions={jaugeAllowPlayerQuestions}
          finalOrder={jaugeLobbyOrder}
          customOrder={jaugeCustomOrder}
          onTargetModeChange={(mode) => {
            setJaugeTargetMode(mode);
            if (mode === "random") setJaugeRandomOrder(shuffleJaugeIds(getArrivalOrder(players)));
            if (mode === "custom") setJaugeCustomOrder((prev) => mergePlayerOrder(prev, players));
            patchJaugeLobbyState({ targetMode: mode });
          }}
          onQuestionModeChange={(mode) => {
            setJaugeQuestionMode(mode);
            patchJaugeLobbyState({ questionMode: mode });
            void updateConfig({
              question_source_settings: {
                ...questionSourceSettings,
                mode: mode === "fixed" ? "system_only" : mode === "players" ? "players_only" : "smart_mix",
                useSystemQuestions: mode !== "players",
                useLiveQuestions: mode !== "fixed" && jaugeAllowPlayerQuestions,
              },
            });
          }}
          onAnonymityModeChange={(mode) => {
            setJaugeAnonymityMode(mode);
            patchJaugeLobbyState({ anonymityMode: mode });
          }}
          onShuffle={() => setJaugeRandomOrder(shuffleJaugeIds(getArrivalOrder(players)))}
          onMoveCustomPlayer={(playerId, direction) => {
            setJaugeCustomOrder((prev) => moveId(mergePlayerOrder(prev, players), playerId, direction));
          }}
          onBrutalModeChange={(value) => {
            setJaugeBrutalMode(value);
            patchJaugeLobbyState({ brutalMode: value });
          }}
          onAutoJaugeModeChange={(value) => {
            setJaugeAutoJaugeMode(value);
            patchJaugeLobbyState({ autoJaugeMode: value });
          }}
          onAllowPlayerQuestionsChange={(value) => {
            setJaugeAllowPlayerQuestions(value);
            patchJaugeLobbyState({ allowPlayerQuestions: value });
            void updateConfig({
              question_source_settings: {
                ...questionSourceSettings,
                mode: value && jaugeQuestionMode === "random" ? "smart_mix" : questionSourceSettings.mode,
                useLiveQuestions: value,
              },
            });
          }}
          onCustomQuestionCountChange={setCustomQuestionCount}
          onCommitCustomQuestionCount={commitCustomQuestionCount}
          onToggleCategory={toggleCategory}
          onUpdateConfig={updateConfig}
          questionSourceSettings={questionSourceSettings}
          canUseSavedQuestions={profileState.canManageQuestions}
          savedQuestionCount={savedQuestions.length}
          liveQuestionCount={liveQuestionCountForGame}
          questionPoolDiagnostics={questionPoolDiagnostics}
          onQuestionSourceSettingsChange={(next) => {
            const nextMode = getEffectiveJaugeQuestionMode(next, jaugeQuestionMode);
            setJaugeQuestionMode(nextMode);
            patchJaugeLobbyState({ questionMode: nextMode });
            void updateConfig({ question_source_settings: next });
          }}
          onStart={() => void startJaugeGame(jaugeLobbyOrder)}
          onChangeGame={changeGame}
        />
      )}

      {room.status === "lobby" && gameType && gameType !== "mime_expressions" && gameType !== "jauge" && gameType !== "intrus" && gameDefinition && (
        <LobbyView
          players={players}
          availableCount={filteredAvailable.length}
          gameType={gameType}
          gameLabel={gameDefinition.label}
          isPredictionMode={Boolean(predictionMode)}
          selectedCategories={selectedCategories}
          room={room}
          busy={busy}
          customQuestionCount={customQuestionCount}
          onCustomQuestionCountChange={setCustomQuestionCount}
          onCommitCustomQuestionCount={commitCustomQuestionCount}
          onToggleCategory={toggleCategory}
          onUpdateConfig={updateConfig}
          questionSourceSettings={questionSourceSettings}
          canUseSavedQuestions={profileState.canManageQuestions}
          savedQuestionCount={savedQuestions.length}
          liveQuestionCount={liveQuestionCountForGame}
          questionPoolDiagnostics={questionPoolDiagnostics}
          onQuestionSourceSettingsChange={(next) => void updateConfig({ question_source_settings: next })}
          onStart={goToNextQuestion}
          onChangeGame={changeGame}
        />
      )}

      {room.status === "question_active" && currentQ && mimeGameState && gameType === "mime_expressions" && (
        <MimeActiveHostView
          expression={currentQ as MimeExpressionQuestion}
          state={mimeGameState}
          currentMimePlayer={currentMimePlayer}
          isHostMime={me?.id === mimeGameState.currentMimePlayerId}
          orderedPlayers={mimePlayersInOrder}
          playersOutsideOrder={mimePlayersOutsideOrder}
          roundLeft={mimeRoundLeft}
          totalRounds={totalQuestions}
          busy={busy}
          onReveal={revealMimeExpression}
          onRestart={restartMimeRound}
          onNext={() => void goToNextMimeRound()}
          onEnd={() => void finishGame(false)}
          onAddPlayer={addPlayerToMimeOrder}
        />
      )}

      {room.status === "question_active" && currentQ && gameType === "who_would" && !tvMode && (
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

      {room.status === "question_active" && currentQ && gameType === "who_of_us" && !tvMode && (
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

      {room.status === "question_active" && currentQ && predictionMode && !tvMode && (
        <PredictionVoteScreen
          mode={predictionMode}
          question={currentQ as PredictionGameQuestion}
          startedAt={room.question_started_at}
          durationSec={voteDuration}
          selectedOption={hostSelectedPredictionOption}
          validatedOption={effectiveHostVote?.selected_option ?? null}
          submitting={hostSubmitting}
          votedCount={submittedVotesCount}
          totalPlayers={players.length}
          busy={busy}
          onSelect={setHostSelectedPredictionOption}
          onSubmit={submitHostVote}
          onRevealNow={revealNow}
        />
      )}

      {room.status === "question_active" && currentJaugeQuestion && jaugeGameState && gameType === "jauge" && !tvMode && (
        <JaugeVoteScreen
          question={currentJaugeQuestion}
          targetPlayer={currentJaugeTarget}
          currentPlayer={me ?? null}
          startedAt={room.question_started_at}
          durationSec={voteDuration}
          selectedRating={hostSelectedRating}
          validatedRating={effectiveHostRating}
          submitting={hostSubmitting}
          brutalMode={jaugeGameState.brutalMode}
          canRate={Boolean(me && requiredJaugeVoters.some((player) => player.id === me.id) && !effectiveHostRating)}
          votedCount={submittedJaugeCount}
          totalVoters={requiredJaugeVoters.length}
          busy={busy}
          onSelect={setHostSelectedRating}
          onSubmit={submitHostRating}
          onRevealNow={revealNow}
        />
      )}

      {room.status === "reveal_results" && currentQ && mimeGameState && gameType === "mime_expressions" && (
        <MimeRevealHostView
          expression={currentQ as MimeExpressionQuestion}
          state={mimeGameState}
          currentMimePlayer={currentMimePlayer}
          orderedPlayers={mimePlayersInOrder}
          playersOutsideOrder={mimePlayersOutsideOrder}
          totalRounds={totalQuestions}
          busy={busy}
          onRestart={restartMimeRound}
          onNext={() => void goToNextMimeRound()}
          onEnd={() => void finishGame(false)}
          onAddPlayer={addPlayerToMimeOrder}
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

      {room.status === "reveal_results" && currentQ && predictionMode && (
        <PredictionRevealPanel
          mode={predictionMode}
          question={currentQ as PredictionGameQuestion}
          players={players}
          votes={currentVotes}
          revealLeft={revealLeft}
          autoplay={autoplay}
          busy={busy}
          primaryLabel={
            shouldShowRoundScoreboard
              ? "Voir le classement"
              : shouldFinishAfterCurrentRound
                ? "Résultats finaux"
                : "Question suivante"
          }
          onPrimary={shouldShowRoundScoreboard ? showScoreboard : goToNextQuestion}
          onBackToLobby={resetToLobby}
        />
      )}

      {room.status === "reveal_results" && currentJaugeQuestion && jaugeGameState && gameType === "jauge" && (
        <JaugeRevealPanel
          question={currentJaugeQuestion}
          targetPlayerId={jaugeGameState.currentTargetPlayerId}
          players={players}
          ratings={currentJaugeRatings}
          anonymityMode={jaugeGameState.anonymityMode}
          controls={
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => void goToNextQuestion()}
                className="btn-primary"
              >
                {jaugeGameState.roundNumber >= totalQuestions || filteredAvailable.length === 0
                  ? "Résultats finaux"
                  : "Manche suivante"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={resetToLobby}
                className="btn-secondary"
              >
                Retour au lobby
              </button>
            </div>
          }
        />
      )}

      {room.status === "scoreboard" && predictionMode && (
        <PredictionScoreboardPanel
          mode={predictionMode}
          players={players}
          votes={votes}
          currentQuestionId={currentQ?.id ?? null}
          scoreTarget={room.score_target}
          autoplay={autoplay}
          scoreboardLeft={scoreboardLeft}
          busy={busy}
          final={shouldFinishAfterCurrentRound}
          primaryLabel={shouldFinishAfterCurrentRound ? "Résultats finaux" : "Question suivante"}
          onPrimary={goToNextQuestion}
          onBackToLobby={resetToLobby}
        />
      )}

      {intrusMode && (
        <IntrusHostFlow
          room={room}
          participants={participants}
          hostPlayer={me ?? null}
          votes={votes}
          totalQuestions={totalQuestions}
          isTv={tvMode}
          busy={busy}
          runTransition={runTransition}
          refresh={refresh}
          onEndGame={() => void finishGame(false)}
        />
      )}

      {isHostQuestionActive && validationEvents.length > 0 && (
        <ValidationParticles events={validationEvents} />
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
    <section className="game-panel-enter flex flex-1 flex-col justify-center">
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
            className="card p-5 text-left transition duration-200 hover:-translate-y-0.5 hover:border-neon-cyan/50 hover:bg-bg-soft active:scale-[0.98] disabled:opacity-50"
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
    <header className="card game-topbar mb-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wider text-white/50">Code de la salle</div>
          <div className="select-all bg-gradient-to-r from-neon-pink to-neon-cyan bg-clip-text text-4xl font-black tracking-widest text-transparent">
            {code}
          </div>
          <div className="mt-1 text-sm text-white/60">
            {playersCount} joueur{playersCount > 1 ? "s" : ""} · {labelStatus(status, gameLabel)}
            {gameLabel && ` · ${gameLabel}`}
            {round > 0 && ` · ${Math.min(round, totalQuestions)} / ${totalQuestions}`}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <AudioToggle compact />
          <div className="flex flex-col items-end gap-1">
            {canTransfer && (
              <button onClick={onToggleTransfer} className="btn-ghost text-neon-cyan">
                👑 Transférer
              </button>
            )}
            <button onClick={onEnd} className="btn-ghost text-neon-pink">Finir</button>
          </div>
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
  isPredictionMode,
  selectedCategories,
  room,
  busy,
  customQuestionCount,
  onCustomQuestionCountChange,
  onCommitCustomQuestionCount,
  onToggleCategory,
  onUpdateConfig,
  questionSourceSettings,
  canUseSavedQuestions,
  savedQuestionCount,
  liveQuestionCount,
  questionPoolDiagnostics,
  onQuestionSourceSettingsChange,
  onStart,
  onChangeGame,
}: {
  players: Player[];
  availableCount: number;
  gameType: GameType;
  gameLabel: string;
  isPredictionMode: boolean;
  selectedCategories: string[];
  room: Room;
  busy: boolean;
  customQuestionCount: string;
  onCustomQuestionCountChange: (value: string) => void;
  onCommitCustomQuestionCount: () => void;
  onToggleCategory: (category: GameCategory) => void;
  onUpdateConfig: (patch: RoomConfigPatch) => void;
  questionSourceSettings: QuestionSourceSettings;
  canUseSavedQuestions: boolean;
  savedQuestionCount: number;
  liveQuestionCount: number;
  questionPoolDiagnostics: QuestionPoolDiagnostics | null;
  onQuestionSourceSettingsChange: (settings: QuestionSourceSettings) => void;
  onStart: () => void;
  onChangeGame: () => void;
}) {
  const enoughPlayers = players.length >= 2;
  const hasEnoughQuestions = availableCount >= room.total_questions;
  const canStart = enoughPlayers && hasEnoughQuestions && !busy;
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

      <QuestionSourcePanel
        settings={questionSourceSettings}
        canUseSavedQuestions={canUseSavedQuestions}
        savedQuestionCount={savedQuestionCount}
        liveQuestionCount={liveQuestionCount}
        onChange={onQuestionSourceSettingsChange}
      />

      <section className="card mb-4 p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">Joueurs connectés</h2>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-white/55">
            {players.length}
          </span>
        </div>
        <PlayersLobbyGrid players={players} hostClientId={room.host_client_id} />
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

        {isPredictionMode && (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => onUpdateConfig({ hide_scores: !room.hide_scores })}
              className={`mt-3 flex w-full items-center justify-between rounded-2xl border p-4 text-left transition ${
                room.hide_scores
                  ? "border-neon-yellow/50 bg-neon-yellow/10 text-white"
                  : "border-white/10 bg-white/5 text-white/70"
              }`}
            >
              <span className="font-bold">Masquer les scores pendant la partie</span>
              <span className={room.hide_scores ? "text-neon-yellow" : "text-white/50"}>
                {room.hide_scores ? "ON" : "OFF"}
              </span>
            </button>

            <ConfigGroup label="Scoreboard">
              <ConfigButton
                active={room.scoreboard_frequency === "round"}
                disabled={busy || room.hide_scores}
                onClick={() => onUpdateConfig({ scoreboard_frequency: "round" })}
              >
                Après chaque manche
              </ConfigButton>
              <ConfigButton
                active={room.scoreboard_frequency === "end"}
                disabled={busy}
                onClick={() => onUpdateConfig({ scoreboard_frequency: "end" })}
              >
                Seulement à la fin
              </ConfigButton>
            </ConfigGroup>

            <ConfigGroup label="Score cible">
              <ConfigButton
                active={!room.score_target}
                disabled={busy}
                onClick={() => onUpdateConfig({ score_target: null })}
              >
                Aucun
              </ConfigButton>
              {SCORE_TARGET_OPTIONS.map((target) => (
                <ConfigButton
                  key={target}
                  active={room.score_target === target}
                  disabled={busy}
                  onClick={() => onUpdateConfig({ score_target: target })}
                >
                  {target}
                </ConfigButton>
              ))}
            </ConfigGroup>
          </>
        )}
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
                className={`prediction-card flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition duration-200 active:scale-[0.96] ${
                  active
                    ? "border-neon-pink bg-neon-pink/20 text-white shadow-glow-pink"
                    : "border-white/10 bg-white/5 text-white/70 hover:-translate-y-0.5 hover:border-white/20"
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
        {questionPoolDiagnostics?.issue && (
          <p className="mt-2 rounded-2xl border border-neon-yellow/30 bg-neon-yellow/10 p-3 text-sm font-bold text-neon-yellow">
            {questionPoolDiagnostics.issue}
          </p>
        )}
      </section>

      <section className="card p-5">
        <button onClick={onStart} disabled={!canStart} className="btn-primary w-full text-xl">
          Relancer une partie
        </button>
        {!enoughPlayers && (
          <p className="mt-3 text-center text-sm text-neon-yellow">
            Il faut au moins 2 joueurs pour lancer.
          </p>
        )}
        {!hasEnoughQuestions && (
          <p className="mt-3 text-center text-sm text-neon-pink">
            {questionPoolDiagnostics?.issue ?? "Réduis le nombre de questions ou ajoute plus de questions compatibles."}
          </p>
        )}
      </section>
    </>
  );
}

function HostCustomQuestionPanel({
  gameType,
  playerName,
  draft,
  optionA,
  optionB,
  options,
  submitting,
  myQuestionCount,
  liveQuestionCount,
  maxQuestionsPerPlayer,
  expectedQuestionCount,
  onDraftChange,
  onOptionAChange,
  onOptionBChange,
  onOptionsChange,
  onSubmit,
}: {
  gameType: GameType;
  playerName: string;
  draft: string;
  optionA: string;
  optionB: string;
  options: string;
  submitting: boolean;
  myQuestionCount: number;
  liveQuestionCount: number;
  maxQuestionsPerPlayer: number;
  expectedQuestionCount: number;
  onDraftChange: (value: string) => void;
  onOptionAChange: (value: string) => void;
  onOptionBChange: (value: string) => void;
  onOptionsChange: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <section className="card mb-4 border-neon-cyan/30 bg-neon-cyan/10 p-5 animate-reveal-in">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-black uppercase tracking-wider text-neon-cyan">Questions joueurs</div>
          <h2 className="mt-1 text-xl font-black">Ajouter mes questions</h2>
          <p className="mt-1 text-sm font-semibold text-white/60">
            Tu contribues comme joueur avec le profil de partie “{playerName}”.
          </p>
        </div>
        <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-black text-white/60">
          toi {myQuestionCount}/{maxQuestionsPerPlayer}
        </span>
      </div>

      <div className="mt-4 grid gap-2">
        {gameType === "who_would" ? (
          <>
            <input className="input rounded-2xl p-3" value={draft} onChange={(event) => onDraftChange(event.target.value)} placeholder="Question / contexte (optionnel)" />
            <input className="input rounded-2xl p-3" value={optionA} onChange={(event) => onOptionAChange(event.target.value)} placeholder="Option A" />
            <input className="input rounded-2xl p-3" value={optionB} onChange={(event) => onOptionBChange(event.target.value)} placeholder="Option B" />
          </>
        ) : (
          <textarea
            value={draft}
            onChange={(event) => onDraftChange(event.target.value)}
            maxLength={220}
            rows={3}
            className="input min-h-24 w-full resize-none rounded-2xl p-3"
            placeholder={gameType === "mime_expressions" ? "Expression à mimer..." : gameType === "jauge" ? "À quel point cette personne..." : "Écris ta question..."}
          />
        )}
        {(gameType === "majority" || gameType === "minority") && (
          <textarea
            value={options}
            onChange={(event) => onOptionsChange(event.target.value)}
            rows={3}
            className="input min-h-20 w-full resize-none rounded-2xl p-3"
            placeholder="Options, une par ligne"
          />
        )}
      </div>

      <button
        type="button"
        disabled={submitting || myQuestionCount >= maxQuestionsPerPlayer}
        onClick={onSubmit}
        className="btn-secondary mt-3 w-full"
      >
        {submitting ? "Ajout..." : myQuestionCount >= maxQuestionsPerPlayer ? "Limite atteinte" : "Ajouter ma question"}
      </button>
      <p className="mt-2 text-center text-xs font-semibold text-white/45">
        {liveQuestionCount}/{expectedQuestionCount} question{expectedQuestionCount > 1 ? "s" : ""} attendue{expectedQuestionCount > 1 ? "s" : ""} si tout le monde contribue.
      </p>
    </section>
  );
}

function JaugeLobbyView({
  players,
  availableCount,
  gameLabel,
  selectedCategories,
  room,
  busy,
  customQuestionCount,
  targetMode,
  questionMode,
  anonymityMode,
  brutalMode,
  autoJaugeMode,
  allowPlayerQuestions,
  finalOrder,
  customOrder,
  onTargetModeChange,
  onQuestionModeChange,
  onAnonymityModeChange,
  onShuffle,
  onMoveCustomPlayer,
  onBrutalModeChange,
  onAutoJaugeModeChange,
  onAllowPlayerQuestionsChange,
  onCustomQuestionCountChange,
  onCommitCustomQuestionCount,
  onToggleCategory,
  onUpdateConfig,
  questionSourceSettings,
  canUseSavedQuestions,
  savedQuestionCount,
  liveQuestionCount,
  questionPoolDiagnostics,
  onQuestionSourceSettingsChange,
  onStart,
  onChangeGame,
}: {
  players: Player[];
  availableCount: number;
  gameLabel: string;
  selectedCategories: string[];
  room: Room;
  busy: boolean;
  customQuestionCount: string;
  targetMode: JaugeTargetMode;
  questionMode: JaugeQuestionMode;
  anonymityMode: JaugeAnonymityMode;
  brutalMode: boolean;
  autoJaugeMode: boolean;
  allowPlayerQuestions: boolean;
  finalOrder: string[];
  customOrder: string[];
  onTargetModeChange: (mode: JaugeTargetMode) => void;
  onQuestionModeChange: (mode: JaugeQuestionMode) => void;
  onAnonymityModeChange: (mode: JaugeAnonymityMode) => void;
  onShuffle: () => void;
  onMoveCustomPlayer: (playerId: string, direction: -1 | 1) => void;
  onBrutalModeChange: (value: boolean) => void;
  onAutoJaugeModeChange: (value: boolean) => void;
  onAllowPlayerQuestionsChange: (value: boolean) => void;
  onCustomQuestionCountChange: (value: string) => void;
  onCommitCustomQuestionCount: () => void;
  onToggleCategory: (category: GameCategory) => void;
  onUpdateConfig: (patch: RoomConfigPatch) => void;
  questionSourceSettings: QuestionSourceSettings;
  canUseSavedQuestions: boolean;
  savedQuestionCount: number;
  liveQuestionCount: number;
  questionPoolDiagnostics: QuestionPoolDiagnostics | null;
  onQuestionSourceSettingsChange: (settings: QuestionSourceSettings) => void;
  onStart: () => void;
  onChangeGame: () => void;
}) {
  const categories = getGameCategories("jauge");
  const enoughPlayers = players.length >= 2;
  const orderedPlayers = getOrderedPlayers(finalOrder, players);
  const customPlayers = getOrderedPlayers(mergePlayerOrder(customOrder, players), players);
  const playerQuestionCount = liveQuestionCount + (room.jauge_game_state?.playerQuestions?.length ?? 0);
  const effectiveQuestionMode = getEffectiveJaugeQuestionMode(questionSourceSettings, questionMode);
  const validCustomSourceCount =
    (questionPoolDiagnostics?.sources.liveValid ?? playerQuestionCount) +
    (questionPoolDiagnostics?.sources.savedValid ?? (questionSourceSettings.useSavedQuestions && canUseSavedQuestions ? savedQuestionCount : 0));
  const hasQuestions = effectiveQuestionMode === "players" ? validCustomSourceCount >= room.total_questions : availableCount >= room.total_questions;
  const canStart = enoughPlayers && finalOrder.length >= 2 && hasQuestions && !busy;

  return (
    <>
      <section className="jauge-config-hero mb-4 overflow-hidden rounded-[2rem] border border-white/10 bg-black/35 p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-wider text-neon-cyan">Jeu sélectionné</div>
            <h2 className="mt-1 text-4xl font-black">{gameLabel}</h2>
            <p className="mt-2 max-w-md text-sm font-semibold text-white/60">
              Une cible, une question, tout le monde note de 1 à 10. Le reveal fait le reste.
            </p>
          </div>
          <button type="button" onClick={onChangeGame} disabled={busy} className="btn-ghost text-neon-cyan">
            Changer
          </button>
        </div>
      </section>

      <section className="card mb-4 p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">Joueurs présents</h2>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-white/55">
            {players.length}
          </span>
        </div>
        <PlayersLobbyGrid players={players} hostClientId={room.host_client_id} />
      </section>

      <section className="card mb-4 p-5">
        <h2 className="mb-4 text-lg font-bold">Rythme de partie</h2>
        <ConfigGroup label="Manches">
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
            <button type="button" disabled={busy} onClick={onCommitCustomQuestionCount} className="btn-secondary rounded-xl px-3 py-2 text-sm">
              OK
            </button>
          </div>
        </ConfigGroup>

        <ConfigGroup label="Timer vote">
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

        <ConfigGroup label="Reveal">
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
            room.autoplay ? "border-neon-cyan bg-neon-cyan/10" : "border-white/10 bg-white/5 text-white/70"
          }`}
        >
          <span className="font-bold">Lecture automatique</span>
          <span className={room.autoplay ? "text-neon-cyan" : "text-white/50"}>{room.autoplay ? "ON" : "OFF"}</span>
        </button>
      </section>

      <QuestionSourcePanel
        settings={questionSourceSettings}
        canUseSavedQuestions={canUseSavedQuestions}
        savedQuestionCount={savedQuestionCount}
        liveQuestionCount={playerQuestionCount}
        onChange={onQuestionSourceSettingsChange}
      />
      {questionPoolDiagnostics?.issue && (
        <p className="mb-4 rounded-2xl border border-neon-yellow/30 bg-neon-yellow/10 p-3 text-sm font-bold text-neon-yellow">
          {questionPoolDiagnostics.issue}
        </p>
      )}

      <section className="card mb-4 p-5">
        <h2 className="mb-4 text-lg font-bold">Cible à noter</h2>
        <div className="grid gap-2 sm:grid-cols-3">
          <OrderModeButton
            active={targetMode === "random"}
            disabled={busy}
            title="Aléatoire"
            subtitle="Évite les répétitions"
            onClick={() => onTargetModeChange("random")}
          />
          <OrderModeButton
            active={targetMode === "arrival"}
            disabled={busy}
            title="Ordre auto"
            subtitle="Selon l'arrivée"
            onClick={() => onTargetModeChange("arrival")}
          />
          <OrderModeButton
            active={targetMode === "custom"}
            disabled={busy}
            title="Personnalisé"
            subtitle="Réglé par l'hôte"
            onClick={() => onTargetModeChange("custom")}
          />
        </div>

        {targetMode === "random" && (
          <button type="button" disabled={busy} onClick={onShuffle} className="btn-secondary mt-3 w-full rounded-xl py-3 text-base">
            Pré-mélanger
          </button>
        )}

        {targetMode === "custom" && (
          <ul className="mt-4 space-y-2">
            {customPlayers.map((player, index) => (
              <li key={player.id} className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neon-pink/15 text-sm font-black text-neon-pink">
                  {index + 1}
                </div>
                <div className="min-w-0 flex-1 truncate font-bold">{player.name}</div>
                <button type="button" disabled={busy || index === 0} onClick={() => onMoveCustomPlayer(player.id, -1)} className="btn-ghost rounded-xl px-3" aria-label={`Monter ${player.name}`}>
                  ↑
                </button>
                <button type="button" disabled={busy || index === customPlayers.length - 1} onClick={() => onMoveCustomPlayer(player.id, 1)} className="btn-ghost rounded-xl px-3" aria-label={`Descendre ${player.name}`}>
                  ↓
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 rounded-2xl border border-white/10 bg-bg-soft p-4">
          <div className="mb-3 text-xs font-bold uppercase tracking-wider text-white/50">Aperçu de passage</div>
          <ol className="space-y-2">
            {orderedPlayers.map((player, index) => (
              <li key={player.id} className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-xs font-black">{index + 1}</span>
                <span className="font-semibold">{player.name}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="card mb-4 p-5">
        <h2 className="mb-4 text-lg font-bold">Questions</h2>
        <div className="grid gap-2 sm:grid-cols-3">
          <OrderModeButton
            active={questionMode === "random"}
            disabled={busy}
            title="Aléatoires"
            subtitle="Pioche variée"
            onClick={() => onQuestionModeChange("random")}
          />
          <OrderModeButton
            active={questionMode === "fixed"}
            disabled={busy}
            title="Ordre fixe"
            subtitle="Déroulé stable"
            onClick={() => onQuestionModeChange("fixed")}
          />
          <OrderModeButton
            active={questionMode === "players"}
            disabled={busy}
            title="Joueurs"
            subtitle={`${playerQuestionCount} proposée${playerQuestionCount > 1 ? "s" : ""}`}
            onClick={() => onQuestionModeChange("players")}
          />
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={() => onAllowPlayerQuestionsChange(!allowPlayerQuestions)}
          className={`mt-3 flex w-full items-center justify-between rounded-2xl border p-4 text-left transition ${
            allowPlayerQuestions ? "border-neon-green/50 bg-neon-green/10" : "border-white/10 bg-white/5 text-white/70"
          }`}
        >
          <span className="font-bold">Questions écrites par les joueurs</span>
          <span className={allowPlayerQuestions ? "text-neon-green" : "text-white/50"}>{allowPlayerQuestions ? "ON" : "OFF"}</span>
        </button>
      </section>

      <section className="card mb-4 p-5">
        <h2 className="mb-3 text-lg font-bold">Catégories</h2>
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => {
            const active = selectedCategories.includes(category.id);
            return (
              <button
                key={category.id}
                type="button"
                disabled={busy}
                onClick={() => onToggleCategory(category.id)}
                className={`prediction-card flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition duration-200 active:scale-[0.96] disabled:opacity-50 ${
                  active
                    ? "border-neon-pink bg-neon-pink/20 text-white shadow-glow-pink"
                    : "border-white/10 bg-white/5 text-white/70 hover:-translate-y-0.5 hover:border-white/20"
                }`}
                title={category.description}
              >
                <span>{category.emoji}</span>
                <span>{category.label}</span>
                {category.adult && <span className="rounded bg-neon-pink/30 px-1 text-[10px] uppercase">18+</span>}
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-sm text-white/50">
          {availableCount} question{availableCount > 1 ? "s" : ""} disponible{availableCount > 1 ? "s" : ""}.
        </p>
      </section>

      <section className="card mb-4 p-5">
        <h2 className="mb-4 text-lg font-bold">Anonymat et tension</h2>
        <div className="grid gap-2">
          <ConfigButton active={anonymityMode === "visible"} disabled={busy} onClick={() => onAnonymityModeChange("visible")}>
            Votes visibles au reveal
          </ConfigButton>
          <ConfigButton active={anonymityMode === "round_anonymous"} disabled={busy} onClick={() => onAnonymityModeChange("round_anonymous")}>
            Anonyme pendant la partie
          </ConfigButton>
          <ConfigButton active={anonymityMode === "final_reveal"} disabled={busy} onClick={() => onAnonymityModeChange("final_reveal")}>
            Auteurs révélés au bilan
          </ConfigButton>
          <ConfigButton active={anonymityMode === "anonymous"} disabled={busy} onClick={() => onAnonymityModeChange("anonymous")}>
            Anonyme permanent
          </ConfigButton>
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={() => onAutoJaugeModeChange(!autoJaugeMode)}
          className={`mt-3 flex w-full items-center justify-between rounded-2xl border p-4 text-left transition ${
            autoJaugeMode ? "border-neon-cyan bg-neon-cyan/10" : "border-white/10 bg-white/5 text-white/70"
          }`}
        >
          <span className="font-bold">Auto-jauge</span>
          <span className={autoJaugeMode ? "text-neon-cyan" : "text-white/50"}>{autoJaugeMode ? "ON" : "OFF"}</span>
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={() => onBrutalModeChange(!brutalMode)}
          className={`mt-3 flex w-full items-center justify-between rounded-2xl border p-4 text-left transition ${
            brutalMode ? "border-neon-pink bg-neon-pink/10" : "border-white/10 bg-white/5 text-white/70"
          }`}
        >
          <span className="font-bold">Mode brutal</span>
          <span className={brutalMode ? "text-neon-pink" : "text-white/50"}>{brutalMode ? "ON" : "OFF"}</span>
        </button>
      </section>

      <section className="card p-5">
        <button type="button" onClick={onStart} disabled={!canStart} className="btn-primary w-full text-xl">
          Valider et lancer la partie
        </button>
        {!enoughPlayers && <p className="mt-3 text-center text-sm text-neon-yellow">Il faut au moins 2 joueurs pour lancer.</p>}
        {!hasQuestions && (
          <p className="mt-3 text-center text-sm text-neon-pink">
            {questionPoolDiagnostics?.issue ?? (effectiveQuestionMode === "players" ? "Aucune question joueur/sauvegardée disponible." : "Réduis le nombre de manches ou ajoute plus de questions.")}
          </p>
        )}
      </section>
    </>
  );
}

function MimeLobbyView({
  players,
  availableCount,
  gameLabel,
  selectedCategories,
  room,
  busy,
  customQuestionCount,
  orderMode,
  hostPlayMode,
  finalOrder,
  customOrder,
  onOrderModeChange,
  onShuffle,
  onMoveCustomPlayer,
  onHostPlayModeChange,
  onCustomQuestionCountChange,
  onCommitCustomQuestionCount,
  onToggleCategory,
  onUpdateConfig,
  questionSourceSettings,
  canUseSavedQuestions,
  savedQuestionCount,
  liveQuestionCount,
  questionPoolDiagnostics,
  onQuestionSourceSettingsChange,
  onStart,
  onChangeGame,
  selectedMode,
  onSelectedModeChange,
}: {
  players: Player[];
  availableCount: number;
  gameLabel: string;
  selectedCategories: string[];
  room: Room;
  busy: boolean;
  customQuestionCount: string;
  orderMode: MimeOrderMode;
  hostPlayMode: boolean;
  finalOrder: string[];
  customOrder: string[];
  onOrderModeChange: (mode: MimeOrderMode) => void;
  onShuffle: () => void;
  onMoveCustomPlayer: (playerId: string, direction: -1 | 1) => void;
  onHostPlayModeChange: (value: boolean) => void;
  onCustomQuestionCountChange: (value: string) => void;
  onCommitCustomQuestionCount: () => void;
  onToggleCategory: (category: GameCategory) => void;
  onUpdateConfig: (patch: RoomConfigPatch) => void;
  questionSourceSettings: QuestionSourceSettings;
  canUseSavedQuestions: boolean;
  savedQuestionCount: number;
  liveQuestionCount: number;
  questionPoolDiagnostics: QuestionPoolDiagnostics | null;
  onQuestionSourceSettingsChange: (settings: QuestionSourceSettings) => void;
  onStart: () => void;
  onChangeGame: () => void;
  selectedMode: MimeMode;
  onSelectedModeChange: (mode: MimeMode) => void;
}) {
  const enoughPlayers = players.length >= 2;
  const canStart = enoughPlayers && finalOrder.length >= 2 && availableCount > 0 && !busy;
  const categories = getGameCategories("mime_expressions");
  const orderedPlayers = getOrderedPlayers(finalOrder, players);
  const customPlayers = getOrderedPlayers(mergePlayerOrder(customOrder, players), players);

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

      <QuestionSourcePanel
        settings={questionSourceSettings}
        canUseSavedQuestions={canUseSavedQuestions}
        savedQuestionCount={savedQuestionCount}
        liveQuestionCount={liveQuestionCount}
        onChange={onQuestionSourceSettingsChange}
      />
      {questionPoolDiagnostics?.issue && (
        <p className="mb-4 rounded-2xl border border-neon-yellow/30 bg-neon-yellow/10 p-3 text-sm font-bold text-neon-yellow">
          {questionPoolDiagnostics.issue}
        </p>
      )}

      <section className="card mb-4 p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">Joueurs présents</h2>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-white/55">
            {players.length}
          </span>
        </div>
        <PlayersLobbyGrid players={players} hostClientId={room.host_client_id} />
      </section>

      <section className="card mb-4 p-5">
        <h2 className="mb-4 text-lg font-bold">Configuration</h2>

        <ConfigGroup label="Manches">
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

        <ConfigGroup label="Timer">
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

        <button
          type="button"
          disabled={busy}
          onClick={() => onHostPlayModeChange(!hostPlayMode)}
          className={`mt-2 flex w-full items-center justify-between rounded-2xl border p-4 text-left transition disabled:opacity-50 ${
            hostPlayMode
              ? "border-neon-cyan bg-neon-cyan/10 text-white"
              : "border-white/10 bg-white/5 text-white/70"
          }`}
        >
          <span className="font-bold">Mode hôte joueur</span>
          <span className={hostPlayMode ? "text-neon-cyan" : "text-white/50"}>
            {hostPlayMode ? "ON" : "OFF"}
          </span>
        </button>
      </section>

      <section className="card mb-4 p-5">
        <h2 className="mb-3 text-lg font-bold">Catégories</h2>
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => {
            const active = selectedCategories.includes(category.id);
            return (
              <button
                key={category.id}
                type="button"
                disabled={busy}
                onClick={() => onToggleCategory(category.id)}
                className={`prediction-card flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition duration-200 active:scale-[0.96] disabled:opacity-50 ${
                  active
                    ? "border-neon-pink bg-neon-pink/20 text-white shadow-glow-pink"
                    : "border-white/10 bg-white/5 text-white/70 hover:-translate-y-0.5 hover:border-white/20"
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
          {availableCount} expression{availableCount > 1 ? "s" : ""} disponible{availableCount > 1 ? "s" : ""}.
        </p>
      </section>

      <section className="card mb-4 p-5">
        <h2 className="mb-3 text-lg font-bold">Mode de jeu</h2>
        <p className="mb-3 text-sm font-semibold text-white/55">
          Change la consigne donnée au mimeur sans bloquer la mécanique. Le timer s&apos;adapte au mode.
        </p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {MIME_MODES.map((mode) => {
            const active = selectedMode === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                disabled={busy}
                onClick={() => onSelectedModeChange(mode.id)}
                className={`rounded-2xl border p-3 text-left transition disabled:opacity-50 ${
                  active
                    ? "border-neon-pink bg-neon-pink/10 shadow-glow-pink"
                    : "border-white/10 bg-white/5 hover:-translate-y-0.5 hover:border-white/20"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-lg" aria-hidden="true">{mode.emoji}</span>
                  <span className={`text-[10px] font-black uppercase tracking-wider ${active ? "text-neon-pink" : "text-white/40"}`}>
                    {mode.id === "chaos_timer" ? "rapide" : mode.timerScale > 1 ? "long" : "standard"}
                  </span>
                </div>
                <div className="mt-1 text-sm font-black">{mode.label}</div>
                <div className="mt-1 text-xs font-semibold text-white/55">{mode.description}</div>
              </button>
            );
          })}
        </div>
        <div className="mt-3 rounded-2xl border border-neon-cyan/30 bg-neon-cyan/10 p-3 text-sm font-semibold text-neon-cyan">
          <strong className="font-black">Consigne :</strong> {getMimeModeMeta(selectedMode).rule}
        </div>
      </section>

      <section className="card mb-4 p-5">
        <h2 className="mb-4 text-lg font-bold">Ordre de passage</h2>
        <div className="grid gap-2 sm:grid-cols-3">
          <OrderModeButton
            active={orderMode === "arrival"}
            disabled={busy}
            title="Ordre d'arrivée"
            subtitle="Selon l'entrée dans la room"
            onClick={() => onOrderModeChange("arrival")}
          />
          <OrderModeButton
            active={orderMode === "random"}
            disabled={busy}
            title="Aléatoire"
            subtitle="Mélangé au lancement"
            onClick={() => onOrderModeChange("random")}
          />
          <OrderModeButton
            active={orderMode === "custom"}
            disabled={busy}
            title="Personnalisé"
            subtitle="Réorganisé par l'hôte"
            onClick={() => onOrderModeChange("custom")}
          />
        </div>

        {orderMode === "random" && (
          <button
            type="button"
            disabled={busy}
            onClick={onShuffle}
            className="btn-secondary mt-3 w-full rounded-xl py-3 text-base"
          >
            Remélanger
          </button>
        )}

        {orderMode === "custom" && (
          <ul className="mt-4 space-y-2">
            {customPlayers.map((player, index) => (
              <li key={player.id} className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neon-cyan/15 text-sm font-black text-neon-cyan">
                  {index + 1}
                </div>
                <div className="min-w-0 flex-1 truncate font-bold">{player.name}</div>
                <button
                  type="button"
                  disabled={busy || index === 0}
                  onClick={() => onMoveCustomPlayer(player.id, -1)}
                  className="btn-ghost rounded-xl px-3"
                  aria-label={`Monter ${player.name}`}
                >
                  ↑
                </button>
                <button
                  type="button"
                  disabled={busy || index === customPlayers.length - 1}
                  onClick={() => onMoveCustomPlayer(player.id, 1)}
                  className="btn-ghost rounded-xl px-3"
                  aria-label={`Descendre ${player.name}`}
                >
                  ↓
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 rounded-2xl border border-white/10 bg-bg-soft p-4">
          <div className="mb-3 text-xs font-bold uppercase tracking-wider text-white/50">Aperçu final</div>
          <ol className="space-y-2">
            {orderedPlayers.map((player, index) => (
              <li key={player.id} className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-xs font-black">
                  {index + 1}
                </span>
                <span className="font-semibold">{player.name}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="card p-5">
        <button type="button" onClick={onStart} disabled={!canStart} className="btn-primary w-full text-xl">
          Valider et lancer la partie
        </button>
        {!enoughPlayers && (
          <p className="mt-3 text-center text-sm text-neon-yellow">
            Il faut au moins 2 joueurs pour lancer.
          </p>
        )}
        {availableCount === 0 && (
          <p className="mt-3 text-center text-sm text-neon-pink">
            Aucune expression disponible avec ces catégories.
          </p>
        )}
      </section>
    </>
  );
}

function OrderModeButton({
  active,
  disabled,
  title,
  subtitle,
  onClick,
}: {
  active: boolean;
  disabled: boolean;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-2xl border p-4 text-left transition disabled:opacity-50 ${
        active
          ? "border-neon-cyan bg-neon-cyan/10 shadow-glow-cyan"
          : "border-white/10 bg-white/5 hover:border-white/20"
      }`}
    >
      <div className="font-black">{title}</div>
      <div className="mt-1 text-xs text-white/50">{subtitle}</div>
    </button>
  );
}

function QuestionSourcePanel({
  settings,
  canUseSavedQuestions,
  savedQuestionCount,
  liveQuestionCount,
  onChange,
}: {
  settings: QuestionSourceSettings;
  canUseSavedQuestions: boolean;
  savedQuestionCount: number;
  liveQuestionCount: number;
  onChange: (settings: QuestionSourceSettings) => void;
}) {
  const patch = (next: Partial<QuestionSourceSettings>) => onChange({ ...settings, ...next });
  return (
    <section className="card mb-4 p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-black uppercase tracking-wider text-neon-cyan">Moteur de questions</div>
          <h2 className="text-xl font-black">Sources et mix intelligent</h2>
        </div>
        {canUseSavedQuestions && <a href="/questions" className="btn-ghost text-neon-cyan">Bibliothèque</a>}
      </div>

      <ConfigGroup label="Mode">
        <ConfigButton active={settings.mode === "system_only"} disabled={false} onClick={() => patch({ mode: "system_only", useSystemQuestions: true, useLiveQuestions: false, useSavedQuestions: false })}>
          Système uniquement
        </ConfigButton>
        <ConfigButton active={settings.mode === "players_only"} disabled={false} onClick={() => patch({ mode: "players_only", useSystemQuestions: false, useLiveQuestions: true })}>
          Joueurs uniquement
        </ConfigButton>
        <ConfigButton active={settings.mode === "saved_only"} disabled={!canUseSavedQuestions} onClick={() => patch({ mode: "saved_only", useSystemQuestions: false, useLiveQuestions: false, useSavedQuestions: true })}>
          Sauvegardées uniquement
        </ConfigButton>
        <ConfigButton active={settings.mode === "smart_mix"} disabled={false} onClick={() => patch({ mode: "smart_mix", useSystemQuestions: true, useLiveQuestions: true })}>
          Mix système + joueurs
        </ConfigButton>
        <ConfigButton active={settings.mode === "all_mix"} disabled={!canUseSavedQuestions} onClick={() => patch({ mode: "all_mix", useSystemQuestions: true, useLiveQuestions: true, useSavedQuestions: true })}>
          Tout mixer
        </ConfigButton>
      </ConfigGroup>

      <div className="grid gap-2 sm:grid-cols-3">
        <SourceToggle active={settings.useSystemQuestions} label="Questions système" detail="Base Badaboum" onClick={() => patch({ mode: "smart_mix", useSystemQuestions: !settings.useSystemQuestions })} />
        <SourceToggle active={settings.useLiveQuestions} label="Questions live" detail={`${liveQuestionCount} proposée${liveQuestionCount > 1 ? "s" : ""}`} onClick={() => patch({ mode: "smart_mix", useLiveQuestions: !settings.useLiveQuestions })} />
        <SourceToggle
          active={settings.useSavedQuestions}
          label="Sauvegardées"
          detail={canUseSavedQuestions ? `${savedQuestionCount} dispo` : "Trusted/admin"}
          disabled={!canUseSavedQuestions}
          onClick={() => patch({ mode: "smart_mix", useSavedQuestions: !settings.useSavedQuestions })}
        />
      </div>

      <ConfigGroup label="Auteurs">
        <ConfigButton active={settings.authorVisibility === "hidden"} disabled={false} onClick={() => patch({ authorVisibility: "hidden" })}>Anonyme</ConfigButton>
        <ConfigButton active={settings.authorVisibility === "final_reveal"} disabled={false} onClick={() => patch({ authorVisibility: "final_reveal" })}>Reveal final</ConfigButton>
        <ConfigButton active={settings.authorVisibility === "visible"} disabled={false} onClick={() => patch({ authorVisibility: "visible" })}>Visible</ConfigButton>
      </ConfigGroup>

      <ConfigGroup label="Par joueur">
        {[1, 2, 3, 5, 10].map((count) => (
          <ConfigButton key={count} active={settings.maxQuestionsPerPlayer === count} disabled={false} onClick={() => patch({ maxQuestionsPerPlayer: count })}>
            {count}
          </ConfigButton>
        ))}
      </ConfigGroup>

      <p className="mt-3 text-sm font-semibold text-white/55">
        En mix intelligent, les questions live/sauvegardées sont injectées en priorité, puis les questions système complètent les manches restantes.
      </p>
    </section>
  );
}

function SourceToggle({
  active,
  label,
  detail,
  disabled = false,
  onClick,
}: {
  active: boolean;
  label: string;
  detail: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-2xl border p-4 text-left transition-transform duration-200 will-change-transform active:scale-[0.98] disabled:opacity-40 ${
        active ? "border-neon-green/50 bg-neon-green/10" : "border-white/10 bg-white/5 text-white/70"
      }`}
    >
      <div className="font-black">{label}</div>
      <div className="mt-1 text-xs text-white/50">{detail}</div>
    </button>
  );
}

function MimeActiveHostView({
  expression,
  state,
  currentMimePlayer,
  isHostMime,
  orderedPlayers,
  playersOutsideOrder,
  roundLeft,
  totalRounds,
  busy,
  onReveal,
  onRestart,
  onNext,
  onEnd,
  onAddPlayer,
}: {
  expression: MimeExpressionQuestion;
  state: NonNullable<Room["mime_game_state"]>;
  currentMimePlayer: Player | undefined;
  isHostMime: boolean;
  orderedPlayers: Player[];
  playersOutsideOrder: Player[];
  roundLeft: number;
  totalRounds: number;
  busy: boolean;
  onReveal: () => void;
  onRestart: () => void;
  onNext: () => void;
  onEnd: () => void;
  onAddPlayer: (player: Player) => void;
}) {
  const category = getCategoryForGame("mime_expressions", expression.category);
  const isFinal = state.roundNumber >= totalRounds;
  const timeIsHot = roundLeft <= 5;
  const ended = state.roundStatus === "ended" || roundLeft === 0;
  const showExpression = !state.hostPlayMode || isHostMime;
  const modeMeta = getMimeModeMeta(state.mimeMode);

  return (
    <section key={state.currentMimePlayerId} className="card game-panel-enter flex flex-1 flex-col p-5 animate-reveal-in">
      <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
        {category && <span className="chip">{category.emoji} {category.label}</span>}
        <span className="chip border-neon-pink/40 bg-neon-pink/10 text-neon-pink">
          {modeMeta.emoji} {modeMeta.label}
        </span>
        <span className="chip">Manche {state.roundNumber} / {totalRounds}</span>
        <span className={`chip ${ended ? "border-neon-yellow/50 text-neon-yellow" : "border-neon-cyan/40 text-neon-cyan"}`}>
          {ended ? "Temps écoulé" : "Mime en cours"}
        </span>
      </div>

      <div className="mb-4 rounded-2xl border border-neon-pink/30 bg-neon-pink/5 p-3 text-center text-xs font-semibold text-neon-pink">
        <strong className="font-black">Règle :</strong> {modeMeta.rule}
        {state.mimeRuleFlavor && (
          <div className="mt-1 text-white/80">{state.mimeRuleFlavor}</div>
        )}
      </div>

      <div className={`text-center text-7xl font-black tabular-nums ${timeIsHot ? "timer-hot text-neon-pink" : "text-white"}`}>
        {roundLeft}
      </div>
      <div className="text-center text-sm text-white/50">secondes</div>

      <div className="mt-6 rounded-2xl border border-neon-cyan/40 bg-neon-cyan/10 p-5 text-center">
        <div className="text-xs font-bold uppercase tracking-wider text-neon-cyan">Mime actuel</div>
        <div className="mt-2 text-3xl font-black">{currentMimePlayer?.name ?? "Joueur absent"}</div>
      </div>

      {showExpression ? (
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-5 text-center">
          <div className="text-xs font-bold uppercase tracking-wider text-white/50">Expression</div>
          <div className="mt-3 text-3xl font-black leading-tight">{expression.text}</div>
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-5 text-center">
          <div className="text-xs font-bold uppercase tracking-wider text-white/50">Expression masquée</div>
          <div className="mt-3 text-xl font-bold text-white/80">
            Tu peux deviner avec les autres joueurs.
          </div>
        </div>
      )}

      <MimeHostActions
        busy={busy}
        isFinal={isFinal}
        revealDisabled={state.roundStatus === "revealed"}
        onReveal={onReveal}
        onRestart={onRestart}
        onNext={onNext}
        onEnd={onEnd}
      />

      <MimeOrderPanel
        currentMimePlayerId={state.currentMimePlayerId}
        orderedPlayers={orderedPlayers}
        playersOutsideOrder={playersOutsideOrder}
        busy={busy}
        onAddPlayer={onAddPlayer}
      />
    </section>
  );
}

function MimeRevealHostView({
  expression,
  state,
  currentMimePlayer,
  orderedPlayers,
  playersOutsideOrder,
  totalRounds,
  busy,
  onRestart,
  onNext,
  onEnd,
  onAddPlayer,
}: {
  expression: MimeExpressionQuestion;
  state: NonNullable<Room["mime_game_state"]>;
  currentMimePlayer: Player | undefined;
  orderedPlayers: Player[];
  playersOutsideOrder: Player[];
  totalRounds: number;
  busy: boolean;
  onRestart: () => void;
  onNext: () => void;
  onEnd: () => void;
  onAddPlayer: (player: Player) => void;
}) {
  const category = getCategoryForGame("mime_expressions", expression.category);
  const isFinal = state.roundNumber >= totalRounds;

  return (
    <section key={`revealed-${state.currentExpressionId}`} className="card game-panel-enter flex flex-1 flex-col p-5 animate-reveal-in">
      <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
        {category && <span className="chip">{category.emoji} {category.label}</span>}
        <span className="chip">Manche {state.roundNumber} / {totalRounds}</span>
        <span className="chip border-neon-green/50 text-neon-green">Expression révélée</span>
      </div>

      <div className="rounded-2xl border border-neon-green/40 bg-neon-green/10 p-5 text-center">
        <div className="text-xs font-bold uppercase tracking-wider text-neon-green">Expression</div>
        <div className="mt-3 text-4xl font-black leading-tight">{expression.text}</div>
        <div className="mt-4 text-white/60">
          Mime : <span className="font-bold text-white">{currentMimePlayer?.name ?? "Joueur absent"}</span>
        </div>
      </div>

      <MimeHostActions
        busy={busy}
        isFinal={isFinal}
        revealDisabled
        onReveal={() => {}}
        onRestart={onRestart}
        onNext={onNext}
        onEnd={onEnd}
      />

      <MimeOrderPanel
        currentMimePlayerId={state.currentMimePlayerId}
        orderedPlayers={orderedPlayers}
        playersOutsideOrder={playersOutsideOrder}
        busy={busy}
        onAddPlayer={onAddPlayer}
      />
    </section>
  );
}

function MimeHostActions({
  busy,
  isFinal,
  revealDisabled,
  onReveal,
  onRestart,
  onNext,
  onEnd,
}: {
  busy: boolean;
  isFinal: boolean;
  revealDisabled: boolean;
  onReveal: () => void;
  onRestart: () => void;
  onNext: () => void;
  onEnd: () => void;
}) {
  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <button type="button" disabled={busy || revealDisabled} onClick={onReveal} className="btn-primary">
        Révéler l'expression
      </button>
      <button type="button" disabled={busy} onClick={onRestart} className="btn-secondary">
        Relancer la manche
      </button>
      <button type="button" disabled={busy} onClick={isFinal ? onEnd : onNext} className="btn-secondary">
        {isFinal ? "Résultats finaux" : "Manche suivante"}
      </button>
      <button type="button" disabled={busy} onClick={onEnd} className="btn-ghost text-neon-pink">
        Terminer la partie
      </button>
    </div>
  );
}

function MimeOrderPanel({
  currentMimePlayerId,
  orderedPlayers,
  playersOutsideOrder,
  busy,
  onAddPlayer,
}: {
  currentMimePlayerId: string;
  orderedPlayers: Player[];
  playersOutsideOrder: Player[];
  busy: boolean;
  onAddPlayer: (player: Player) => void;
}) {
  return (
    <div className="mt-5 rounded-2xl border border-white/10 bg-bg-soft p-4">
      <div className="mb-3 text-xs font-bold uppercase tracking-wider text-white/50">Ordre de passage</div>
      <ol className="space-y-2">
        {orderedPlayers.map((player, index) => (
          <li
            key={player.id}
            className={`flex items-center gap-3 rounded-xl p-3 ${
              player.id === currentMimePlayerId
                ? "border border-neon-cyan/50 bg-neon-cyan/10"
                : "border border-white/10 bg-white/5"
            }`}
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-xs font-black">
              {index + 1}
            </span>
            <span className="min-w-0 flex-1 truncate font-semibold">{player.name}</span>
            {player.id === currentMimePlayerId && <span className="text-xs font-bold text-neon-cyan">En cours</span>}
          </li>
        ))}
      </ol>

      {playersOutsideOrder.length > 0 && (
        <div className="mt-4">
          <div className="mb-2 text-xs font-bold uppercase tracking-wider text-white/50">Nouveaux joueurs</div>
          <div className="grid gap-2">
            {playersOutsideOrder.map((player) => (
              <button
                key={player.id}
                type="button"
                disabled={busy}
                onClick={() => onAddPlayer(player)}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left font-semibold transition hover:border-neon-cyan/50 disabled:opacity-50"
              >
                Ajouter {player.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
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
    <section className="card game-panel-enter flex flex-1 flex-col p-5 text-center animate-reveal-in">
      <div className="flex items-center justify-center gap-2">
        {category && <span className="chip">{category.emoji} {category.label}</span>}
        <span className="rounded-full bg-neon-pink/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-neon-pink animate-pulseSoft">
          Vote ouvert
        </span>
      </div>
      <div className={`mt-4 text-7xl font-black tabular-nums ${voteLeft <= 5 ? "timer-hot text-neon-pink" : "text-white"}`}>{voteLeft}</div>
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
      {question.text && <h2 className="mt-4 text-center text-3xl font-black leading-tight">{question.text}</h2>}
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
      onClick={() => {
        triggerHaptic(10);
        onClick();
      }}
      className={`prediction-card flex min-h-40 flex-col items-center justify-center rounded-2xl border-2 p-4 text-center transition duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 ${base} ${selected ? selectedClass : "hover:-translate-y-0.5 hover:bg-white/10"}`}
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
        <PlayerAvatar player={player} size="md" />
        <span className="truncate text-xl font-black">{player.name}</span>
      </span>
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
        onClick={() => {
          triggerHaptic([12, 30, 18]);
          onSubmit();
        }}
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
      {question.text && <h2 className="mb-3 text-center text-3xl font-black leading-tight">{question.text}</h2>}
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
    <section className="card game-panel-enter flex flex-1 flex-col p-5">
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
            {isFinal ? "Résultats finaux" : "Question suivante"}
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
  const shownPercent = useCountUp(percent);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 animate-reveal-in">
      <div className={`text-xs font-bold uppercase tracking-widest ${labelColor}`}>{label}</div>
      <div className="mt-2 text-base font-semibold text-white/90">{text}</div>
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
    if (isPredictionGame(gameType)) return Boolean(vote.selected_option);
    return false;
  }).length;
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

function getJaugeLobbyOrder(
  mode: JaugeTargetMode,
  players: Player[],
  randomOrder: string[],
  customOrder: string[]
): string[] {
  if (mode === "arrival") return getArrivalOrder(players);
  if (mode === "custom") return mergePlayerOrder(customOrder, players);
  const arrivalOrder = getArrivalOrder(players);
  return randomOrder.length ? mergePlayerOrder(randomOrder, players) : shuffleJaugeIds(arrivalOrder);
}

function getEffectiveJaugeQuestionMode(settings: QuestionSourceSettings, fallback: JaugeQuestionMode): JaugeQuestionMode {
  if (settings.mode === "system_only") return "fixed";
  if (settings.mode === "players_only" || settings.mode === "saved_only") return "players";
  if (!settings.useSystemQuestions && (settings.useLiveQuestions || settings.useSavedQuestions)) return "players";
  if (fallback === "fixed" && (settings.useLiveQuestions || settings.useSavedQuestions)) return "random";
  return fallback;
}

function dedupeJaugePlayerQuestions(questions: NonNullable<Room["jauge_game_state"]>["playerQuestions"]) {
  const seen = new Set<number>();
  const output: NonNullable<Room["jauge_game_state"]>["playerQuestions"] = [];
  for (const question of questions) {
    if (seen.has(question.id)) continue;
    seen.add(question.id);
    output.push(question);
  }
  return output;
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

function sameOrder(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}

function uniqueIds(ids: number[]): number[] {
  return [...new Set(ids.filter((id) => Number.isFinite(id) && id !== 0))];
}

function addUniqueId(ids: number[], id: number): number[] {
  return uniqueIds([...ids, id]);
}

function describeError(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message;
  if (err && typeof err === "object") {
    const candidate = err as { message?: unknown; details?: unknown; hint?: unknown; code?: unknown };
    const parts: string[] = [];
    if (typeof candidate.message === "string" && candidate.message) parts.push(candidate.message);
    if (typeof candidate.details === "string" && candidate.details) parts.push(candidate.details);
    if (typeof candidate.hint === "string" && candidate.hint) parts.push(`(${candidate.hint})`);
    if (typeof candidate.code === "string" && candidate.code) parts.push(`[${candidate.code}]`);
    if (parts.length) return parts.join(" ");
  }
  if (typeof err === "string" && err) return err;
  return fallback;
}

function labelStatus(status: string, gameLabel?: string) {
  switch (status) {
    case "lobby": return "Lobby";
    case "question_active": return gameLabel === "Mime" ? "Mime en cours" : "Vote en cours";
    case "reveal_results": return "Révélation";
    case "scoreboard": return "Scoreboard";
    case "end_game_summary": return "Bilan";
    case "ended": return "Terminée";
    default: return status;
  }
}

function TvHostStage({
  room,
  players,
  gameLabel,
  gameType,
  currentQuestionText,
  voteLeft,
  submittedVotesCount,
  submittedJaugeCount,
  totalParticipants,
  totalJaugeVoters,
  isJauge,
  onRevealNow,
  onNext,
  onEnd,
  busy,
}: {
  room: Room;
  players: Player[];
  gameLabel: string | undefined;
  gameType: GameType | null;
  currentQuestionText: string | null;
  voteLeft: number;
  submittedVotesCount: number;
  submittedJaugeCount: number;
  totalParticipants: number;
  totalJaugeVoters: number;
  isJauge: boolean;
  onRevealNow: () => void;
  onNext: () => Promise<void> | void;
  onEnd: () => void;
  busy: boolean;
}) {
  const isLobby = room.status === "lobby";
  const isQuestionActive = room.status === "question_active";
  const showLobbyHero = isLobby;
  const denominator = isJauge ? totalJaugeVoters : totalParticipants;
  const submittedNow = isJauge ? submittedJaugeCount : submittedVotesCount;
  const progress = denominator > 0 ? Math.min(100, (submittedNow / denominator) * 100) : 0;
  const timerHot = voteLeft > 0 && voteLeft <= 5;

  const joinHost = useMemo(() => {
    if (typeof window === "undefined") return "badaboum.app";
    return window.location.host || "badaboum.app";
  }, []);
  const joinUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/play/${room.code}`;
  }, [room.code]);
  const qrUrl = useMemo(() => {
    if (!joinUrl) return null;
    const params = new URLSearchParams({
      size: "320x320",
      margin: "10",
      qzone: "2",
      data: joinUrl,
      color: "0a0410",
      bgcolor: "ffffff",
      format: "svg",
    });
    return `https://api.qrserver.com/v1/create-qr-code/?${params.toString()}`;
  }, [joinUrl]);

  return (
    <section className="tv-stage mb-4" aria-label="Mode TV">
      <div className="tv-topbar">
        <div className="tv-topbar-brand">
          <span className="app-navbar-brand-mark" aria-hidden="true">B</span>
          <div>
            <div className="tv-topbar-eyebrow">Mode TV · Badaboum</div>
            <div className="tv-topbar-title">{gameLabel ?? "Sélection du jeu"}</div>
          </div>
        </div>
        <div className="tv-topbar-meta">
          <span>Code : {room.code}</span>
          <span>{players.length} joueur{players.length > 1 ? "s" : ""}</span>
          <span>{labelStatus(room.status, gameLabel)}</span>
        </div>
      </div>

      {showLobbyHero && (
        <div className="tv-lobby-hero">
          <div className="tv-code-card">
            <div className="tv-code-card-header">
              <span className="tv-code-eyebrow">Rejoins la partie</span>
              <span className="tv-code-host">{joinHost}</span>
            </div>
            <div className="tv-code-value-wrap">
              <span className="tv-code-value">{room.code}</span>
            </div>
            {qrUrl && (
              <figure className="tv-code-qr">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrUrl}
                  alt={`QR code pour rejoindre la salle ${room.code}`}
                  loading="lazy"
                  decoding="async"
                  width={240}
                  height={240}
                />
                <figcaption>Scanne pour rejoindre direct</figcaption>
              </figure>
            )}
            <div className="tv-code-instructions">
              <p className="tv-code-instructions-primary">
                <span aria-hidden="true">📱</span>
                <span><strong>Scanne le QR code</strong> pour rejoindre directement la salle.</span>
              </p>
              <p className="tv-code-instructions-secondary">
                Pas de QR ? Ouvre <strong>{joinHost}</strong> et entre <span className="tv-code-inline">{room.code}</span>.
              </p>
            </div>
          </div>

          <div className="tv-players-panel">
            <div className="tv-players-panel-header">
              <span className="tv-players-panel-title">Joueurs en attente</span>
              <span className="tv-players-panel-count">{players.length}</span>
            </div>
            {players.length === 0 ? (
              <div className="lobby-grid-empty">
                <span className="lobby-grid-empty-pulse" aria-hidden="true" />
                <p>En attente du premier joueur. Partage le code !</p>
              </div>
            ) : (
              <div className="tv-players-grid">
                {players.map((player, index) => (
                  <article key={player.id} className="tv-player-card" style={{ animationDelay: `${Math.min(index, 18) * 60}ms` }}>
                    <PlayerAvatar player={player} size="lg" />
                    <span className="tv-player-name">{player.name}</span>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {isQuestionActive && currentQuestionText && (
        <div className="tv-vote-progress-card">
          <div className="flex items-start justify-between gap-4">
            <div className="tv-vote-progress-label">Question en cours · {gameLabel}</div>
            <div className={`tv-timer-pill ${timerHot ? "is-hot" : ""}`}>{voteLeft}s</div>
          </div>
          <p className="tv-vote-progress-question">{currentQuestionText}</p>
          <div className="tv-vote-progress-counter">{submittedNow} / {denominator || "?"}</div>
          <div className="tv-vote-progress-bar">
            <div className="tv-vote-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="tv-section-eyebrow">Les votes apparaissent en direct. Reveal automatique quand tout le monde a répondu.</div>
        </div>
      )}

      {(isQuestionActive || room.status === "reveal_results") && (
        <div className="tv-host-toolbar">
          {isQuestionActive && (
            <button type="button" disabled={busy} onClick={onRevealNow} className="tv-host-toolbar-button is-primary">
              Révéler maintenant
            </button>
          )}
          {room.status === "reveal_results" && gameType !== "mime_expressions" && (
            <button type="button" disabled={busy} onClick={() => void onNext()} className="tv-host-toolbar-button is-primary">
              Question suivante
            </button>
          )}
          <button type="button" disabled={busy} onClick={onEnd} className="tv-host-toolbar-button is-danger">
            Finir la partie
          </button>
        </div>
      )}
    </section>
  );
}
