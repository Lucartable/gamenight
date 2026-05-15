export interface PlayerSelectionHistoryEntry {
  roundNumber?: number;
  playerIds: string[];
}

export interface PlayerSelectionStats {
  playerId: string;
  selectedCount: number;
  lastSelectedRound: number | null;
  weight: number;
}

export interface FairRandomOptions {
  history?: PlayerSelectionHistoryEntry[];
  currentRound?: number;
  random?: () => number;
}

const RECENT_ROUND_PENALTY = 0.18;
const NEAR_RECENT_ROUND_PENALTY = 0.55;
const EXACT_GROUP_REPEAT_PENALTY = 0.12;

export function weightedRandomPlayer(playerIds: string[], options: FairRandomOptions = {}): string | null {
  return fairRandomPlayers(playerIds, 1, options)[0] ?? null;
}

export function fairRandomPlayers(playerIds: string[], count: number, options: FairRandomOptions = {}): string[] {
  const candidates = uniquePlayerIds(playerIds);
  if (!candidates.length || count <= 0) return [];
  const safeCount = Math.min(Math.max(1, Math.round(count)), candidates.length);
  if (safeCount >= candidates.length) return [...candidates];

  const random = options.random ?? Math.random;
  const history = normalizeHistory(options.history ?? [], new Set(candidates));
  const currentRound = options.currentRound ?? inferCurrentRound(history);
  const stats = buildPlayerSelectionStats(candidates, { history, currentRound });
  const statById = new Map(stats.map((stat) => [stat.playerId, stat]));
  const groupCounts = buildGroupCounts(history);
  const lastGroup = history[history.length - 1]?.playerIds ?? [];
  const groups = combinations(candidates, safeCount)
    .map((group) => ({
      group,
      weight: scoreGroup(group, {
        statById,
        groupCounts,
        lastGroup,
        totalCandidates: candidates.length,
      }),
    }))
    .sort((a, b) => b.weight - a.weight || a.group.join("|").localeCompare(b.group.join("|")));

  return pickWeighted(groups, random)?.group ?? groups[0]?.group ?? [];
}

export function randomPlayers(playerIds: string[], count: number, random: () => number = Math.random): string[] {
  const candidates = uniquePlayerIds(playerIds);
  const safeCount = Math.min(Math.max(0, Math.round(count)), candidates.length);
  const shuffled = [...candidates];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, safeCount);
}

export function buildPlayerSelectionStats(
  playerIds: string[],
  options: FairRandomOptions = {},
): PlayerSelectionStats[] {
  const candidates = uniquePlayerIds(playerIds);
  const liveIds = new Set(candidates);
  const history = normalizeHistory(options.history ?? [], liveIds);
  const currentRound = options.currentRound ?? inferCurrentRound(history);
  const counts = new Map(candidates.map((id) => [id, 0]));
  const lastRounds = new Map<string, number>();

  for (const entry of history) {
    const round = entry.roundNumber ?? 0;
    for (const id of entry.playerIds) {
      counts.set(id, (counts.get(id) ?? 0) + 1);
      if (round > 0) lastRounds.set(id, Math.max(lastRounds.get(id) ?? 0, round));
    }
  }

  const minCount = Math.min(...candidates.map((id) => counts.get(id) ?? 0));
  return candidates.map((playerId) => {
    const selectedCount = counts.get(playerId) ?? 0;
    const lastSelectedRound = lastRounds.get(playerId) ?? null;
    const relativeCount = Math.max(0, selectedCount - minCount);
    let weight = 1 / Math.pow(1 + relativeCount, 2);

    if (lastSelectedRound != null && currentRound > 0) {
      const roundsSince = currentRound - lastSelectedRound;
      if (roundsSince <= 1 && candidates.length > 1) weight *= RECENT_ROUND_PENALTY;
      else if (roundsSince === 2 && candidates.length > 2) weight *= NEAR_RECENT_ROUND_PENALTY;
    }

    return {
      playerId,
      selectedCount,
      lastSelectedRound,
      weight: Math.max(0.01, weight),
    };
  });
}

function scoreGroup(
  group: string[],
  {
    statById,
    groupCounts,
    lastGroup,
    totalCandidates,
  }: {
    statById: Map<string, PlayerSelectionStats>;
    groupCounts: Map<string, number>;
    lastGroup: string[];
    totalCandidates: number;
  },
): number {
  const playerWeight = group.reduce((sum, id) => sum + (statById.get(id)?.weight ?? 0.01), 0) / group.length;
  let weight = Math.pow(playerWeight, 1.35);
  const groupKey = toGroupKey(group);
  const repeatCount = groupCounts.get(groupKey) ?? 0;
  if (repeatCount > 0 && totalCandidates > group.length) {
    weight *= EXACT_GROUP_REPEAT_PENALTY / repeatCount;
  }
  if (lastGroup.length && totalCandidates > group.length) {
    const lastSet = new Set(lastGroup);
    const overlap = group.filter((id) => lastSet.has(id)).length;
    if (overlap === group.length) weight *= 0.08;
    else if (overlap > 0) weight *= Math.max(0.35, 1 - (overlap / group.length) * 0.45);
  }
  return Math.max(0.0001, weight);
}

function pickWeighted<T extends { weight: number }>(items: T[], random: () => number): T | null {
  const total = items.reduce((sum, item) => sum + Math.max(0, item.weight), 0);
  if (total <= 0) return items[0] ?? null;
  let roll = Math.min(0.999999999, Math.max(0, random())) * total;
  for (const item of items) {
    roll -= Math.max(0, item.weight);
    if (roll <= 0) return item;
  }
  return items[items.length - 1] ?? null;
}

function combinations(ids: string[], count: number): string[][] {
  const out: string[][] = [];
  const walk = (start: number, group: string[]) => {
    if (group.length === count) {
      out.push([...group]);
      return;
    }
    for (let index = start; index <= ids.length - (count - group.length); index += 1) {
      group.push(ids[index]!);
      walk(index + 1, group);
      group.pop();
    }
  };
  walk(0, []);
  return out;
}

function buildGroupCounts(history: PlayerSelectionHistoryEntry[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const entry of history) {
    if (entry.playerIds.length <= 1) continue;
    const key = toGroupKey(entry.playerIds);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function normalizeHistory(
  history: PlayerSelectionHistoryEntry[],
  liveIds: Set<string>,
): PlayerSelectionHistoryEntry[] {
  return history
    .map((entry) => ({
      roundNumber: typeof entry.roundNumber === "number" && Number.isFinite(entry.roundNumber)
        ? Math.round(entry.roundNumber)
        : undefined,
      playerIds: uniquePlayerIds(entry.playerIds).filter((id) => liveIds.has(id)),
    }))
    .filter((entry) => entry.playerIds.length > 0);
}

function inferCurrentRound(history: PlayerSelectionHistoryEntry[]): number {
  const lastRound = history.reduce((max, entry) => Math.max(max, entry.roundNumber ?? 0), 0);
  return lastRound + 1;
}

function uniquePlayerIds(ids: string[]): string[] {
  return [...new Set(ids.filter((id) => typeof id === "string" && id.length > 0))];
}

function toGroupKey(ids: string[]): string {
  return [...ids].sort().join("|");
}
