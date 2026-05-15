import type { GameQuestion } from "./gameQuestions";
import type { GameType, QuestionSourceSettings, Room } from "@/types/database";

export type QuestionSource = "system" | "live" | "pack" | "saved";

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
    packRaw: number;
    savedRaw: number;
    systemValid: number;
    liveValid: number;
    packValid: number;
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
  usePackQuestions: false,
  useSavedQuestions: false,
  selectedPackIds: [],
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
    usePackQuestions: raw.usePackQuestions === true,
    useSavedQuestions: raw.useSavedQuestions === true,
    selectedPackIds: Array.isArray(raw.selectedPackIds)
      ? raw.selectedPackIds.filter((id): id is string => typeof id === "string" && id.length > 0)
      : [],
    maxQuestionsPerPlayer: clampInt(raw.maxQuestionsPerPlayer, 1, 20, DEFAULT_QUESTION_SOURCE_SETTINGS.maxQuestionsPerPlayer),
    authorVisibility: raw.authorVisibility === "visible" || raw.authorVisibility === "final_reveal" || raw.authorVisibility === "hidden"
      ? raw.authorVisibility
      : DEFAULT_QUESTION_SOURCE_SETTINGS.authorVisibility,
  };
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}
