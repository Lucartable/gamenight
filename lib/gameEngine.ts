import type { GameQuestion } from "./gameQuestions";
import type { GameType } from "@/types/database";

export type GameQuestionFormat = "duel" | "player_target" | "multi_choice" | "mime_text" | "rating_text";
export type GameAnswerFormat = "option_vote" | "player_vote" | "rating" | "no_vote";
export type GameRoundFlow = "standard_question" | "auto_mime_order" | "target_rating";
export type GameRevealFlow = "vote_results" | "mime_reveal" | "rating_average";
export type GameSummaryProfile = "duel" | "social_vote" | "prediction" | "mime" | "rating";

export interface GameEngineContract {
  gameType: GameType;
  config: {
    supportsCategories: boolean;
    supportsPlayerQuestions: boolean;
    supportsSavedQuestions: boolean;
    supportsTimer: boolean;
    requiresPlayers: number;
  };
  question: {
    format: GameQuestionFormat;
    minOptions: number;
    maxOptions: number;
    needsTargetPlayer: boolean;
  };
  answer: {
    format: GameAnswerFormat;
    storedIn: "votes" | "ratings" | "room_state";
  };
  round: {
    flow: GameRoundFlow;
    autoNextSupported: boolean;
  };
  reveal: {
    flow: GameRevealFlow;
    canRevealEarly: boolean;
  };
  summary: {
    profile: GameSummaryProfile;
    heatmap: "targets" | "alliances" | "mime" | "ratings";
  };
  validateQuestion: (question: GameQuestion) => boolean;
}

export const GAME_ENGINE_CONTRACTS: Record<GameType, GameEngineContract> = {
  who_would: {
    gameType: "who_would",
    config: sharedQuestionConfig(1),
    question: { format: "duel", minOptions: 2, maxOptions: 2, needsTargetPlayer: false },
    answer: { format: "option_vote", storedIn: "votes" },
    round: { flow: "standard_question", autoNextSupported: true },
    reveal: { flow: "vote_results", canRevealEarly: true },
    summary: { profile: "duel", heatmap: "alliances" },
    validateQuestion: (question) =>
      question.gameType === "who_would" &&
      "optionA" in question &&
      "optionB" in question &&
      hasContent(question.optionA) &&
      hasContent(question.optionB),
  },
  who_of_us: {
    gameType: "who_of_us",
    config: sharedQuestionConfig(2),
    question: { format: "player_target", minOptions: 0, maxOptions: 0, needsTargetPlayer: false },
    answer: { format: "player_vote", storedIn: "votes" },
    round: { flow: "standard_question", autoNextSupported: true },
    reveal: { flow: "vote_results", canRevealEarly: true },
    summary: { profile: "social_vote", heatmap: "targets" },
    validateQuestion: (question) => question.gameType === "who_of_us" && hasQuestionText(question),
  },
  majority: {
    gameType: "majority",
    config: sharedQuestionConfig(2),
    question: { format: "multi_choice", minOptions: 2, maxOptions: 8, needsTargetPlayer: false },
    answer: { format: "option_vote", storedIn: "votes" },
    round: { flow: "standard_question", autoNextSupported: true },
    reveal: { flow: "vote_results", canRevealEarly: true },
    summary: { profile: "prediction", heatmap: "alliances" },
    validateQuestion: validatePredictionQuestion,
  },
  minority: {
    gameType: "minority",
    config: sharedQuestionConfig(2),
    question: { format: "multi_choice", minOptions: 2, maxOptions: 8, needsTargetPlayer: false },
    answer: { format: "option_vote", storedIn: "votes" },
    round: { flow: "standard_question", autoNextSupported: true },
    reveal: { flow: "vote_results", canRevealEarly: true },
    summary: { profile: "prediction", heatmap: "alliances" },
    validateQuestion: validatePredictionQuestion,
  },
  mime_expressions: {
    gameType: "mime_expressions",
    config: sharedQuestionConfig(1),
    question: { format: "mime_text", minOptions: 0, maxOptions: 0, needsTargetPlayer: true },
    answer: { format: "no_vote", storedIn: "room_state" },
    round: { flow: "auto_mime_order", autoNextSupported: true },
    reveal: { flow: "mime_reveal", canRevealEarly: true },
    summary: { profile: "mime", heatmap: "mime" },
    validateQuestion: (question) => question.gameType === "mime_expressions" && hasQuestionText(question),
  },
  jauge: {
    gameType: "jauge",
    config: sharedQuestionConfig(2),
    question: { format: "rating_text", minOptions: 0, maxOptions: 0, needsTargetPlayer: true },
    answer: { format: "rating", storedIn: "ratings" },
    round: { flow: "target_rating", autoNextSupported: true },
    reveal: { flow: "rating_average", canRevealEarly: true },
    summary: { profile: "rating", heatmap: "ratings" },
    validateQuestion: (question) => question.gameType === "jauge" && hasQuestionText(question),
  },
};

export function getGameEngineContract(gameType: GameType): GameEngineContract {
  return GAME_ENGINE_CONTRACTS[gameType];
}

export function validateGameQuestion(question: GameQuestion, gameType: GameType): boolean {
  return question.gameType === gameType && getGameEngineContract(gameType).validateQuestion(question);
}

function sharedQuestionConfig(requiresPlayers: number): GameEngineContract["config"] {
  return {
    supportsCategories: true,
    supportsPlayerQuestions: true,
    supportsSavedQuestions: true,
    supportsTimer: true,
    requiresPlayers,
  };
}

function validatePredictionQuestion(question: GameQuestion): boolean {
  return (
    (question.gameType === "majority" || question.gameType === "minority") &&
    hasQuestionText(question) &&
    "options" in question &&
    question.options.filter(hasContent).length >= 2 &&
    question.options.length <= 8
  );
}

function hasQuestionText(question: GameQuestion): question is GameQuestion & { text: string } {
  return "text" in question && hasContent(question.text);
}

function hasContent(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim().length >= 1;
}
