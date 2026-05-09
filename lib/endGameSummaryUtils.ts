import type { Player } from "@/types/database";

export function maxPlayer(players: Player[], primary: Map<string, number>, secondary?: Map<string, number>) {
  const rows = players
    .map((player) => ({
      player,
      value: (primary.get(player.id) ?? 0) + (secondary?.get(player.id) ?? 0),
    }))
    .sort((a, b) => b.value - a.value || a.player.name.localeCompare(b.player.name));
  return rows[0]?.value ? rows[0] : null;
}

export function minPlayer(players: Player[], primary: Map<string, number>, fallback: Map<string, number>) {
  if (!players.length) return null;
  const rows = players
    .map((player) => ({
      player,
      value: primary.get(player.id) ?? 0,
      fallback: fallback.get(player.id) ?? 0,
    }))
    .sort((a, b) => a.value - b.value || a.fallback - b.fallback || a.player.name.localeCompare(b.player.name));
  return rows[0] ?? null;
}

export function countBy(keys: string[], values: string[]): Map<string, number> {
  const counts = new Map(keys.map((key) => [key, 0]));
  for (const value of values) {
    if (!value) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return counts;
}

export function increment(map: Map<string, number>, key: string): void {
  map.set(key, (map.get(key) ?? 0) + 1);
}

export function average(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function formatRating(value: number): string {
  return (Math.round(value * 10) / 10).toFixed(1);
}

export function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

export function uniqueBy<T>(items: T[], getKey: (item: T) => string): T[] {
  const seen = new Set<string>();
  const output: T[] = [];
  for (const item of items) {
    const key = getKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(item);
  }
  return output;
}
