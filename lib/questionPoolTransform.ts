import type {
  GameQuestion,
  JaugeGameQuestion,
  MimeExpressionQuestion,
  PredictionGameQuestion,
  WhoOfUsGameQuestion,
  WhoWouldQuestion,
} from "./gameQuestions";
import type { QuestionPoolItem, QuestionSource } from "./questionPoolTypes";
import type { CustomQuestion, GameType, QuestionSnapshot, SavedCustomQuestion } from "@/types/database";

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

export function customQuestionToPoolItem(question: CustomQuestion): QuestionPoolItem | null {
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

export function savedQuestionToPoolItem(question: SavedCustomQuestion, source: Extract<QuestionSource, "saved" | "pack"> = "saved"): QuestionPoolItem | null {
  if (question.payload.active === false) return null;
  return payloadToQuestion({
    id: question.local_question_id,
    gameType: question.game_type,
    category: question.category,
    text: question.question_text,
    payload: question.payload,
    source,
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
