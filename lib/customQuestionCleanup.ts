import type { CustomQuestion, GameType, JaugePlayerQuestion } from "@/types/database";

export function getLiveQuestionsForGame(
  customQuestions: CustomQuestion[],
  gameType: GameType | null,
): CustomQuestion[] {
  if (!gameType) return [];
  return customQuestions.filter((question) => question.game_type === gameType);
}

export function getPlayedLiveQuestionIdsForGame({
  customQuestions,
  gameType,
  askedQuestionIds,
  roundQuestionIds,
}: {
  customQuestions: CustomQuestion[];
  gameType: GameType | null;
  askedQuestionIds: number[];
  roundQuestionIds: number[];
}): number[] {
  const liveIds = new Set(getLiveQuestionsForGame(customQuestions, gameType).map((question) => question.local_question_id));
  if (liveIds.size === 0) return [];
  const playedIds = new Set([...askedQuestionIds, ...roundQuestionIds]);
  return [...liveIds].filter((id) => playedIds.has(id));
}

export function filterJaugePlayerQuestionsAfterClear({
  playerQuestions,
  scope,
  playedLiveQuestionIds,
}: {
  playerQuestions: JaugePlayerQuestion[];
  scope: "all" | "played";
  playedLiveQuestionIds: number[];
}): JaugePlayerQuestion[] {
  if (scope === "all") return playerQuestions.filter((question) => question.source === "saved");
  if (playedLiveQuestionIds.length === 0) return playerQuestions;
  const idsToRemove = new Set(playedLiveQuestionIds);
  return playerQuestions.filter((question) => !idsToRemove.has(question.id));
}
