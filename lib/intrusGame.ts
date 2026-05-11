import type {
  GameType,
  IntrusClue,
  IntrusGameState,
  IntrusMode,
  IntrusPhase,
  IntrusRoundRecord,
  Player,
  Room,
} from "@/types/database";
import { findIntrusPairById, pickIntrusPair, type IntrusPairCategory } from "./intrusPairs";

export const INTRUS_GAME_TYPE = "intrus" as const;

export type IntrusOrderMode = "arrival" | "random" | "custom";

export function isIntrusGame(gameType: GameType | null | undefined): gameType is typeof INTRUS_GAME_TYPE {
  return gameType === INTRUS_GAME_TYPE;
}

export function isIntrusMode(value: unknown): value is IntrusMode {
  return value === "unconscious" || value === "conscious";
}

export function isIntrusPhase(value: unknown): value is IntrusPhase {
  return value === "clues" || value === "reveal_clues" || value === "vote" || value === "reveal_final" || value === "ended";
}

export function getIntrusGameState(value: Room["intrus_game_state"] | unknown): IntrusGameState | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<IntrusGameState>;
  const pairId = toInt(raw.pairId, 0);
  if (!pairId) return null;
  const playerOrder = Array.isArray(raw.playerOrder)
    ? raw.playerOrder.filter((id): id is string => typeof id === "string" && id.length > 0)
    : [];
  const clues = Array.isArray(raw.clues) ? raw.clues.map(sanitizeClue).filter((c): c is IntrusClue => Boolean(c)) : [];
  const usedPairIds = Array.isArray(raw.usedPairIds)
    ? raw.usedPairIds.map((id) => toInt(id, 0)).filter((id) => id !== 0)
    : [];
  const scoresByPlayer = sanitizeScoreMap(raw.scoresByPlayer);
  const history = Array.isArray(raw.history)
    ? raw.history.map(sanitizeHistoryRecord).filter((h): h is IntrusRoundRecord => Boolean(h))
    : [];

  return {
    pairId,
    mainWord: typeof raw.mainWord === "string" ? raw.mainWord : "",
    intrusWord: typeof raw.intrusWord === "string" ? raw.intrusWord : "",
    intrusPlayerId: typeof raw.intrusPlayerId === "string" ? raw.intrusPlayerId : "",
    playerOrder,
    currentClueIndex: clampIndex(toInt(raw.currentClueIndex, 0), playerOrder.length),
    clues,
    phase: isIntrusPhase(raw.phase) ? raw.phase : "clues",
    roundNumber: toInt(raw.roundNumber, 1),
    usedPairIds,
    mode: isIntrusMode(raw.mode) ? raw.mode : "unconscious",
    cluePhaseStartedAt: typeof raw.cluePhaseStartedAt === "string" ? raw.cluePhaseStartedAt : null,
    votePhaseStartedAt: typeof raw.votePhaseStartedAt === "string" ? raw.votePhaseStartedAt : null,
    clueDurationSec: toInt(raw.clueDurationSec, 15),
    voteDurationSec: toInt(raw.voteDurationSec, 30),
    finaleEnabled: raw.finaleEnabled === true,
    finaleAttempt: typeof raw.finaleAttempt === "string" ? raw.finaleAttempt : null,
    finaleCorrect: typeof raw.finaleCorrect === "boolean" ? raw.finaleCorrect : null,
    scoresByPlayer,
    history,
  };
}

function sanitizeClue(value: unknown): IntrusClue | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<IntrusClue>;
  const playerId = typeof raw.playerId === "string" ? raw.playerId : null;
  if (!playerId) return null;
  const text = typeof raw.text === "string" ? raw.text.slice(0, 80) : null;
  return {
    playerId,
    text: text && text.trim() ? text.trim() : null,
    ts: toInt(raw.ts, Date.now()),
  };
}

function sanitizeScoreMap(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object") return {};
  const map: Record<string, number> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (typeof k !== "string") continue;
    const n = typeof v === "number" ? v : Number(v);
    if (Number.isFinite(n)) map[k] = Math.round(n);
  }
  return map;
}

function sanitizeHistoryRecord(value: unknown): IntrusRoundRecord | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<IntrusRoundRecord>;
  const roundNumber = toInt(raw.roundNumber, 0);
  if (!roundNumber) return null;
  return {
    roundNumber,
    pairId: toInt(raw.pairId, 0),
    intrusPlayerId: typeof raw.intrusPlayerId === "string" ? raw.intrusPlayerId : "",
    mainWord: typeof raw.mainWord === "string" ? raw.mainWord : "",
    intrusWord: typeof raw.intrusWord === "string" ? raw.intrusWord : "",
    intrusFound: raw.intrusFound === true,
    topVotedPlayerId: typeof raw.topVotedPlayerId === "string" ? raw.topVotedPlayerId : null,
    finaleCorrect: typeof raw.finaleCorrect === "boolean" ? raw.finaleCorrect : null,
    clues: Array.isArray(raw.clues) ? raw.clues.map(sanitizeClue).filter((c): c is IntrusClue => Boolean(c)) : [],
  };
}

export function getArrivalOrder(players: Player[]): string[] {
  return [...players]
    .sort((a, b) => new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime())
    .map((player) => player.id);
}

