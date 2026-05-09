import type { GameType, MimeGameState, MimeRoundStatus, Player, Room } from "@/types/database";

export type MimeOrderMode = "arrival" | "random" | "custom";

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
  const currentExpressionId = toInt(raw.currentExpressionId, 0);
  const usedExpressionIds = Array.isArray(raw.usedExpressionIds)
    ? raw.usedExpressionIds.map((id) => toInt(id, 0)).filter((id) => id !== 0)
    : [];
  const mimeHistory = Array.isArray(raw.mimeHistory)
    ? raw.mimeHistory
        .map((entry) => {
          if (!entry || typeof entry !== "object") return null;
          const item = entry as { roundNumber?: unknown; mimePlayerId?: unknown; expressionId?: unknown };
          return {
            roundNumber: toInt(item.roundNumber, 0),
            mimePlayerId: typeof item.mimePlayerId === "string" ? item.mimePlayerId : "",
            expressionId: toInt(item.expressionId, 0),
          };
        })
        .filter((entry): entry is NonNullable<typeof entry> =>
          Boolean(entry && entry.roundNumber > 0 && entry.mimePlayerId && entry.expressionId !== 0)
        )
    : [];
  const roundNumber = toInt(raw.roundNumber, 0);
  const timerDuration = toInt(raw.timerDuration, 30);
  const roundStatus = isMimeRoundStatus(raw.roundStatus) ? raw.roundStatus : "waiting";
  const hostPlayMode = raw.hostPlayMode === true;

  if (!playerOrder.length && !currentExpressionId && !roundNumber) return null;

  return {
    playerOrder,
    currentMimeIndex: clampIndex(currentMimeIndex, playerOrder.length),
    currentMimePlayerId,
    currentExpressionId,
    usedExpressionIds,
    mimeHistory,
    roundNumber,
    timerDuration,
    roundStatus,
    hostPlayMode,
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
  expressionId,
  usedExpressionIds,
  mimeHistory,
  roundNumber,
  timerDuration,
  roundStatus,
  hostPlayMode,
}: {
  playerOrder: string[];
  currentMimeIndex: number;
  expressionId: number;
  usedExpressionIds: number[];
  mimeHistory?: MimeGameState["mimeHistory"];
  roundNumber: number;
  timerDuration: number;
  roundStatus: MimeRoundStatus;
  hostPlayMode: boolean;
}): MimeGameState {
  const safeIndex = clampIndex(currentMimeIndex, playerOrder.length);
  return {
    playerOrder,
    currentMimeIndex: safeIndex,
    currentMimePlayerId: playerOrder[safeIndex] ?? "",
    currentExpressionId: expressionId,
    usedExpressionIds,
    mimeHistory: mimeHistory ?? [
      {
        roundNumber,
        mimePlayerId: playerOrder[safeIndex] ?? "",
        expressionId,
      },
    ],
    roundNumber,
    timerDuration,
    roundStatus,
    hostPlayMode,
  };
}

export function findNextMimeIndex(state: MimeGameState, playerOrder: string[]): number {
  if (!playerOrder.length) return 0;
  const currentId = state.currentMimePlayerId;
  const liveCurrentIndex = playerOrder.indexOf(currentId);
  if (liveCurrentIndex >= 0) return (liveCurrentIndex + 1) % playerOrder.length;
  return clampIndex(state.currentMimeIndex, playerOrder.length);
}

function clampIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  if (!Number.isFinite(index)) return 0;
  return Math.min(length - 1, Math.max(0, Math.round(index)));
}

function toInt(value: unknown, fallback: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed) : fallback;
}

function isMimeRoundStatus(value: unknown): value is MimeRoundStatus {
  return value === "waiting" || value === "playing" || value === "ended" || value === "revealed";
}
