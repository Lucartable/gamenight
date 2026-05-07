import type {
  JaugeAnonymityMode,
  JaugeGameState,
  JaugePlayerQuestion,
  JaugeQuestionMode,
  JaugeTargetMode,
  Player,
  Rating,
  Room,
} from "@/types/database";
import { getDefaultCategories, getQuestionsForGame, type JaugeGameQuestion } from "./gameQuestions";

export const JAUGE_GAME_TYPE = "jauge" as const;

export interface JaugeRoundQuestion {
  id: number;
  text: string;
  category: string;
  playerQuestion?: boolean;
  authorPlayerId?: string;
}

export interface JaugeResultRow {
  voter: Player | null;
  rating: number;
  anonymousLabel: string;
  visible: boolean;
}

export interface JaugeRoundResult {
  target: Player | null;
  ratings: Rating[];
  rows: JaugeResultRow[];
  average: number;
  roundedAverage: number;
  min: number;
  max: number;
  spread: number;
  distribution: { rating: number; count: number; percent: number }[];
  comment: string;
  isDivided: boolean;
}

export function isJaugeGame(gameType: string | null | undefined): gameType is typeof JAUGE_GAME_TYPE {
  return gameType === JAUGE_GAME_TYPE;
}

export function getJaugeGameState(value: Room["jauge_game_state"] | unknown): JaugeGameState | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<JaugeGameState>;
  const targetOrder = Array.isArray(raw.targetOrder)
    ? raw.targetOrder.filter((id): id is string => typeof id === "string" && id.length > 0)
    : [];
  const currentTargetIndex = toInt(raw.currentTargetIndex, 0);
  const currentTargetPlayerId =
    typeof raw.currentTargetPlayerId === "string" ? raw.currentTargetPlayerId : targetOrder[currentTargetIndex] ?? "";
  const questionOrder = Array.isArray(raw.questionOrder)
    ? raw.questionOrder.map((id) => toInt(id, 0)).filter((id) => id !== 0)
    : [];
  const usedQuestionIds = Array.isArray(raw.usedQuestionIds)
    ? raw.usedQuestionIds.map((id) => toInt(id, 0)).filter((id) => id !== 0)
    : [];
  const playerQuestions = Array.isArray(raw.playerQuestions)
    ? raw.playerQuestions
        .map((item) => normalizePlayerQuestion(item))
        .filter((item): item is JaugePlayerQuestion => Boolean(item))
    : [];

  return {
    targetMode: isTargetMode(raw.targetMode) ? raw.targetMode : "random",
    targetOrder,
    currentTargetIndex: clampIndex(currentTargetIndex, targetOrder.length),
    currentTargetPlayerId,
    questionMode: isQuestionMode(raw.questionMode) ? raw.questionMode : "random",
    questionOrder,
    currentQuestionOrderIndex: toInt(raw.currentQuestionOrderIndex, 0),
    currentQuestionText: typeof raw.currentQuestionText === "string" ? raw.currentQuestionText : "",
    currentQuestionCategory: typeof raw.currentQuestionCategory === "string" ? raw.currentQuestionCategory : "jauge",
    usedQuestionIds,
    roundNumber: toInt(raw.roundNumber, 0),
    anonymityMode: isAnonymityMode(raw.anonymityMode) ? raw.anonymityMode : "visible",
    brutalMode: raw.brutalMode === true,
    autoJaugeMode: raw.autoJaugeMode === true,
    allowPlayerQuestions: raw.allowPlayerQuestions === true,
    playerQuestions,
  };
}

