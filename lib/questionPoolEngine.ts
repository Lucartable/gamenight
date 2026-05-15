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
  packQuestions = [],
  savedQuestions,
  settings,
  random,
}: {
  gameType: GameType;
  selectedCategories: string[];
  totalQuestions: number;
  excludeIds: number[];
  liveQuestions: CustomQuestion[];
  packQuestions?: SavedCustomQuestion[];
  savedQuestions: SavedCustomQuestion[];
  settings: QuestionSourceSettings;
  random?: () => number;
}): QuestionPoolItem[] {
  return buildQuestionPlanWithDiagnostics({
    gameType,
    selectedCategories,
    totalQuestions,
    excludeIds,
    liveQuestions,
    packQuestions,
    savedQuestions,
    settings,
    random,
  }).plan;
}

export function buildQuestionPlanWithDiagnostics({
  gameType,
  selectedCategories,
  totalQuestions,
  excludeIds,
  liveQuestions,
  packQuestions = [],
  savedQuestions,
  settings,
  random = Math.random,
}: {
  gameType: GameType;
  selectedCategories: string[];
  totalQuestions: number;
  excludeIds: number[];
  liveQuestions: CustomQuestion[];
  packQuestions?: SavedCustomQuestion[];
  savedQuestions: SavedCustomQuestion[];
  settings: QuestionSourceSettings;
  random?: () => number;
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
  const rawPackQuestions = sourceSettings.usePackQuestions
    ? packQuestions.filter((question) => question.game_type === gameType && isCustomCategoryAllowed(question.category, categories) && !excluded.has(question.local_question_id))
    : [];
  const rawSavedQuestions = sourceSettings.useSavedQuestions
    ? savedQuestions.filter((question) => question.game_type === gameType && isCustomCategoryAllowed(question.category, categories) && !excluded.has(question.local_question_id))
    : [];
  const systemQuestions = rawSystemQuestions.filter((question) => validateGameQuestion(question, gameType));
  const live = rawLiveQuestions
    .map((question) => customQuestionToPoolItem(question))
    .filter((question): question is QuestionPoolItem => Boolean(question))
    .filter((question) => validateGameQuestion(question, gameType));
  const packs = rawPackQuestions
    .map((question) => savedQuestionToPoolItem(question, "pack"))
    .filter((question): question is QuestionPoolItem => Boolean(question))
    .filter((question) => validateGameQuestion(question, gameType));
  const saved = rawSavedQuestions
    .map((question) => savedQuestionToPoolItem(question))
    .filter((question): question is QuestionPoolItem => Boolean(question))
    .filter((question) => validateGameQuestion(question, gameType));

  const systemPool = shuffle(dedupeQuestions(systemQuestions), random);
  const livePool = shuffle(dedupeQuestions(live), random);
  const packPool = shuffle(dedupeQuestions(packs), random);
  const savedPool = shuffle(dedupeQuestions(saved), random);

  let plan: QuestionPoolItem[];
  if (sourceSettings.mode === "system_only") {
    plan = systemPool.slice(0, totalQuestions);
  } else if (sourceSettings.mode === "players_only") {
    plan = livePool.slice(0, totalQuestions);
  } else if (sourceSettings.mode === "saved_only") {
    plan = savedPool.slice(0, totalQuestions);
  } else {
    const selectedLive = sourceSettings.useLiveQuestions ? livePool.slice(0, totalQuestions) : [];
    const withPacks = sourceSettings.usePackQuestions
      ? appendUniqueQuestions(selectedLive, packPool, totalQuestions)
      : selectedLive;
    const withSaved = sourceSettings.useSavedQuestions
      ? appendUniqueQuestions(withPacks, savedPool, totalQuestions)
      : withPacks;
    const withSystem = sourceSettings.useSystemQuestions
      ? appendUniqueQuestions(withSaved, systemPool, totalQuestions)
      : withSaved;
    plan = shuffle(withSystem, random);
  }

  const rejected =
    rawSystemQuestions.length + rawLiveQuestions.length + rawPackQuestions.length + rawSavedQuestions.length -
    (systemQuestions.length + live.length + packs.length + saved.length);
  const diagnostics: QuestionPoolDiagnostics = {
    gameType,
    mode: sourceSettings.mode,
    totalRequested: totalQuestions,
    categories,
    sources: {
      systemRaw: rawSystemQuestions.length,
      liveRaw: rawLiveQuestions.length,
      packRaw: rawPackQuestions.length,
      savedRaw: rawSavedQuestions.length,
      systemValid: systemQuestions.length,
      liveValid: live.length,
      packValid: packs.length,
      savedValid: saved.length,
      rejected,
      final: plan.length,
    },
    issue: buildQuestionPoolIssue({ settings: sourceSettings, plan, live, packs, saved, systemQuestions, totalQuestions }),
  };
  debugQuestionPool(diagnostics);
  return { plan, diagnostics };
}

export function pickNextQuestionFromPlan(plan: QuestionPoolItem[]): QuestionPoolItem | undefined {
  return plan[0];
}

function resolveSourceSettings(settings: QuestionSourceSettings): QuestionSourceSettings {
  if (settings.mode === "system_only") return { ...settings, useSystemQuestions: true, useLiveQuestions: false, usePackQuestions: false, useSavedQuestions: false };
  if (settings.mode === "players_only") return { ...settings, useSystemQuestions: false, useLiveQuestions: true, usePackQuestions: false, useSavedQuestions: false };
  if (settings.mode === "saved_only") return { ...settings, useSystemQuestions: false, useLiveQuestions: false, usePackQuestions: false, useSavedQuestions: true };
  if (settings.mode === "all_mix") return { ...settings, useSystemQuestions: true, useLiveQuestions: true, usePackQuestions: settings.usePackQuestions, useSavedQuestions: true };
  return settings;
}

function isCustomCategoryAllowed(category: string, selectedCategories: string[]): boolean {
  return category === "joueurs" || category === "sauvegardees" || selectedCategories.includes(category);
}

function buildQuestionPoolIssue({
  settings,
  plan,
  live,
  packs,
  saved,
  systemQuestions,
  totalQuestions,
}: {
  settings: QuestionSourceSettings;
  plan: QuestionPoolItem[];
  live: QuestionPoolItem[];
  packs: QuestionPoolItem[];
  saved: QuestionPoolItem[];
  systemQuestions: QuestionPoolItem[];
  totalQuestions: number;
}): string | null {
  if (plan.length > 0) {
    if (settings.useLiveQuestions && live.length > totalQuestions) {
      return `${live.length} questions joueurs valides sont disponibles, mais la partie est réglée sur ${totalQuestions}. ${live.length - totalQuestions} ne pourront pas passer.`;
    }
    if (plan.length < totalQuestions) return `Pool partiel : ${plan.length}/${totalQuestions} questions disponibles.`;
    return null;
  }
  if (settings.mode === "players_only") return live.length ? null : "Aucune question joueur valide pour ce jeu.";
  if (settings.mode === "saved_only") return saved.length ? null : "Aucune question sauvegardée valide pour ce jeu.";
  if (settings.mode === "system_only") return systemQuestions.length ? null : "Aucune question système disponible avec ces catégories.";
  if (settings.usePackQuestions && settings.selectedPackIds.length > 0 && packs.length === 0) {
    return "Aucune question de pack compatible pour ce jeu.";
  }
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

function appendUniqueQuestions<T extends GameQuestion>(selected: T[], candidates: T[], totalQuestions: number): T[] {
  const output = [...selected];
  const seen = new Set(output.map((question) => questionKey(question)));
  for (const candidate of candidates) {
    if (output.length >= totalQuestions) break;
    const key = questionKey(candidate);
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(candidate);
  }
  return output;
}

function questionKey(question: GameQuestion): string {
  return `${question.gameType}:${signatureForQuestion(question)}`;
}

function signatureForQuestion(question: GameQuestion): string {
  if (question.gameType === "who_would") return `${question.optionA}|${question.optionB}`.toLowerCase();
  if (question.gameType === "majority" || question.gameType === "minority") return `${question.text}|${question.options.join("|")}`.toLowerCase();
  return question.text.toLowerCase();
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}
