import type { GameType, MimeGameState, Player, Vote } from "@/types/database";
import type { SummaryHeatCell } from "./endGameSummaryTypes";
import { countBy } from "./endGameSummaryUtils";

export function buildTargetPairs(votes: Vote[], playerById: Map<string, Player>): SummaryHeatCell[] {
  const counts = new Map<string, number>();
  const totals = new Map<string, number>();
  for (const vote of votes) {
    if (!vote.selected_player_id) continue;
    const from = playerById.get(vote.voter_player_id);
    const to = playerById.get(vote.selected_player_id);
    if (!from || !to || from.id === to.id) continue;
    const key = `${from.id}::${to.id}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
    totals.set(from.id, (totals.get(from.id) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([key, value]) => {
      const [fromId, toId] = key.split("::");
      const from = playerById.get(fromId);
      const to = playerById.get(toId);
      if (!from || !to) return null;
      return {
        from,
        to,
        value,
        percent: Math.round((value / Math.max(1, totals.get(from.id) ?? value)) * 100),
      };
    })
    .filter((cell): cell is SummaryHeatCell => Boolean(cell))
    .sort((a, b) => b.value - a.value || b.percent - a.percent);
}

export function buildSameChoicePairs(votes: Vote[], playerById: Map<string, Player>): SummaryHeatCell[] {
  const counts = new Map<string, number>();
  const commonRounds = new Map<string, number>();
  const byQuestion = new Map<number, Vote[]>();
  for (const vote of votes) {
    if (!vote.selected_option || !playerById.has(vote.voter_player_id)) continue;
    byQuestion.set(vote.question_id, [...(byQuestion.get(vote.question_id) ?? []), vote]);
  }
  for (const questionVotes of byQuestion.values()) {
    for (let i = 0; i < questionVotes.length; i += 1) {
      for (let j = i + 1; j < questionVotes.length; j += 1) {
        const a = questionVotes[i];
        const b = questionVotes[j];
        const key = [a.voter_player_id, b.voter_player_id].sort().join("::");
        commonRounds.set(key, (commonRounds.get(key) ?? 0) + 1);
        if (a.selected_option === b.selected_option) counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
  }
  return [...counts.entries()]
    .map(([key, value]) => {
      const [fromId, toId] = key.split("::");
      const from = playerById.get(fromId);
      const to = playerById.get(toId);
      if (!from || !to) return null;
      return {
        from,
        to,
        value,
        percent: Math.round((value / Math.max(1, commonRounds.get(key) ?? value)) * 100),
      };
    })
    .filter((cell): cell is SummaryHeatCell => Boolean(cell))
    .sort((a, b) => b.percent - a.percent || b.value - a.value);
}

export function buildMimeHeatmap(players: Player[], state: MimeGameState | null): SummaryHeatCell[] {
  if (!state) return [];
  const playerById = new Map(players.map((player) => [player.id, player]));
  const orderedPlayers = state.playerOrder
    .map((playerId) => playerById.get(playerId))
    .filter((player): player is Player => Boolean(player));
  const counts = countBy(players.map((player) => player.id), state.mimeHistory.map((entry) => entry.mimePlayerId));

  return orderedPlayers.map((player, index) => {
    const next = orderedPlayers[(index + 1) % orderedPlayers.length] ?? player;
    const count = counts.get(player.id) ?? 0;
    const current = player.id === state.currentMimePlayerId;
    return {
      from: player,
      to: next,
      value: count,
      percent: current ? 100 : count > 0 ? 72 : 32,
      metricLabel: `#${index + 1}`,
      detail: current
        ? "Mime actuel"
        : count > 0
          ? `${count} passage${count > 1 ? "s" : ""} déjà joué${count > 1 ? "s" : ""}`
          : "Encore à venir",
    };
  });
}

export function buildRelationInsights({
  gameType,
  targetPairs,
  sameChoicePairs,
  targetCountByPlayer,
  players,
}: {
  gameType: GameType | null | undefined;
  players: Player[];
  targetPairs: SummaryHeatCell[];
  sameChoicePairs: SummaryHeatCell[];
  targetCountByPlayer: Map<string, number>;
}): string[] {
  const lines: string[] = [];
  const topTarget = targetPairs[0];
  if (topTarget) lines.push(`${topTarget.from.name} vise ${topTarget.to.name} dans ${topTarget.percent}% de ses votes nominaux.`);
  const asymmetry = targetPairs.find((cell) => {
    const reverse = targetPairs.find((other) => other.from.id === cell.to.id && other.to.id === cell.from.id);
    return cell.value >= 2 && cell.value >= (reverse?.value ?? 0) + 2;
  });
  if (asymmetry) lines.push(`${asymmetry.from.name} pense beaucoup à ${asymmetry.to.name}. L'inverse, beaucoup moins.`);
  const alliance = sameChoicePairs[0];
  if (alliance) lines.push(`${alliance.from.name} et ${alliance.to.name} répondent pareil ${alliance.percent}% du temps.`);
  if (gameType === "who_of_us") {
    const invisible = players.find((player) => (targetCountByPlayer.get(player.id) ?? 0) === 0);
    if (invisible) lines.push(`${invisible.name} esquive les désignations. Personne ne l'a vraiment ciblé.`);
  }
  if (!lines.length) {
    lines.push(
      gameType === "who_would"
        ? "Les duels restent trop serrés pour former une alliance officielle."
        : "La soirée manque encore de preuves, mais les soupçons montent."
    );
  }
  return lines.slice(0, 4);
}