export function buildInitialJaugeState({
  players,
  selectedCategories,
  targetMode,
  targetOrder,
  questionMode,
  anonymityMode,
  brutalMode,
  autoJaugeMode,
  allowPlayerQuestions,
  playerQuestions,
  usedQuestionIds,
}: {
  players: Player[];
  selectedCategories: string[];
  targetMode: JaugeTargetMode;
  targetOrder: string[];
  questionMode: JaugeQuestionMode;
  anonymityMode: JaugeAnonymityMode;
  brutalMode: boolean;
  autoJaugeMode: boolean;
  allowPlayerQuestions: boolean;
  playerQuestions: JaugePlayerQuestion[];
  usedQuestionIds: number[];
}): { state: JaugeGameState; question: JaugeRoundQuestion } | null {
  const order = buildTargetOrder(players, targetMode, targetOrder, null);
  const target = order[0];
  const questionOrder = buildQuestionOrder(selectedCategories, questionMode, playerQuestions, usedQuestionIds);
  const question = pickJaugeQuestion({
    selectedCategories,
    questionMode,
    playerQuestions,
    questionOrder,
    currentQuestionOrderIndex: 0,
    usedQuestionIds,
  });
  if (!target || !question) return null;

  return {
    question,
    state: {
      targetMode,
      targetOrder: order,
      currentTargetIndex: 0,
      currentTargetPlayerId: target,
      questionMode,
      questionOrder,
      currentQuestionOrderIndex: questionOrder.indexOf(question.id) >= 0 ? questionOrder.indexOf(question.id) : 0,
      currentQuestionText: question.text,
      currentQuestionCategory: question.category,
      usedQuestionIds: [...usedQuestionIds, question.id],
      roundNumber: 1,
      anonymityMode,
      brutalMode,
      autoJaugeMode,
      allowPlayerQuestions,
      playerQuestions,
    },
  };
}

export function buildNextJaugeState({
  players,
  selectedCategories,
  previous,
  extraUsedQuestionIds,
}: {
  players: Player[];
  selectedCategories: string[];
  previous: JaugeGameState;
  extraUsedQuestionIds: number[];
}): { state: JaugeGameState; question: JaugeRoundQuestion } | null {
  const order = buildTargetOrder(players, previous.targetMode, previous.targetOrder, previous.currentTargetPlayerId);
  const currentIndex = Math.max(0, order.indexOf(previous.currentTargetPlayerId));
  const nextTargetIndex = previous.targetMode === "random"
    ? pickLeastRecentTargetIndex(order, previous.currentTargetPlayerId)
    : (currentIndex + 1) % Math.max(1, order.length);
  const usedQuestionIds = uniqueIds([...previous.usedQuestionIds, ...extraUsedQuestionIds]);
  const questionOrder = previous.questionOrder.length
    ? previous.questionOrder
    : buildQuestionOrder(selectedCategories, previous.questionMode, previous.playerQuestions, usedQuestionIds);
  const question = pickJaugeQuestion({
    selectedCategories,
    questionMode: previous.questionMode,
    playerQuestions: previous.playerQuestions,
    questionOrder,
    currentQuestionOrderIndex: previous.currentQuestionOrderIndex + 1,
    usedQuestionIds,
  });
  if (!order.length || !question) return null;
  const questionOrderIndex = questionOrder.indexOf(question.id);

  return {
    question,
    state: {
      ...previous,
      targetOrder: order,
      currentTargetIndex: nextTargetIndex,
      currentTargetPlayerId: order[nextTargetIndex] ?? "",
      questionOrder,
      currentQuestionOrderIndex: questionOrderIndex >= 0 ? questionOrderIndex : previous.currentQuestionOrderIndex + 1,
      currentQuestionText: question.text,
      currentQuestionCategory: question.category,
      usedQuestionIds: [...usedQuestionIds, question.id],
      roundNumber: previous.roundNumber + 1,
    },
  };
}

export function getJaugeCurrentQuestion(state: JaugeGameState | null, questionId: number | null | undefined): JaugeRoundQuestion | null {
  if (!state || questionId == null) return null;
  const custom = state.playerQuestions.find((question) => question.id === questionId);
  if (custom) return { ...custom, playerQuestion: true };
  const builtin = getQuestionsForGame("jauge").find((question) => question.id === questionId);
  if (builtin && builtin.gameType === "jauge") {
    return {
      id: builtin.id,
      text: builtin.text,
      category: builtin.category,
    };
  }
  return {
    id: questionId,
    text: state.currentQuestionText,
    category: state.currentQuestionCategory,
    playerQuestion: questionId < 0,
  };
}

