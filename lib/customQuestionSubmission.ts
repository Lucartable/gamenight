import type { CustomQuestion, GameType } from "@/types/database";

export interface CustomQuestionSubmission {
  questionText: string;
  category: string;
  payload: Record<string, unknown>;
}

export function buildCustomQuestionSubmission({
  gameType,
  text,
  optionA,
  optionB,
  options,
}: {
  gameType: GameType;
  text: string;
  optionA: string;
  optionB: string;
  options: string;
}): CustomQuestionSubmission | null {
  if (gameType === "who_would") {
    const cleanText = text.trim().replace(/\s+/g, " ");
    const a = optionA.trim();
    const b = optionB.trim();
    if (a.length < 2 || b.length < 2) return null;
    return { questionText: cleanText || `Tu préfères : ${a} ou ${b} ?`, category: "joueurs", payload: { optionA: a, optionB: b } };
  }
  if (gameType === "majority" || gameType === "minority") {
    const cleanText = text.trim().replace(/\s+/g, " ");
    const parsedOptions = options
      .split(/\n|,/)
      .map((option) => option.trim())
      .filter(Boolean)
      .slice(0, 8);
    if (cleanText.length < 8 || parsedOptions.length < 2) return null;
    return { questionText: cleanText, category: "joueurs", payload: { options: parsedOptions } };
  }
  const cleanText = text.trim().replace(/\s+/g, " ");
  if (cleanText.length < 4) return null;
  return { questionText: cleanText, category: "joueurs", payload: {} };
}

export function hasDuplicateCustomQuestion(
  questions: CustomQuestion[],
  gameType: GameType,
  submission: CustomQuestionSubmission
): boolean {
  const signature = customQuestionSignature(gameType, submission.questionText, submission.payload);
  return questions.some(
    (question) =>
      question.game_type === gameType &&
      customQuestionSignature(question.game_type, question.question_text, question.payload) === signature
  );
}

function customQuestionSignature(gameType: GameType, text: string, payload: Record<string, unknown>): string {
  const cleanText = text.trim().replace(/\s+/g, " ").toLowerCase();
  if (gameType === "who_would") {
    const optionA = typeof payload.optionA === "string" ? payload.optionA.trim().replace(/\s+/g, " ").toLowerCase() : "";
    const optionB = typeof payload.optionB === "string" ? payload.optionB.trim().replace(/\s+/g, " ").toLowerCase() : "";
    return `${gameType}:${cleanText}:${optionA}:${optionB}`;
  }
  if (gameType === "majority" || gameType === "minority") {
    const options = Array.isArray(payload.options)
      ? payload.options
          .filter((option): option is string => typeof option === "string")
          .map((option) => option.trim().replace(/\s+/g, " ").toLowerCase())
      : [];
    return `${gameType}:${cleanText}:${options.join("|")}`;
  }
  return `${gameType}:${cleanText}`;
}

