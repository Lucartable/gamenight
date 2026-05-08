import {
  getDefaultCategories,
  getQuestionsForGame,
  type GameQuestion,
  type JaugeGameQuestion,
  type MimeExpressionQuestion,
  type PredictionGameQuestion,
  type WhoOfUsGameQuestion,
  type WhoWouldQuestion,
} from "./gameQuestions";
import type {
  CustomQuestion,
  GameType,
  QuestionSnapshot,
  QuestionSourceSettings,
  Room,
  SavedCustomQuestion,
} from "@/types/database";

export type QuestionSource = "system" | "live" | "saved";
export type QuestionPoolItem = GameQuestion & {
  source: QuestionSource;
  authorPlayerId?: string | null;
  savedQuestionId?: string | null;
};

export interface QuestionPoolDiagnostics {
  gameType: GameType;
  mode: QuestionSourceSettings["mode"];
  totalRequested: number;
  categories: string[];
  sources: {
    systemRaw: number;
    liveRaw: number;
    savedRaw: number;
    systemValid: number;
    liveValid: number;
    savedValid: number;
    rejected: number;
    final: number;
  };
  issue: string | null;
}

export const DEFAULT_QUESTION_SOURCE_SETTINGS: QuestionSourceSettings = {
  mode: "system_only",
  useSystemQuestions: true,
  useLiveQuestions: false,
  useSavedQuestions: false,
  maxQuestionsPerPlayer: 3,
  authorVisibility: "hidden",
};

export function getQuestionSourceSettings(value: Room["question_source_settings"] | unknown): QuestionSourceSettings {
  if (!value || typeof value !== "object") return DEFAULT_QUESTION_SOURCE_SETTINGS;
  const raw = value as Partial<QuestionSourceSettings>;
  return {
    mode: raw.mode === "players_only" || raw.mode === "saved_only" || raw.mode === "smart_mix" || raw.mode === "all_mix" || raw.mode === "system_only"
      ? raw.mode
      : DEFAULT_QUESTION_SOURCE_SETTINGS.mode,
    useSystemQuestions: raw.useSystemQuestions !== false,
    useLiveQuestions: raw.useLiveQuestions === true,
    useSavedQuestions: raw.useSavedQuestions === true,
    maxQuestionsPerPlayer: clampInt(raw.maxQuestionsPerPlayer, 1, 20, DEFAULT_QUESTION_SOURCE_SETTINGS.maxQuestionsPerPlayer),
    authorVisibility: raw.authorVisibility === "visible" || raw.authorVisibility === "final_reveal" || raw.authorVisibility === "hidden"
      ? raw.authorVisibility
      : DEFAULT_QUESTION_SOURCE_SETTINGS.authorVisibility,
  };
}

export function buildQuestionPlan({
  gameType,
  selectedCategories,
  totalQuestions,
  excludeIds,
  liveQuestions,
  savedQuestions,
  settings,
}: {
  gameType: GameType;
  selectedCategories: string[];
  totalQuestions: number;
  excludeIds: number[];
  liveQuestions: CustomQuestion[];
  savedQuestions: SavedCustomQuestion[];
  settings: QuestionSourceSettings;
}): QuestionPoolItem[] {
  return buildQuestionPlanWithDiagnostics({
    gameType,
    selectedCategories,
    totalQuestions,
    excludeIds,
    liveQuestions,
    savedQuestions,
    settings,
  }).plan;
}