export function getJaugeRequiredVoters(players: Player[], state: JaugeGameState | null): Player[] {
  if (!state) return [];
  return players.filter((player) => state.autoJaugeMode || player.id !== state.currentTargetPlayerId);
}

export function computeJaugeRoundResult({
  players,
  ratings,
  targetPlayerId,
  anonymityMode,
  finalReveal = false,
}: {
  players: Player[];
  ratings: Rating[];
  targetPlayerId: string;
  anonymityMode: JaugeAnonymityMode;
  finalReveal?: boolean;
}): JaugeRoundResult {
  const playerById = new Map(players.map((player) => [player.id, player]));
  const target = playerById.get(targetPlayerId) ?? null;
  const roundRatings = ratings
    .filter((rating) => rating.target_player_id === targetPlayerId)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  const values = roundRatings.map((rating) => rating.rating);
  const average = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 0;
  const spread = max - min;
  const distribution = Array.from({ length: 10 }, (_, index) => {
    const rating = index + 1;
    const count = values.filter((value) => value === rating).length;
    return {
      rating,
      count,
      percent: values.length ? Math.round((count / values.length) * 100) : 0,
    };
  });
  const showAuthors =
    anonymityMode === "visible" ||
    anonymityMode === "round_anonymous" && finalReveal ||
    anonymityMode === "final_reveal" && finalReveal;
  const rows = roundRatings.map((rating, index) => ({
    voter: playerById.get(rating.voter_player_id) ?? null,
    rating: rating.rating,
    anonymousLabel: `Vote ${index + 1}`,
    visible: showAuthors,
  }));

  return {
    target,
    ratings: roundRatings,
    rows,
    average,
    roundedAverage: Math.round(average * 10) / 10,
    min,
    max,
    spread,
    distribution,
    comment: buildJaugeComment(average, spread),
    isDivided: spread >= 5,
  };
}

export function addJaugePlayerQuestion(state: JaugeGameState | null, text: string, authorPlayerId: string): JaugePlayerQuestion | null {
  const clean = text.trim().replace(/\s+/g, " ");
  if (!state || clean.length < 8) return null;
  return {
    id: -Math.max(1, Date.now() % 1000000000),
    text: clean,
    authorPlayerId,
    category: "joueurs",
  };
}

function buildTargetOrder(
  players: Player[],
  targetMode: JaugeTargetMode,
  targetOrder: string[],
  currentTargetPlayerId: string | null
): string[] {
  const liveIds = new Set(players.map((player) => player.id));
  const arrival = [...players]
    .sort((a, b) => new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime())
    .map((player) => player.id);
  if (targetMode === "custom") {
    const known = targetOrder.filter((id) => liveIds.has(id));
    return [...known, ...arrival.filter((id) => !known.includes(id))];
  }
  if (targetMode === "arrival") return arrival;
  const base = targetOrder.filter((id) => liveIds.has(id));
  const merged = [...base, ...arrival.filter((id) => !base.includes(id))];
  if (currentTargetPlayerId && !merged.includes(currentTargetPlayerId) && liveIds.has(currentTargetPlayerId)) {
    return [currentTargetPlayerId, ...merged];
  }
  return merged.length ? merged : shuffleIds(arrival);
}

function buildQuestionOrder(
  selectedCategories: string[],
  questionMode: JaugeQuestionMode,
  playerQuestions: JaugePlayerQuestion[],
  usedQuestionIds: number[]
): number[] {
  const pool = getJaugeQuestionPool(selectedCategories, questionMode, playerQuestions, usedQuestionIds);
  const ids = pool.map((question) => question.id);
  return questionMode === "fixed" || questionMode === "players" ? ids : shuffleIds(ids);
}

