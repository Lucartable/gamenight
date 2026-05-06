import {
  CATEGORIES as WHO_WOULD_CATEGORIES,
  QUESTIONS as RAW_WHO_WOULD_QUESTIONS,
  type Category as WhoWouldCategory,
  type CategoryMeta,
} from "./questions";
import {
  WHO_OF_US_CATEGORIES,
  WHO_OF_US_QUESTIONS,
  type WhoOfUsCategory,
  type WhoOfUsCategoryMeta,
} from "./whoOfUsQuestions";
import type { GameType } from "@/types/database";

export type GameCategory = WhoWouldCategory | WhoOfUsCategory;

export interface GameDefinition {
  id: GameType;
  label: string;
  shortLabel: string;
  description: string;
}

export interface WhoWouldQuestion {
  id: number;
  gameType: "who_would";
  category: WhoWouldCategory;
  optionA: string;
  optionB: string;
}

export interface WhoOfUsGameQuestion {
  id: number;
  gameType: "who_of_us";
  category: WhoOfUsCategory;
  text: string;
}

export type GameQuestion = WhoWouldQuestion | WhoOfUsGameQuestion;
export type GameCategoryMeta = (CategoryMeta | WhoOfUsCategoryMeta) & { id: GameCategory };

export const GAME_DEFINITIONS: GameDefinition[] = [
  {
    id: "who_would",
    label: "Qui pourrait ?",
    shortLabel: "Qui pourrait ?",
    description: "Vote entre deux choix et découvre le résultat du groupe.",
  },
  {
    id: "who_of_us",
    label: "Qui de nous ?",
    shortLabel: "Qui de nous ?",
    description: "Désigne le joueur qui correspond le mieux à la question.",
  },
];

export const WHO_WOULD_QUESTIONS: WhoWouldQuestion[] = RAW_WHO_WOULD_QUESTIONS.map((q) => ({
  ...q,
  gameType: "who_would" as const,
}));

export function getGameDefinition(gameType: GameType | null | undefined): GameDefinition | undefined {
  if (!gameType) return undefined;
  return GAME_DEFINITIONS.find((game) => game.id === gameType);
}

export function getGameCategories(gameType: GameType | null | undefined): GameCategoryMeta[] {
  if (gameType === "who_of_us") return WHO_OF_US_CATEGORIES as GameCategoryMeta[];
  if (gameType === "who_would") return WHO_WOULD_CATEGORIES as GameCategoryMeta[];
  return [];
}

export function getDefaultCategories(gameType: GameType | null | undefined): GameCategory[] {
  if (gameType === "who_of_us") return ["classique"];
  if (gameType === "who_would") return ["soft"];
  return [];
}

export function getCategoryForGame(
  gameType: GameType | null | undefined,
  id: string | null | undefined
): GameCategoryMeta | undefined {
  if (!id) return undefined;
  return getGameCategories(gameType).find((category) => category.id === id);
}

export function getQuestionsForGame(gameType: GameType | null | undefined): GameQuestion[] {
  if (gameType === "who_of_us") {
    return WHO_OF_US_QUESTIONS.map((q) => ({ ...q, gameType: "who_of_us" as const }));
  }
  if (gameType === "who_would") return WHO_WOULD_QUESTIONS;
  return [];
}

export function getQuestionForGame(
  gameType: GameType | null | undefined,
  id: number | null | undefined
): GameQuestion | undefined {
  if (id == null) return undefined;
  return getQuestionsForGame(gameType).find((question) => question.id === id);
}

export function pickRandomQuestionForGame(
  gameType: GameType,
  selectedCategories: string[],
  excludeIds: number[]
): GameQuestion | undefined {
  const defaultCategories = getDefaultCategories(gameType);
  const categories = selectedCategories.length ? selectedCategories : defaultCategories;
  const pool = getQuestionsForGame(gameType).filter(
    (question) => categories.includes(question.category) && !excludeIds.includes(question.id)
  );
  if (!pool.length) return undefined;
  return pool[Math.floor(Math.random() * pool.length)];
}
