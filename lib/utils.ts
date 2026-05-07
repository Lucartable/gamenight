// Configuration par défaut d'une partie.
export const DEFAULT_TOTAL_QUESTIONS = 10;
export const DEFAULT_VOTE_DURATION_SEC = 30;
export const DEFAULT_REVEAL_DURATION_SEC = 15;
export const DEFAULT_SCOREBOARD_DURATION_SEC = 7;
export const END_GAME_RETURN_DELAY_SEC = 7;

export const QUESTION_COUNT_PRESETS = [5, 10, 20] as const;
export const VOTE_DURATION_OPTIONS = [8, 15, 30, 45, 60] as const;
export const REVEAL_DURATION_OPTIONS = [6, 10, 15, 30] as const;
export const SCORE_TARGET_OPTIONS = [10, 20, 30, 50] as const;

// Mots faciles à lire/dicter à voix haute.
const WORDS = [
  "LOUP", "LUNE", "FETE", "BIRA", "PINS", "VINS", "OURS", "TIGR",
  "ROCK", "JAZZ", "DISC", "POOL", "CHAT", "DUCK", "GLOW", "NEON",
  "GAME", "QUIZ", "FUNK", "STAR", "MOJO", "ZEBR", "KOTO", "PAPA",
];

export function generateRoomCode(): string {
  const word = WORDS[Math.floor(Math.random() * WORDS.length)];
  const num = Math.floor(10 + Math.random() * 90); // 10-99
  return `${word}-${num}`;
}

export function normalizeRoomCode(input: string): string {
  return input.trim().toUpperCase().replace(/\s+/g, "");
}

// Identifiant invité persisté par navigateur. Il reste compatible avec
// l'ancien `client_id`, mais le modèle mental est maintenant clair :
// jouer ne demande pas de compte Supabase Auth.
export function getOrCreateClientId(): string {
  return getOrCreateGuestId();
}

export function secondsLeft(startIso: string | null, durationSec: number): number {
  if (!startIso) return 0;
  const elapsed = (Date.now() - new Date(startIso).getTime()) / 1000;
  return Math.max(0, Math.ceil(durationSec - elapsed));
}

export function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function triggerHaptic(pattern: number | number[] = 12): void {
  if (typeof window === "undefined") return;
  if ("vibrate" in window.navigator) {
    window.navigator.vibrate(pattern);
  }
}

// Persistance des catégories sélectionnées par l'hôte (par salle).
const CATEGORIES_KEY_PREFIX = "gn_cats_";

export function loadCategories(roomCode: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CATEGORIES_KEY_PREFIX + roomCode);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCategories(roomCode: string, categories: string[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CATEGORIES_KEY_PREFIX + roomCode, JSON.stringify(categories));
}
import { getOrCreateGuestId } from "./guestSession";
