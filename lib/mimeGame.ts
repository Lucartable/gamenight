import type { GameType, MimeGameState, MimeRoundStatus, Player, Room } from "@/types/database";
import type { MimeExpressionQuestion } from "./gameQuestions";
import { isMimeMode, type MimeMode } from "./mimeModes";

export type MimeOrderMode = "arrival" | "random" | "custom";
export type MimePlayerCountMode = "solo" | "duo" | "trio" | "quartet" | "random_1_2" | "random_1_3" | "random_1_4" | "random_2_4";

export const MIME_PLAYER_COUNT_MODES: Array<{
  id: MimePlayerCountMode;
  label: string;
  detail: string;
  min: number;
  max: number;
}> = [
  { id: "solo", label: "Solo", detail: "1 mimeur", min: 1, max: 1 },
  { id: "duo", label: "Duo", detail: "2 mimeurs", min: 2, max: 2 },
  { id: "trio", label: "Trio", detail: "3 mimeurs", min: 3, max: 3 },
  { id: "quartet", label: "Quatuor", detail: "4 mimeurs", min: 4, max: 4 },
  { id: "random_1_2", label: "Aléa 1-2", detail: "Solo ou duo", min: 1, max: 2 },
  { id: "random_1_3", label: "Aléa 1-3", detail: "Solo, duo ou trio", min: 1, max: 3 },
  { id: "random_1_4", label: "Aléa 1-4", detail: "Solo à quatuor", min: 1, max: 4 },
  { id: "random_2_4", label: "Aléa 2-4", detail: "Duo à quatuor", min: 2, max: 4 },
];

export function isMimeGame(gameType: GameType | null | undefined): gameType is "mime_expressions" {
  return gameType === "mime_expressions";
}