function pickJaugeQuestion({
  selectedCategories,
  questionMode,
  playerQuestions,
  questionOrder,
  currentQuestionOrderIndex,
  usedQuestionIds,
}: {
  selectedCategories: string[];
  questionMode: JaugeQuestionMode;
  playerQuestions: JaugePlayerQuestion[];
  questionOrder: number[];
  currentQuestionOrderIndex: number;
  usedQuestionIds: number[];
}): JaugeRoundQuestion | null {
  const pool = getJaugeQuestionPool(selectedCategories, questionMode, playerQuestions, usedQuestionIds);
  if (!pool.length) return null;
  if (questionMode === "random") return pool[Math.floor(Math.random() * pool.length)];
  const poolById = new Map(pool.map((question) => [question.id, question]));
  for (let offset = 0; offset < Math.max(questionOrder.length, pool.length); offset += 1) {
    const id = questionOrder[(currentQuestionOrderIndex + offset) % Math.max(1, questionOrder.length)];
    const question = poolById.get(id);
    if (question) return question;
  }
  return pool[0] ?? null;
}

function getJaugeQuestionPool(
  selectedCategories: string[],
  questionMode: JaugeQuestionMode,
  playerQuestions: JaugePlayerQuestion[],
  usedQuestionIds: number[]
): JaugeRoundQuestion[] {
  const used = new Set(usedQuestionIds);
  if (questionMode === "players") {
    return playerQuestions
      .filter((question) => !used.has(question.id))
      .map((question) => ({ ...question, playerQuestion: true }));
  }
  const categories = selectedCategories.length ? selectedCategories : getDefaultCategories("jauge");
  const builtin = getQuestionsForGame("jauge")
    .filter((question): question is JaugeGameQuestion => question.gameType === "jauge")
    .filter((question) => categories.includes(question.category) && !used.has(question.id))
    .map((question) => ({
      id: question.id,
      text: question.text,
      category: question.category,
    }));
  return questionMode === "random" ? [...builtin, ...playerQuestions.filter((question) => !used.has(question.id))] : builtin;
}

function buildJaugeComment(average: number, spread: number): string {
  if (spread >= 6) return "Impossible de se mettre d’accord. Sujet hautement controversé.";
  if (average >= 8.5) return "Le groupe valide totalement. Niveau de confiance maximal.";
  if (average >= 7) return "Très solide. La table est plutôt convaincue.";
  if (average <= 2.5) return "Catastrophe annoncée. Le groupe n’y croit absolument pas.";
  if (average <= 4) return "Ambiance fragile. La confiance est basse.";
  return "Avis mitigé. Ça débattra sûrement après le reveal.";
}

function pickLeastRecentTargetIndex(order: string[], currentTargetPlayerId: string): number {
  if (!order.length) return 0;
  if (order.length === 1) return 0;
  const options = order.map((id, index) => ({ id, index })).filter((item) => item.id !== currentTargetPlayerId);
  return options[Math.floor(Math.random() * options.length)]?.index ?? 0;
}

export function shuffleIds<T>(ids: T[]): T[] {
  const next = [...ids];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function uniqueIds(ids: number[]): number[] {
  return [...new Set(ids.filter((id) => Number.isFinite(id) && id !== 0))];
}

function normalizePlayerQuestion(value: unknown): JaugePlayerQuestion | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<JaugePlayerQuestion>;
  const id = toInt(raw.id, 0);
  const text = typeof raw.text === "string" ? raw.text.trim() : "";
  const authorPlayerId = typeof raw.authorPlayerId === "string" ? raw.authorPlayerId : "";
  if (!id || text.length < 8 || !authorPlayerId) return null;
  return {
    id,
    text,
    authorPlayerId,
    category: typeof raw.category === "string" ? raw.category : "joueurs",
  };
}

function clampIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  if (!Number.isFinite(index)) return 0;
  return Math.min(length - 1, Math.max(0, Math.round(index)));
}

function toInt(value: unknown, fallback: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed) : fallback;
}

function isTargetMode(value: unknown): value is JaugeTargetMode {
  return value === "random" || value === "arrival" || value === "custom";
}

function isQuestionMode(value: unknown): value is JaugeQuestionMode {
  return value === "random" || value === "fixed" || value === "players";
}

function isAnonymityMode(value: unknown): value is JaugeAnonymityMode {
  return value === "visible" || value === "round_anonymous" || value === "final_reveal" || value === "anonymous";
}
