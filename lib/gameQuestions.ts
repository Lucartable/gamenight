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
import {
  MAJORITY_CATEGORIES,
  MAJORITY_QUESTIONS,
  type MajorityCategory,
  type MajorityCategoryMeta,
} from "./majorityQuestions";
import {
  MIME_EXPRESSION_CATEGORIES,
  MIME_EXPRESSIONS,
  type MimeExpressionCategory,
  type MimeExpressionCategoryMeta,
} from "./mimeExpressions";
import {
  JAUGE_CATEGORIES,
  JAUGE_QUESTIONS,
  type JaugeCategory,
  type JaugeCategoryMeta,
} from "./jaugeQuestions";
import {
  INTRUS_PAIR_CATEGORIES,
  type IntrusPairCategory,
  type IntrusPairCategoryMeta,
} from "./intrusPairs";
import type { GameType } from "@/types/database";

export type GameCategory = WhoWouldCategory | WhoOfUsCategory | MajorityCategory | MimeExpressionCategory | JaugeCategory | IntrusPairCategory;

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
  text?: string;
  optionA: string;
  optionB: string;
}

export interface WhoOfUsGameQuestion {
  id: number;
  gameType: "who_of_us";
  category: WhoOfUsCategory;
  text: string;
}

export interface PredictionGameQuestion {
  id: number;
  gameType: "majority" | "minority";
  category: MajorityCategory;
  text: string;
  options: string[];
}

export interface MimeExpressionQuestion {
  id: number;
  gameType: "mime_expressions";
  category: MimeExpressionCategory;
  text: string;
  mimePlayerCountMin?: number;
  mimePlayerCountMax?: number;
}

export interface JaugeGameQuestion {
  id: number;
  gameType: "jauge";
  category: JaugeCategory;
  text: string;
}

export type GameQuestion = WhoWouldQuestion | WhoOfUsGameQuestion | PredictionGameQuestion | MimeExpressionQuestion | JaugeGameQuestion;
export type GameCategoryMeta = (CategoryMeta | WhoOfUsCategoryMeta | MajorityCategoryMeta | MimeExpressionCategoryMeta | JaugeCategoryMeta | IntrusPairCategoryMeta) & { id: GameCategory };

export const GAME_DEFINITIONS: GameDefinition[] = [
  {
    id: "who_would",
    label: "Tu préfères",
    shortLabel: "Tu préfères",
    description: "Choisis entre deux options et découvre le résultat du groupe.",
  },
  {
    id: "who_of_us",
    label: "Qui de nous ?",
    shortLabel: "Qui de nous ?",
    description: "Désigne le joueur qui correspond le mieux à la question.",
  },
  {
    id: "majority",
    label: "Majorité",
    shortLabel: "Majorité",
    description: "Prédit la réponse que le groupe choisira le plus.",
  },
  {
    id: "minority",
    label: "Minorité",
    shortLabel: "Minorité",
    description: "Trouve le choix rare sans viser une option vide.",
  },
  {
    id: "mime_expressions",
    label: "Mime les expressions",
    shortLabel: "Mime",
    description: "Un joueur mime une expression, les autres devinent avant la fin du timer.",
  },
  {
    id: "jauge",
    label: "Jauge",
    shortLabel: "Jauge",
    description: "Évalue un joueur de 1 à 10 et découvre la moyenne du groupe.",
  },
  {
    id: "intrus",
    label: "L'Intrus",
    shortLabel: "L'Intrus",
    description: "Un joueur reçoit un mot différent. Découvre-le ou survis.",
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
  if (gameType === "majority" || gameType === "minority") return MAJORITY_CATEGORIES as GameCategoryMeta[];
  if (gameType === "mime_expressions") return MIME_EXPRESSION_CATEGORIES as GameCategoryMeta[];
  if (gameType === "jauge") return JAUGE_CATEGORIES as GameCategoryMeta[];
  if (gameType === "who_would") return WHO_WOULD_CATEGORIES as GameCategoryMeta[];
  if (gameType === "intrus") return INTRUS_PAIR_CATEGORIES as GameCategoryMeta[];
  return [];
}

export function getDefaultCategories(gameType: GameType | null | undefined): GameCategory[] {
  if (gameType === "who_of_us") return ["classique"];
  if (gameType === "majority" || gameType === "minority") return ["food", "internet", "party"];
  if (gameType === "mime_expressions") return ["classique"];
  if (gameType === "jauge") return ["survie", "relations", "chaos", "soiree"];
  if (gameType === "who_would") return ["soft"];
  if (gameType === "intrus") return ["food", "internet", "gaming", "brands", "movies_tv", "social"];
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
  if (gameType === "majority" || gameType === "minority") {
    return MAJORITY_QUESTIONS.map((q) => ({ ...q, gameType }));
  }
  if (gameType === "mime_expressions") {
    return MIME_EXPRESSIONS.map((q) => ({ ...q, gameType: "mime_expressions" as const }));
  }
  if (gameType === "jauge") return JAUGE_QUESTIONS;
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