export function getMimeGameState(value: Room["mime_game_state"] | unknown): MimeGameState | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<MimeGameState>;
  const playerOrder = Array.isArray(raw.playerOrder)
    ? raw.playerOrder.filter((id): id is string => typeof id === "string" && id.length > 0)
    : [];
  const currentMimeIndex = toInt(raw.currentMimeIndex, 0);
  const currentMimePlayerId =
    typeof raw.currentMimePlayerId === "string" ? raw.currentMimePlayerId : playerOrder[currentMimeIndex] ?? "";
  const currentMimePlayerIds = Array.isArray(raw.currentMimePlayerIds)
    ? raw.currentMimePlayerIds.filter((id): id is string => typeof id === "string" && id.length > 0)
    : currentMimePlayerId
      ? [currentMimePlayerId]
      : [];
  const mimePlayerCount = clamp(toInt(raw.mimePlayerCount, currentMimePlayerIds.length || 1), 1, 12);
  const currentExpressionId = toInt(raw.currentExpressionId, 0);
  const usedExpressionIds = Array.isArray(raw.usedExpressionIds)
    ? raw.usedExpressionIds.map((id) => toInt(id, 0)).filter((id) => id !== 0)
    : [];
  const mimeHistory = Array.isArray(raw.mimeHistory)
    ? raw.mimeHistory
        .map((entry) => {
          if (!entry || typeof entry !== "object") return null;
          const item = entry as { roundNumber?: unknown; mimePlayerId?: unknown; mimePlayerIds?: unknown; expressionId?: unknown };
          const mimePlayerIds = Array.isArray(item.mimePlayerIds)
            ? item.mimePlayerIds.filter((id): id is string => typeof id === "string" && id.length > 0)
            : undefined;
          return {
            roundNumber: toInt(item.roundNumber, 0),
            mimePlayerId: typeof item.mimePlayerId === "string" ? item.mimePlayerId : "",
            mimePlayerIds,
            expressionId: toInt(item.expressionId, 0),
          };
        })
        .filter((entry): entry is NonNullable<typeof entry> =>
          Boolean(entry && entry.roundNumber > 0 && entry.mimePlayerId && entry.expressionId !== 0)
        )
    : [];
  const roundNumber = toInt(raw.roundNumber, 0);
  const timerDuration = toInt(raw.timerDuration, 30);
  const preparationDurationSec = clamp(toInt(raw.preparationDurationSec, 10), 0, 60);
  const preparationStartedAt = typeof raw.preparationStartedAt === "string" ? raw.preparationStartedAt : null;
  const roundStatus = isMimeRoundStatus(raw.roundStatus) ? raw.roundStatus : "waiting";
  const hostPlayMode = raw.hostPlayMode === true;
  const mimePlayerCountMode = isMimePlayerCountMode(raw.mimePlayerCountMode) ? raw.mimePlayerCountMode : "solo";
  const mimeMode = isMimeMode(raw.mimeMode) ? raw.mimeMode : "classic";
  const mimeRuleFlavor = typeof raw.mimeRuleFlavor === "string" ? raw.mimeRuleFlavor : undefined;

  if (!playerOrder.length && !currentExpressionId && !roundNumber && !raw.mimePlayerCountMode) return null;

  return {
    playerOrder,
    currentMimeIndex: clampIndex(currentMimeIndex, playerOrder.length),
    currentMimePlayerId,
    currentMimePlayerIds,
    mimePlayerCount,
    currentExpressionId,
    usedExpressionIds,
    mimeHistory,
    roundNumber,
    timerDuration,
    preparationDurationSec,
    preparationStartedAt,
    roundStatus,
    hostPlayMode,
    mimePlayerCountMode,
    mimeMode,
    mimeRuleFlavor,
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

export function prunePlayerOrder(order: string[], players: Player[]): string[] {
  const liveIds = new Set(players.map((player) => player.id));
  return order.filter((id) => liveIds.has(id));
}

export function getOrderedPlayers(order: string[], players: Player[]): Player[] {
  const playerById = new Map(players.map((player) => [player.id, player]));
  return order.map((id) => playerById.get(id)).filter((player): player is Player => Boolean(player));
}

export function getPlayersOutsideOrder(order: string[], players: Player[]): Player[] {
  const orderedIds = new Set(order);
  return players.filter((player) => !orderedIds.has(player.id));
}

export function moveId(order: string[], id: string, direction: -1 | 1): string[] {
  const index = order.indexOf(id);
  const nextIndex = index + direction;
  if (index < 0 || nextIndex < 0 || nextIndex >= order.length) return order;
  const next = [...order];
  [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
  return next;
}

export function shuffleIds(ids: string[]): string[] {
  const next = [...ids];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

export function buildMimeGameState({
  playerOrder,
  currentMimeIndex,
  currentMimePlayerIds,
  mimePlayerCount,
  expressionId,
  usedExpressionIds,
  mimeHistory,
  roundNumber,
  timerDuration,
  preparationDurationSec,
  preparationStartedAt,
  roundStatus,
  hostPlayMode,
  mimePlayerCountMode,
  mimeMode,
  mimeRuleFlavor,
}: {
  playerOrder: string[];
  currentMimeIndex: number;
  currentMimePlayerIds?: string[];
  mimePlayerCount?: number;
  expressionId: number;
  usedExpressionIds: number[];
  mimeHistory?: MimeGameState["mimeHistory"];
  roundNumber: number;
  timerDuration: number;
  preparationDurationSec?: number;
  preparationStartedAt?: string | null;
  roundStatus: MimeRoundStatus;
  hostPlayMode: boolean;
  mimePlayerCountMode?: MimePlayerCountMode;
  mimeMode?: MimeMode;
  mimeRuleFlavor?: string;
}): MimeGameState {
  const safeIndex = clampIndex(currentMimeIndex, playerOrder.length);
  const safeMimePlayerIds = currentMimePlayerIds?.length ? currentMimePlayerIds : [playerOrder[safeIndex] ?? ""].filter(Boolean);
  const safeMimePlayerCount = clamp(mimePlayerCount ?? (safeMimePlayerIds.length || 1), 1, Math.max(1, playerOrder.length || safeMimePlayerIds.length || 1));
  return {
    playerOrder,
    currentMimeIndex: safeIndex,
    currentMimePlayerId: safeMimePlayerIds[0] ?? playerOrder[safeIndex] ?? "",
    currentMimePlayerIds: safeMimePlayerIds,
    mimePlayerCount: safeMimePlayerCount,
    currentExpressionId: expressionId,
    usedExpressionIds,
    mimeHistory: mimeHistory ?? [
      {
        roundNumber,
        mimePlayerId: safeMimePlayerIds[0] ?? playerOrder[safeIndex] ?? "",
        mimePlayerIds: safeMimePlayerIds,
        expressionId,
      },
    ],
    roundNumber,
    timerDuration,
    preparationDurationSec: preparationDurationSec ?? 10,
    preparationStartedAt: preparationStartedAt ?? null,
    roundStatus,
    hostPlayMode,
    mimePlayerCountMode: mimePlayerCountMode ?? "solo",
    mimeMode: mimeMode ?? "classic",
    mimeRuleFlavor,
  };
}

export function findNextMimeIndex(state: MimeGameState, playerOrder: string[]): number {
  if (!playerOrder.length) return 0;
  const currentId = state.currentMimePlayerId;
  const liveCurrentIndex = playerOrder.indexOf(currentId);
  if (liveCurrentIndex >= 0) return (liveCurrentIndex + 1) % playerOrder.length;
  return clampIndex(state.currentMimeIndex, playerOrder.length);
}

export function getMimePlayerCountModeMeta(mode: MimePlayerCountMode | string | null | undefined): (typeof MIME_PLAYER_COUNT_MODES)[number] {
  return MIME_PLAYER_COUNT_MODES.find((item) => item.id === mode) ?? MIME_PLAYER_COUNT_MODES[0]!;
}

export function getMimePlayerCountRange(mode: MimePlayerCountMode | string | null | undefined, availablePlayers: number): { min: number; max: number } {
  const meta = getMimePlayerCountModeMeta(mode);
  const playerCap = Math.max(1, availablePlayers);
  const min = Math.min(Math.max(1, meta.min), playerCap);
  const max = Math.min(Math.max(min, meta.max), playerCap);
  return { min, max };
}

export function pickMimePlayerCount(mode: MimePlayerCountMode, availablePlayers: number, random: () => number = Math.random): number {
  const { min, max } = getMimePlayerCountRange(mode, availablePlayers);
  if (min === max) return min;
  return min + Math.floor(random() * (max - min + 1));
}

export function getMimeRoundPlayerIds(playerOrder: string[], startIndex: number, count: number): string[] {
  if (!playerOrder.length) return [];
  const safeCount = Math.min(Math.max(1, count), playerOrder.length);
  const output: string[] = [];
  for (let offset = 0; offset < safeCount; offset += 1) {
    output.push(playerOrder[(startIndex + offset) % playerOrder.length] ?? playerOrder[0]);
  }
  return [...new Set(output)];
}

export function getMimeQuestionBounds(question: Pick<MimeExpressionQuestion, "mimePlayerCountMin" | "mimePlayerCountMax">): { min: number; max: number } {
  const min = clamp(toInt(question.mimePlayerCountMin, 1), 1, 12);
  const max = clamp(toInt(question.mimePlayerCountMax, min), min, 12);
  return { min, max };
}

export function isMimeQuestionCompatible(question: Pick<MimeExpressionQuestion, "mimePlayerCountMin" | "mimePlayerCountMax">, mimePlayerCount: number): boolean {
  const bounds = getMimeQuestionBounds(question);
  return mimePlayerCount >= bounds.min && mimePlayerCount <= bounds.max;
}

export function isMimeQuestionCompatibleWithRange(
  question: Pick<MimeExpressionQuestion, "mimePlayerCountMin" | "mimePlayerCountMax">,
  range: { min: number; max: number }
): boolean {
  const bounds = getMimeQuestionBounds(question);
  return bounds.min <= range.max && bounds.max >= range.min;
}

export function isMimePlayerCountMode(value: unknown): value is MimePlayerCountMode {
  return value === "solo" || value === "duo" || value === "trio" || value === "quartet" || value === "random_1_2" || value === "random_1_3" || value === "random_1_4" || value === "random_2_4";
}

function clampIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  if (!Number.isFinite(index)) return 0;
  return Math.min(length - 1, Math.max(0, Math.round(index)));
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function toInt(value: unknown, fallback: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed) : fallback;
}

function isMimeRoundStatus(value: unknown): value is MimeRoundStatus {
  return value === "waiting" || value === "preparing" || value === "playing" || value === "ended" || value === "revealed";
}