export function buildQuestionPlanWithDiagnostics({
  gameType,
  selectedCategories,
  totalQuestions,
  excludeIds,
  liveQuestions,
  savedQuestions,
  settings,
}: {
  gameType: GameType;
  selectedCategories: string[];
  totalQuestions: number;
  excludeIds: number[];
  liveQuestions: CustomQuestion[];
  savedQuestions: SavedCustomQuestion[];
  settings: QuestionSourceSettings;
}): { plan: QuestionPoolItem[]; diagnostics: QuestionPoolDiagnostics } {
  const categories = selectedCategories.length ? selectedCategories : getDefaultCategories(gameType);
  const excluded = new Set(excludeIds);
  const sourceSettings = resolveSourceSettings(settings);
  const rawSystemQuestions = sourceSettings.useSystemQuestions
    ? getQuestionsForGame(gameType)
        .filter((question) => categories.includes(question.category) && !excluded.has(question.id))
        .map((question) => ({ ...question, source: "system" as const }))
    : [];
  const rawLiveQuestions = sourceSettings.useLiveQuestions
    ? liveQuestions.filter((question) => question.game_type === gameType && isCustomCategoryAllowed(question.category, categories) && !excluded.has(question.local_question_id))
    : [];
  const rawSavedQuestions = sourceSettings.useSavedQuestions
    ? savedQuestions.filter((question) => question.game_type === gameType && isCustomCategoryAllowed(question.category, categories) && !excluded.has(question.local_question_id))
    : [];
  const systemQuestions = rawSystemQuestions.filter((question) => isValidQuestionForGame(question, gameType));
  const live = rawLiveQuestions
    .map((question) => customToQuestion(question))
    .filter((question): question is QuestionPoolItem => Boolean(question))
    .filter((question) => isValidQuestionForGame(question, gameType));
  const saved = rawSavedQuestions
    .map((question) => savedToQuestion(question))
    .filter((question): question is QuestionPoolItem => Boolean(question))
    .filter((question) => isValidQuestionForGame(question, gameType));

  let plan: QuestionPoolItem[];
  if (sourceSettings.mode === "system_only") {
    plan = shuffle(dedupeQuestions(systemQuestions)).slice(0, totalQuestions);
  } else if (sourceSettings.mode === "players_only") {
    plan = shuffle(dedupeQuestions(live)).slice(0, totalQuestions);
  } else if (sourceSettings.mode === "saved_only") {
    plan = shuffle(dedupeQuestions(saved)).slice(0, totalQuestions);
  } else {
    const requiredCustom = shuffle(dedupeQuestions([...live, ...saved])).slice(0, totalQuestions);
    const remainingSlots = Math.max(0, totalQuestions - requiredCustom.length);
    const systemFill = shuffle(dedupeQuestions(systemQuestions)).slice(0, remainingSlots);
    plan = shuffle(dedupeQuestions([...requiredCustom, ...systemFill])).slice(0, totalQuestions);
  }

  const rejected =
    rawSystemQuestions.length + rawLiveQuestions.length + rawSavedQuestions.length -
    (systemQuestions.length + live.length + saved.length);
  const diagnostics: QuestionPoolDiagnostics = {
    gameType,
    mode: sourceSettings.mode,
    totalRequested: totalQuestions,
    categories,
    sources: {
      systemRaw: rawSystemQuestions.length,
      liveRaw: rawLiveQuestions.length,
      savedRaw: rawSavedQuestions.length,
      systemValid: systemQuestions.length,
      liveValid: live.length,
      savedValid: saved.length,
      rejected,
      final: plan.length,
    },
    issue: buildQuestionPoolIssue({ settings: sourceSettings, plan, live, saved, systemQuestions, totalQuestions }),
  };
  debugQuestionPool(diagnostics);
  return { plan, diagnostics };
}

export function pickNextQuestionFromPlan(plan: QuestionPoolItem[]): QuestionPoolItem | undefined {
  return plan[0];
}

export function makeQuestionSnapshot(question: GameQuestion | QuestionPoolItem): QuestionSnapshot {
  const source = "source" in question ? question.source : "system";
  const base = {
    id: question.id,
    gameType: question.gameType,
    source,
    category: question.category,
    authorPlayerId: "authorPlayerId" in question ? question.authorPlayerId ?? null : null,
    savedQuestionId: "savedQuestionId" in question ? question.savedQuestionId ?? null : null,
  };
  if (question.gameType === "who_would") {
    return { ...base, text: question.text, optionA: question.optionA, optionB: question.optionB };
  }
  if (question.gameType === "majority" || question.gameType === "minority") {
    return { ...base, text: question.text, options: question.options };
  }
  return { ...base, text: question.text };
}

