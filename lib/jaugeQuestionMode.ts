import type {
  JaugeQuestionMode,
  QuestionSourceSettings,
} from "@/types/database";

export function getEffectiveJaugeQuestionMode(
  settings: QuestionSourceSettings,
  fallback: JaugeQuestionMode,
): JaugeQuestionMode {
  if (settings.mode === "system_only") return "fixed";
  if (settings.mode === "players_only" || settings.mode === "saved_only") return "players";
  if (!settings.useSystemQuestions && (settings.useLiveQuestions || settings.useSavedQuestions)) return "players";
  if (fallback === "fixed" && (settings.useLiveQuestions || settings.useSavedQuestions)) return "random";
  return fallback;
}