export function mergePlayerOrder(order: string[], players: Player[]): string[] {
  const liveIds = new Set(players.map((player) => player.id));
  const known = order.filter((id) => liveIds.has(id));
  const knownSet = new Set(known);
  const joined = getArrivalOrder(players).filter((id) => !knownSet.has(id));
  return [...known, ...joined];
}

export function shuffleIds<T>(ids: T[]): T[] {
  const next = [...ids];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

export function moveId(order: string[], id: string, direction: -1 | 1): string[] {
  const index = order.indexOf(id);
  const nextIndex = index + direction;
  if (index < 0 || nextIndex < 0 || nextIndex >= order.length) return order;
  const next = [...order];
  [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
  return next;
}

export interface BuildIntrusStateArgs {
  participants: Player[];
  selectedCategories: IntrusPairCategory[] | string[];
  orderMode: IntrusOrderMode;
  customOrder?: string[];
  clueDurationSec: number;
  voteDurationSec: number;
  mode: IntrusMode;
  finaleEnabled: boolean;
  previousState?: IntrusGameState | null;
}

export function buildInitialIntrusState(args: BuildIntrusStateArgs): IntrusGameState | null {
  const pair = pickIntrusPair(args.selectedCategories, []);
  if (!pair) return null;
  const order = buildOrder(args.participants, args.orderMode, args.customOrder ?? []);
  if (!order.length) return null;
  const intrusPlayerId = order[Math.floor(Math.random() * order.length)] ?? "";
  return {
    pairId: pair.id,
    mainWord: pair.mainWord,
    intrusWord: pair.intrusWord,
    intrusPlayerId,
    playerOrder: order,
    currentClueIndex: 0,
    clues: [],
    phase: "clues",
    roundNumber: 1,
    usedPairIds: [pair.id],
    mode: args.mode,
    cluePhaseStartedAt: new Date().toISOString(),
    votePhaseStartedAt: null,
    clueDurationSec: args.clueDurationSec,
    voteDurationSec: args.voteDurationSec,
    finaleEnabled: args.finaleEnabled,
    finaleAttempt: null,
    finaleCorrect: null,
    scoresByPlayer: {},
    history: [],
  };
}

export function buildNextIntrusRound(
  previous: IntrusGameState,
  args: Pick<BuildIntrusStateArgs, "participants" | "selectedCategories" | "orderMode" | "customOrder">
): IntrusGameState | null {
  const pair = pickIntrusPair(args.selectedCategories, previous.usedPairIds);
  if (!pair) return null;
  const order = buildOrder(args.participants, args.orderMode, args.customOrder ?? []);
  if (!order.length) return null;
  const intrusPlayerId = order[Math.floor(Math.random() * order.length)] ?? "";
  return {
    ...previous,
    pairId: pair.id,
    mainWord: pair.mainWord,
    intrusWord: pair.intrusWord,
    intrusPlayerId,
    playerOrder: order,
    currentClueIndex: 0,
    clues: [],
    phase: "clues",
    roundNumber: previous.roundNumber + 1,
    usedPairIds: [...previous.usedPairIds, pair.id],
    cluePhaseStartedAt: new Date().toISOString(),
    votePhaseStartedAt: null,
    finaleAttempt: null,
    finaleCorrect: null,
  };
}

function buildOrder(participants: Player[], orderMode: IntrusOrderMode, customOrder: string[]): string[] {
  const liveIds = new Set(participants.map((p) => p.id));
  const arrival = getArrivalOrder(participants);
  if (orderMode === "arrival") return arrival;
  if (orderMode === "random") return shuffleIds(arrival);
  const known = customOrder.filter((id) => liveIds.has(id));
  const remaining = arrival.filter((id) => !known.includes(id));
  return [...known, ...remaining];
}

export function getWordForPlayer(state: IntrusGameState | null, playerId: string): string | null {
  if (!state || !playerId) return null;
  if (state.mode === "conscious" && playerId === state.intrusPlayerId) return state.intrusWord;
  return playerId === state.intrusPlayerId ? state.intrusWord : state.mainWord;
}

export function isPlayerIntrus(state: IntrusGameState | null, playerId: string | null | undefined): boolean {
  if (!state || !playerId) return false;
  return state.intrusPlayerId === playerId;
}

export function currentCluePlayerId(state: IntrusGameState | null): string | null {
  if (!state) return null;
  return state.playerOrder[state.currentClueIndex] ?? null;
}

export function appendClue(state: IntrusGameState, clue: IntrusClue): IntrusGameState {
  return {
    ...state,
    clues: [...state.clues, clue],
    currentClueIndex: Math.min(state.currentClueIndex + 1, state.playerOrder.length),
  };
}

export function isCluePhaseDone(state: IntrusGameState | null): boolean {
  if (!state) return false;
  return state.currentClueIndex >= state.playerOrder.length;
}

export function getIntrusPair(state: IntrusGameState | null) {
  if (!state) return null;
  return findIntrusPairById(state.pairId);
}

function clampIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  if (!Number.isFinite(index)) return 0;
  return Math.min(length, Math.max(0, Math.round(index)));
}

function toInt(value: unknown, fallback: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed) : fallback;
}
