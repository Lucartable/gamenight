import {
  getDefaultCategories,
  getQuestionsForGame,
  type GameQuestion,
} from "./gameQuestions";
import { validateGameQuestion } from "./gameEngine";
import {
  customQuestionToPoolItem,
  savedQuestionToPoolItem,
} from "./questionPoolTransform";
import type { QuestionPoolDiagnostics, QuestionPoolItem } from "./questionPoolTypes";
import type {
  CustomQuestion,
  GameType,
  QuestionSourceSettings,
  SavedCustomQuestion,
} from "@/types/database";

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
  const systemQuestions = rawSystemQuestions.filter((question) => validateGameQuestion(question, gameType));
  const live = rawLiveQuestions
    .map((question) => customQuestionToPoolItem(question))
    .filter((question): question is QuestionPoolItem => Boolean(question))
    .filter((question) => validateGameQuestion(question, gameType));
  const saved = rawSavedQuestions
    .map((question) => savedQuestionToPoolItem(question))
    .filter((question): question is QuestionPoolItem => Boolean(question))
    .filter((question) => validateGameQuestion(question, gameType));

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