export function questionFromSnapshot(snapshot: QuestionSnapshot | null | undefined): QuestionPoolItem | undefined {
  if (!snapshot) return undefined;
  const base = {
    id: snapshot.id,
    category: snapshot.category as never,
    source: snapshot.source,
    authorPlayerId: snapshot.authorPlayerId,
    savedQuestionId: snapshot.savedQuestionId,
  };
  if (snapshot.gameType === "who_would" && snapshot.optionA && snapshot.optionB) {
    return { ...base, gameType: "who_would", text: snapshot.text, optionA: snapshot.optionA, optionB: snapshot.optionB } as WhoWouldQuestion & QuestionPoolItem;
  }
  if ((snapshot.gameType === "majority" || snapshot.gameType === "minority") && snapshot.text && Array.isArray(snapshot.options)) {
    return { ...base, gameType: snapshot.gameType, text: snapshot.text, options: snapshot.options } as PredictionGameQuestion & QuestionPoolItem;
  }
  if (snapshot.gameType === "who_of_us" && snapshot.text) {
    return { ...base, gameType: "who_of_us", text: snapshot.text } as WhoOfUsGameQuestion & QuestionPoolItem;
  }
  if (snapshot.gameType === "mime_expressions" && snapshot.text) {
    return { ...base, gameType: "mime_expressions", text: snapshot.text } as MimeExpressionQuestion & QuestionPoolItem;
  }
  if (snapshot.gameType === "jauge" && snapshot.text) {
    return { ...base, gameType: "jauge", text: snapshot.text } as JaugeGameQuestion & QuestionPoolItem;
  }
  return undefined;
}

export function questionToSavedPayload(question: GameQuestion | QuestionPoolItem): Record<string, unknown> {
  if (question.gameType === "who_would") return { optionA: question.optionA, optionB: question.optionB };
  if (question.gameType === "majority" || question.gameType === "minority") return { options: question.options };
  return {};
}

export function getQuestionTextForSave(question: GameQuestion | QuestionPoolItem): string {
  if (question.gameType === "who_would") {
    const text = "text" in question && typeof question.text === "string" ? question.text.trim() : "";
    return text || `${question.optionA} / ${question.optionB}`;
  }
  return question.text;
}

export function generateLocalQuestionId(source: QuestionSource = "live"): number {
  const prefix = source === "saved" ? -1_700_000_000 : -900_000_000;
  return prefix - Math.floor(Math.random() * 90_000_000) - Math.floor(Date.now() % 10_000_000);
}

function customToQuestion(question: CustomQuestion): QuestionPoolItem | null {
  return payloadToQuestion({
    id: question.local_question_id,
    gameType: question.game_type,
    category: question.category,
    text: question.question_text,
    payload: question.payload,
    source: "live",
    authorPlayerId: question.author_player_id,
  });
}

function savedToQuestion(question: SavedCustomQuestion): QuestionPoolItem | null {
  return payloadToQuestion({
    id: question.local_question_id,
    gameType: question.game_type,
    category: question.category,
    text: question.question_text,
    payload: question.payload,
    source: "saved",
    authorPlayerId: question.original_author_id,
    savedQuestionId: question.id,
  });
}

function payloadToQuestion({
  id,
  gameType,
  category,
  text,
  payload,
  source,
  authorPlayerId,
  savedQuestionId,
}: {
  id: number;
  gameType: GameType;
  category: string;
  text: string;
  payload: Record<string, unknown>;
  source: QuestionSource;
  authorPlayerId?: string | null;
  savedQuestionId?: string | null;
}): QuestionPoolItem | null {
  const base = { id, category: category as never, source, authorPlayerId, savedQuestionId };
  if (gameType === "who_would") {
    const optionA = typeof payload.optionA === "string" ? payload.optionA.trim() : "";
    const optionB = typeof payload.optionB === "string" ? payload.optionB.trim() : "";
    if (!optionA || !optionB) return null;
    return { ...base, gameType, text: text.trim() || `${optionA} / ${optionB}`, optionA, optionB } as WhoWouldQuestion & QuestionPoolItem;
  }
  if (gameType === "majority" || gameType === "minority") {
    const options = Array.isArray(payload.options)
      ? payload.options.filter((option): option is string => typeof option === "string" && option.trim().length > 0).map((option) => option.trim()).slice(0, 8)
      : [];
    if (text.trim().length < 4 || options.length < 2) return null;
    return { ...base, gameType, text: text.trim(), options } as PredictionGameQuestion & QuestionPoolItem;
  }
  if (text.trim().length < 4) return null;
  if (gameType === "who_of_us") return { ...base, gameType, text: text.trim() } as WhoOfUsGameQuestion & QuestionPoolItem;
  if (gameType === "mime_expressions") return { ...base, gameType, text: text.trim() } as MimeExpressionQuestion & QuestionPoolItem;
  if (gameType === "jauge") return { ...base, gameType, text: text.trim() } as JaugeGameQuestion & QuestionPoolItem;
  return null;
}

