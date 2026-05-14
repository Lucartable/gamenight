"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AdminStatusBar } from "@/components/adminStatus";
import { AdminDebugPanel } from "@/components/adminDebugPanel";
import { ValidationParticles } from "@/components/validationParticles";
import { SaveQuestionButton } from "@/components/saveQuestionButton";
import { playSfx, primeAudio } from "@/lib/audio";
import { getSupabase } from "@/lib/supabase";
import { useRoom } from "@/lib/useRoom";
import { useValidationEvents } from "@/lib/useValidationEvents";
import { useCountdown } from "@/lib/useCountdown";
import {
  type GameCategory,
  type GameQuestion,
  type MimeExpressionQuestion,
  type PredictionGameQuestion,
  type WhoOfUsGameQuestion,
  type WhoWouldQuestion,
  getDefaultCategories,
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
import { getQuestionSourceSettings, type QuestionPoolItem } from "@/lib/questionPoolTypes";
import { saveQuestionToLibrary } from "@/lib/saveQuestion";
import { buildCustomQuestionSubmission, hasDuplicateCustomQuestion } from "@/lib/customQuestionSubmission";
import {
  filterJaugePlayerQuestionsAfterClear,
  getPlayedLiveQuestionIdsForGame,
} from "@/lib/customQuestionCleanup";
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
import { getEffectiveJaugeQuestionMode } from "@/lib/jaugeQuestionMode";
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
import { TvHostStage, TvStatusStrip } from "@/components/tvHostStage";
import {
  CenteredMessage,
  GameSelectionView,
  RoomHeader,
} from "@/components/host/hostShell";
import {
  HostCustomQuestionPanel,
  TransferPanel,
} from "@/components/host/panels";
import { LobbyView } from "@/components/host/lobbyView";
import { JaugeLobbyView } from "@/components/host/jaugeLobbyView";
import { MimeLobbyView } from "@/components/host/mimeLobbyView";
import {
  MimeActiveHostView,
  MimeRevealHostView,
} from "@/components/host/mimeHostViews";
import {
  WhoOfUsActiveView,
  WhoOfUsRevealView,
  WhoWouldActiveView,
  WhoWouldRevealView,
} from "@/components/host/voteHostViews";
import { getIntrusGameState, isIntrusGame } from "@/lib/intrusGame";
import {
  addUniqueId,
  countSubmittedRatings,
  countSubmittedVotes,
  dedupeJaugePlayerQuestions,
  describeError,
  getJaugeLobbyOrder,
  getSelectedCategories,
  sameOrder,
  uniqueIds,
  voteToLocalVote,
  type HostLocalVote,
} from "@/lib/hostGameRuntime";
import { EndGameSummaryPanel } from "@/components/endGameSummary";
import {
  computePredictionScores,
  hasReachedScoreTarget,
  isPredictionGame,
} from "@/lib/scoring";
import {
  DEFAULT_REVEAL_DURATION_SEC,
  DEFAULT_SCOREBOARD_DURATION_SEC,
  DEFAULT_TOTAL_QUESTIONS,
  DEFAULT_VOTE_DURATION_SEC,
  clampInt,
  getOrCreateClientId,
  getParticipants,
  isTvRoom,
  secondsLeft,
} from "@/lib/utils";
import type {
  Choice,
  GameType,
  JaugeAnonymityMode,
  JaugeQuestionMode,
  JaugeTargetMode,
  Player,
  QuestionSourceSettings,
  Room,
} from "@/types/database";

import type { RoomConfigPatch } from "@/lib/hostTypes";

interface LocalRating {
  qid: number;
  rating: number;
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
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [showTransfer, setShowTransfer] = useState(false);
  const [customQuestionCount, setCustomQuestionCount] = useState(String(DEFAULT_TOTAL_QUESTIONS));
  const [hostSelectedOption, setHostSelectedOption] = useState<Choice | null>(null);
  const [hostSelectedPlayerId, setHostSelectedPlayerId] = useState<string | null>(null);
  const [hostSelectedPredictionOption, setHostSelectedPredictionOption] = useState<string | null>(null);
  const [hostSelectedRating, setHostSelectedRating] = useState<number | null>(null);
  const [hostSubmitting, setHostSubmitting] = useState(false);
  const [optimisticHostVote, setOptimisticHostVote] = useState<HostLocalVote | null>(null);
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
  const [clearingLiveQuestions, setClearingLiveQuestions] = useState(false);
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

  useEffect(() => {
    if (!tvMode || typeof window === "undefined") return;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [room?.current_question_id, room?.scoreboard_started_at, room?.status, tvMode]);

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
  const liveQuestionCountForRoom = customQuestions.length;
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
  const intrusGameState = useMemo(() => getIntrusGameState(room?.intrus_game_state), [room?.intrus_game_state]);
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
  const playedLiveQuestionIdsForGame = useMemo(
    () =>
      getPlayedLiveQuestionIdsForGame({
        customQuestions,
        gameType,
        askedQuestionIds: askedForGameIds,
        roundQuestionIds,
      }),
    [askedForGameIds, customQuestions, gameType, roundQuestionIds],
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
    setActionNotice(null);
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
    setActionNotice(null);
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
    setActionNotice(null);
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

  async function clearLiveQuestions(scope: "all" | "played") {
    setActionError(null);
    setActionNotice(null);
    if (!room || !gameType || clearingLiveQuestions) return;
    const questionCount = scope === "all" ? customQuestions.length : playedLiveQuestionIdsForGame.length;

    if (questionCount === 0) {
      setActionNotice(
        scope === "all"
          ? "Aucune question joueur à vider dans cette room."
          : "Aucune question joueur déjà jouée à supprimer.",
      );
      return;
    }

    const confirmed = confirm(
      scope === "all"
        ? `Supprimer les ${questionCount} question${questionCount > 1 ? "s" : ""} joueur${questionCount > 1 ? "s" : ""} de cette room ? Les questions système et la bibliothèque ne seront pas touchées.`
        : `Supprimer les ${questionCount} question${questionCount > 1 ? "s" : ""} joueur${questionCount > 1 ? "s" : ""} déjà jouée${questionCount > 1 ? "s" : ""} ? Les questions non jouées restent disponibles.`,
    );
    if (!confirmed) return;

    setClearingLiveQuestions(true);
    try {
      let query = getSupabase()
        .from("custom_questions")
        .delete()
        .eq("room_id", room.id);
      if (scope === "played") {
        query = query.eq("game_type", gameType).in("local_question_id", playedLiveQuestionIdsForGame);
      }
      const { error } = await query;
      if (error) throw error;

      if (room.jauge_game_state) {
        const nextPlayerQuestions = filterJaugePlayerQuestionsAfterClear({
          playerQuestions: room.jauge_game_state.playerQuestions ?? [],
          scope,
          playedLiveQuestionIds: playedLiveQuestionIdsForGame,
        });
        if (nextPlayerQuestions.length !== (room.jauge_game_state.playerQuestions ?? []).length) {
          const { error: roomError } = await getSupabase()
            .from("rooms")
            .update({
              jauge_game_state: {
                ...room.jauge_game_state,
                playerQuestions: nextPlayerQuestions,
              },
            })
            .eq("id", room.id);
          if (roomError) throw roomError;
        }
      }

      setActionNotice(
        scope === "all"
          ? "Questions joueurs vidées dans cette room. La bibliothèque n'a pas été modifiée."
          : "Questions joueurs déjà jouées supprimées. Les questions restantes restent dans le mix.",
      );
      await refresh();
    } catch (err) {
      setActionError(describeError(err, "Impossible de vider les questions joueurs."));
    } finally {
      setClearingLiveQuestions(false);
    }
  }

  useEffect(() => {
    if (!tvMode) return;
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  }, [
    intrusGameState?.phase,
    mimeGameState?.roundNumber,
    mimeGameState?.roundStatus,
    room?.current_question_id,
    room?.reveal_started_at,
    room?.scoreboard_started_at,
    room?.status,
    tvMode,
  ]);

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
        intrusGameState={intrusGameState}
        isHost
        isTv={tvMode}
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
  const isTvLobbyConfig = tvMode && room.status === "lobby";
  const isTvGameActive = tvMode && room.status === "question_active" && gameType !== "mime_expressions" && gameType !== "intrus";
  const shouldShowTvStage = isTvLobbyConfig || isTvGameActive;
  const shouldShowTvStatusStrip = tvMode && !shouldShowTvStage;
  const phaseShellClass = tvMode
    ? isTvLobbyConfig
      ? "tv-lobby-config-panel"
      : !shouldShowTvStage
        ? "tv-phase-shell"
        : "contents"
    : "contents";

  return (
    <main className={`game-stage ${tvMode ? `tv-game-stage ${isTvLobbyConfig ? "tv-lobby-config-stage" : "tv-play-stage"} mx-auto flex min-h-dvh w-full max-w-[min(100vw,1440px)] px-4 py-4 lg:px-8 lg:py-6` : "mx-auto flex min-h-dvh max-w-2xl px-5 py-6"} flex-col`}>
      {!tvMode && (
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
      )}

      {!tvMode && (
        <AdminStatusBar
          userEmail={profileState.userEmail}
          role={profileState.role}
          canManageQuestions={profileState.canManageQuestions}
          loading={profileState.loading}
          compact
          onSignOut={() => void profileState.signOut()}
        />
      )}

      {shouldShowTvStatusStrip && (
        <TvStatusStrip
          room={room}
          playersCount={participants.length}
          gameLabel={gameDefinition?.label}
          round={displayRound}
          totalQuestions={totalQuestions}
        />
      )}

      {shouldShowTvStage && (
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

      {!tvMode && showTransfer && (
        <TransferPanel
          players={otherPlayers}
          busy={busy}
          onPick={transferHostTo}
          onClose={() => setShowTransfer(false)}
        />
      )}

      {actionError && (
        <div className={`${tvMode ? "tv-alert" : "card mb-3"} border-neon-pink/60 bg-neon-pink/10 p-3 text-center text-neon-pink`}>
          {actionError}
        </div>
      )}

      {actionNotice && (
        <div className={`${tvMode ? "tv-alert" : "card mb-3"} border-neon-green/50 bg-neon-green/10 p-3 text-center text-neon-green`}>
          {actionNotice}
        </div>
      )}

      {!tvMode && (
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
      )}

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
          roomLiveQuestionCount={liveQuestionCountForRoom}
          playedLiveQuestionCount={playedLiveQuestionIdsForGame.length}
          maxQuestionsPerPlayer={questionSourceSettings.maxQuestionsPerPlayer}
          expectedQuestionCount={players.length * questionSourceSettings.maxQuestionsPerPlayer}
          clearingQuestions={clearingLiveQuestions}
          onDraftChange={setHostQuestionDraft}
          onOptionAChange={setHostQuestionOptionA}
          onOptionBChange={setHostQuestionOptionB}
          onOptionsChange={setHostQuestionOptions}
          onSubmit={submitHostPlayerQuestion}
          onClearPlayedQuestions={() => void clearLiveQuestions("played")}
          onClearAllQuestions={() => void clearLiveQuestions("all")}
        />
      )}

      {!tvMode && (room.status === "question_active" || room.status === "reveal_results") && currentQ && profileState.canManageQuestions && (
        <SaveQuestionButton saving={savingQuestion} notice={saveNotice} onSave={saveCurrentQuestion} />
      )}

      <section className={phaseShellClass}>
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
          isTv={tvMode}
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
          isTv={tvMode}
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
          isTv={tvMode}
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
          isTv={tvMode}
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
          isTv={tvMode}
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
          isTv={tvMode}
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
          isTv={tvMode}
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
      </section>

      {isHostQuestionActive && validationEvents.length > 0 && (
        <ValidationParticles events={validationEvents} />
      )}
    </main>
  );
}

// TvHostStage et labelStatus ont été extraits vers components/tvHostStage.tsx
