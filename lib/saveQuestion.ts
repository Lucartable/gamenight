import type { GameQuestion } from "./gameQuestions";
import { getSupabase } from "./supabase";
import {
  generateLocalQuestionId,
  getQuestionTextForSave,
  questionToSavedPayload,
  type QuestionPoolItem,
} from "./questionPoolEngine";
import type { GameType, QuestionSnapshot } from "@/types/database";

export type SaveQuestionResult = "saved" | "already";

export async function saveQuestionToLibrary({
  userId,
  roomId,
  gameType,
  question,
  snapshot,
}: {
  userId: string;
  roomId: string;
  gameType: GameType;
  question: GameQuestion | QuestionPoolItem;
  snapshot?: QuestionSnapshot;
}): Promise<SaveQuestionResult> {
  const questionText = getQuestionTextForSave(question).trim();
  const payload = questionToSavedPayload(question);
  const supabase = getSupabase();

  const { data: existing, error: lookupError } = await supabase
    .from("saved_custom_questions")
    .select("id")
    .eq("host_user_id", userId)
    .eq("game_type", gameType)
    .eq("question_text", questionText)
    .limit(1)
    .maybeSingle();
  if (lookupError) throw lookupError;
  if (existing) return "already";

  const { error } = await supabase
    .from("saved_custom_questions")
    .insert({
      host_user_id: userId,
      game_type: gameType,
      local_question_id: generateLocalQuestionId("saved"),
      question_text: questionText,
      category: question.category,
      payload,
      source_game: gameType,
      original_author_id: snapshot?.authorPlayerId ?? ("authorPlayerId" in question ? question.authorPlayerId ?? null : null),
      original_room_id: roomId,
    });
  if (error) throw error;
  return "saved";
}