function resolveSourceSettings(settings: QuestionSourceSettings): QuestionSourceSettings {
  if (settings.mode === "system_only") return { ...settings, useSystemQuestions: true, useLiveQuestions: false, useSavedQuestions: false };
  if (settings.mode === "players_only") return { ...settings, useSystemQuestions: false, useLiveQuestions: true, useSavedQuestions: false };
  if (settings.mode === "saved_only") return { ...settings, useSystemQuestions: false, useLiveQuestions: false, useSavedQuestions: true };
  if (settings.mode === "all_mix") return { ...settings, useSystemQuestions: true, useLiveQuestions: true, useSavedQuestions: true };
  return settings;
}

function isCustomCategoryAllowed(category: string, selectedCategories: string[]): boolean {
  return category === "joueurs" || category === "sauvegardees" || selectedCategories.includes(category);
}

function isValidQuestionForGame(question: GameQuestion, gameType: GameType): boolean {
  if (question.gameType !== gameType) return false;
  if (gameType === "who_would") {
    return "optionA" in question && "optionB" in question && question.optionA.trim().length > 0 && question.optionB.trim().length > 0;
  }
  if (gameType === "majority" || gameType === "minority") {
    return hasQuestionText(question) && "options" in question && question.options.length >= 2;
  }
  return hasQuestionText(question);
}

function hasQuestionText(question: GameQuestion): question is GameQuestion & { text: string } {
  return "text" in question && typeof question.text === "string" && question.text.trim().length >= 4;
}

function buildQuestionPoolIssue({
  settings,
  plan,
  live,
  saved,
  systemQuestions,
  totalQuestions,
}: {
  settings: QuestionSourceSettings;
  plan: QuestionPoolItem[];
  live: QuestionPoolItem[];
  saved: QuestionPoolItem[];
  systemQuestions: QuestionPoolItem[];
  totalQuestions: number;
}): string | null {
  if (plan.length > 0) {
    if (plan.length < totalQuestions) return `Pool partiel : ${plan.length}/${totalQuestions} questions disponibles.`;
    return null;
  }
  if (settings.mode === "players_only") return live.length ? null : "Aucune question joueur valide pour ce jeu.";
  if (settings.mode === "saved_only") return saved.length ? null : "Aucune question sauvegardée valide pour ce jeu.";
  if (settings.mode === "system_only") return systemQuestions.length ? null : "Aucune question système disponible avec ces catégories.";
  return "Aucune question disponible avec cette configuration.";
}

function debugQuestionPool(diagnostics: QuestionPoolDiagnostics): void {
  if (process.env.NODE_ENV === "production") return;
  if (typeof window === "undefined") return;
  if (window.localStorage.getItem("badaboum_debug_questions") !== "1") return;
  console.debug("[Badaboum QuestionPool]", diagnostics);
}

function dedupeQuestions<T extends GameQuestion>(questions: T[]): T[] {
  const seen = new Set<string>();
  const output: T[] = [];
  for (const question of questions) {
    const key = `${question.gameType}:${signatureForQuestion(question)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(question);
  }
  return output;
}

function signatureForQuestion(question: GameQuestion): string {
  if (question.gameType === "who_would") return `${question.optionA}|${question.optionB}`.toLowerCase();
  if (question.gameType === "majority" || question.gameType === "minority") return `${question.text}|${question.options.join("|")}`.toLowerCase();
  return question.text.toLowerCase();
}

function shuffle<T>(items: T[]): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}
