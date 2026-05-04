// Durées (en secondes) — modifiables ici si besoin de tuner.
export const VOTE_DURATION_SEC = 30;
export const DEBATE_DURATION_SEC = 120;

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

// Identifiant client persisté par navigateur — sert de pseudo-session
// (pas d'auth, on assume un appareil = un joueur).
export function getOrCreateClientId(): string {
  if (typeof window === "undefined") return "";
  const KEY = "gn_client_id";
  let id = window.localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(KEY, id);
  }
  return id;
}

export function secondsLeft(startIso: string | null, durationSec: number): number {
  if (!startIso) return 0;
  const elapsed = (Date.now() - new Date(startIso).getTime()) / 1000;
  return Math.max(0, Math.ceil(durationSec - elapsed));
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
