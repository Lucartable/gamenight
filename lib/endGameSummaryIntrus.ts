import type { IntrusGameState, IntrusRoundRecord, Player, Vote } from "@/types/database";
import { getSectionLabels } from "./endGameSummaryLabels";
import type {
  EndGameSummary,
  SummaryHeatCell,
  SummaryRareMoment,
  SummaryScoreRow,
  SummarySpotlight,
} from "./endGameSummaryTypes";

interface IntrusPlayerStats {
  player: Player;
  score: number;
  intrusRounds: number;
  intrusFoundCount: number;
  intrusSurvivedCount: number;
  finaleSuccessCount: number;
  cluesGiven: number;
}

export function buildIntrusSummary({
  players,
  votes,
  intrusGameState,
}: {
  players: Player[];
  votes: Vote[];
  intrusGameState: IntrusGameState | null;
}): EndGameSummary {
  const history: IntrusRoundRecord[] = intrusGameState?.history ?? [];
  const scoresByPlayer = intrusGameState?.scoresByPlayer ?? {};
  const roundsPlayed = history.length;
  const totalClues = history.reduce((acc, round) => acc + round.clues.length, 0);
  const playerIds = new Set(players.map((player) => player.id));
  const intrusVotes = votes.filter((vote) => vote.game_type === "intrus" && playerIds.has(vote.voter_player_id));
  const detectiveCounts = buildDetectiveCounts(history, intrusVotes);

  const playerStats: IntrusPlayerStats[] = players.map((player) => {
    const intrusRoundsList = history.filter((round) => round.intrusPlayerId === player.id);
    const intrusFoundCount = intrusRoundsList.filter((round) => round.intrusFound).length;
    const intrusSurvivedCount = intrusRoundsList.length - intrusFoundCount;
    const finaleSuccessCount = intrusRoundsList.filter((round) => round.finaleCorrect === true).length;
    const cluesGiven = history.reduce(
      (acc, round) => acc + round.clues.filter((clue) => clue.playerId === player.id && clue.text).length,
      0
    );
    return {
      player,
      score: scoresByPlayer[player.id] ?? 0,
      intrusRounds: intrusRoundsList.length,
      intrusFoundCount,
      intrusSurvivedCount,
      finaleSuccessCount,
      cluesGiven,
    };
  });

  const ranked = [...playerStats].sort(
    (a, b) => b.score - a.score || a.player.name.localeCompare(b.player.name)
  );

  const scoreboard: SummaryScoreRow[] = ranked.map((row, index) => ({
    player: row.player,
    rank: index + 1,
    score: row.score,
    scoreLabel: "pts",
    detail: row.intrusRounds
      ? `intrus ×${row.intrusRounds} · ${row.cluesGiven} indice${row.cluesGiven > 1 ? "s" : ""}`
      : `${row.cluesGiven} indice${row.cluesGiven > 1 ? "s" : ""} donné${row.cluesGiven > 1 ? "s" : ""}`,
    tone: index === 0 ? "gold" : index === 1 ? "cyan" : index === 2 ? "pink" : "purple",
  }));

  const leader = scoreboard[0] ?? null;
  const survivorCandidate = [...playerStats]
    .filter((row) => row.intrusSurvivedCount > 0)
    .sort((a, b) => b.intrusSurvivedCount - a.intrusSurvivedCount || b.score - a.score)[0] ?? null;
  const unmaskedCandidate = [...playerStats]
    .filter((row) => row.intrusFoundCount > 0)
    .sort((a, b) => b.intrusFoundCount - a.intrusFoundCount)[0] ?? null;
  const detective = findDetective(playerStats, detectiveCounts);
  const finalist = [...playerStats]
    .filter((row) => row.finaleSuccessCount > 0)
    .sort((a, b) => b.finaleSuccessCount - a.finaleSuccessCount)[0] ?? null;
  const quietest = roundsPlayed > 0
    ? [...playerStats].sort((a, b) => a.cluesGiven - b.cluesGiven || a.player.name.localeCompare(b.player.name))[0] ?? null
    : null;

  const spotlights: SummarySpotlight[] = [
    {
      id: "intrus-leader",
      label: "Leader final",
      title: leader ? "Champion de l'enquête" : "Personne ne ressort",
      player: leader?.player ?? null,
      value: leader ? `${leader.score} pts` : "0",
      detail: leader
        ? `${leader.player.name} domine après ${roundsPlayed} manche${roundsPlayed > 1 ? "s" : ""}.`
        : "Pas encore de leader désigné.",
      tone: "gold",
    },
    {
      id: "intrus-survivor",
      label: "Roi de l'esquive",
      title: survivorCandidate ? "Intrus insaisissable" : "Aucune esquive notable",
      player: survivorCandidate?.player ?? null,
      value: survivorCandidate ? `×${survivorCandidate.intrusSurvivedCount}` : "0",
      detail: survivorCandidate
        ? `${survivorCandidate.player.name} a survécu ${survivorCandidate.intrusSurvivedCount} fois en tant qu'intrus.`
        : "Personne n'a survécu en tant qu'intrus.",
      tone: "pink",
    },
    {
      id: "intrus-detective",
      label: "Détective en chef",
      title: detective ? "Œil de lynx" : "Aucun limier identifié",
      player: detective?.player ?? null,
      value: detective ? `×${detective.detectiveCount}` : "0",
      detail: detective
        ? `${detective.player.name} a flairé l'intrus ${detective.detectiveCount} fois.`
        : "Aucune accusation gagnante dominante.",
      tone: "cyan",
    },
    {
      id: "intrus-unmasked",
      label: "Démasqué malgré tout",
      title: unmaskedCandidate ? "Mauvais bluff" : "Personne n'a été démasqué",
      player: unmaskedCandidate?.player ?? null,
      value: unmaskedCandidate ? `×${unmaskedCandidate.intrusFoundCount}` : "0",
      detail: unmaskedCandidate
        ? `${unmaskedCandidate.player.name} s'est fait démasquer ${unmaskedCandidate.intrusFoundCount} fois.`
        : "Tous les intrus s'en sont sortis.",
      tone: "purple",
    },
    {
      id: "intrus-finale",
      label: "Dernière chance",
      title: finalist ? "Rattrape la mise" : "Aucune dernière chance réussie",
      player: finalist?.player ?? null,
      value: finalist ? `×${finalist.finaleSuccessCount}` : "0",
      detail: finalist
        ? `${finalist.player.name} a deviné le mot principal après avoir été démasqué.`
        : "Aucun intrus n'a trouvé le mot principal une fois exposé.",
      tone: "green",
    },
    {
      id: "intrus-quiet",
      label: "Le plus discret",
      title: quietest ? "Indices rares" : "Tout le monde a parlé",
      player: quietest?.player ?? null,
      value: quietest ? `${quietest.cluesGiven}` : "0",
      detail: quietest
        ? `${quietest.player.name} a donné le moins d'indices (${quietest.cluesGiven}).`
        : "Personne ne s'est terré dans le silence.",
      tone: "ghost",
    },
  ];

  const heatmap = buildVoteHeatmap(history, players, intrusVotes);
  const relationInsights = buildIntrusRelationInsights(history, players, detective);
  const rareMoments = buildIntrusRareMoments(history, players);
  const recapLines = buildIntrusRecapLines({
    leader,
    survivor: survivorCandidate,
    unmasked: unmaskedCandidate,
    detective,
    rareMoments,
    roundsPlayed,
  });

  const subtitleParts = [
    `L'Intrus · ${roundsPlayed} manche${roundsPlayed > 1 ? "s" : ""}`,
    `${totalClues} indice${totalClues > 1 ? "s" : ""}`,
  ];

  return {
    profile: "intrus",
    title: leader
      ? `${leader.player.name} démasque la soirée`
      : roundsPlayed === 0
        ? "L'Intrus n'a pas encore parlé"
        : "Personne ne se détache encore",
    subtitle: subtitleParts.join(" · "),
    leaderLabel: "Leader final",
    sectionLabels: getSectionLabels("intrus"),
    roundsPlayed,
    totalVotes: totalClues,
    leader,
    scoreboard,
    spotlights,
    heatmapMode: heatmap.length ? "targets" : "empty",
    heatmap,
    relationInsights,
    rareMoments,
    recapLines,
  };
}

interface DetectiveRow {
  player: Player;
  detectiveCount: number;
}

function buildDetectiveCounts(history: IntrusRoundRecord[], votes: Vote[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const round of history) {
    if (!round.intrusFound) continue;
    const roundVotes = votes.filter((vote) => vote.question_id === round.pairId);
    for (const vote of roundVotes) {
      if (vote.voter_player_id === round.intrusPlayerId) continue;
      if (vote.selected_player_id !== round.intrusPlayerId) continue;
      counts.set(vote.voter_player_id, (counts.get(vote.voter_player_id) ?? 0) + 1);
    }
  }
  return counts;
}

function findDetective(
  stats: IntrusPlayerStats[],
  counts: Map<string, number>
): DetectiveRow | null {
  let best: DetectiveRow | null = null;
  for (const stat of stats) {
    const count = counts.get(stat.player.id) ?? 0;
    if (!count) continue;
    if (!best || count > best.detectiveCount) {
      best = { player: stat.player, detectiveCount: count };
    }
  }
  return best;
}

function buildVoteHeatmap(history: IntrusRoundRecord[], players: Player[], votes: Vote[]): SummaryHeatCell[] {
  const playerById = new Map(players.map((player) => [player.id, player]));
  const historyByPairId = new Map(history.map((round) => [round.pairId, round]));
  const pairs = new Map<string, { from: Player; to: Player; rounds: number; correct: number }>();
  const totalsByVoter = new Map<string, number>();
  for (const vote of votes) {
    if (!vote.selected_player_id) continue;
    const round = historyByPairId.get(vote.question_id);
    if (!round) continue;
    const from = playerById.get(vote.voter_player_id);
    const to = playerById.get(vote.selected_player_id);
    if (!from || !to || from.id === to.id) continue;
    const key = `${from.id}:${to.id}`;
    const cell = pairs.get(key) ?? { from, to, rounds: 0, correct: 0 };
    cell.rounds += 1;
    if (vote.selected_player_id === round.intrusPlayerId) cell.correct += 1;
    pairs.set(key, cell);
    totalsByVoter.set(from.id, (totalsByVoter.get(from.id) ?? 0) + 1);
  }

  if (pairs.size > 0) {
    return [...pairs.values()]
      .map((cell): SummaryHeatCell => ({
        from: cell.from,
        to: cell.to,
        value: cell.rounds,
        percent: Math.round((cell.rounds / Math.max(1, totalsByVoter.get(cell.from.id) ?? cell.rounds)) * 100),
        metricLabel: cell.correct ? `${cell.correct}/${cell.rounds}` : `×${cell.rounds}`,
        detail: cell.correct
          ? `${cell.from.name} a accusé ${cell.to.name} ${cell.rounds} fois, dont ${cell.correct} bonne${cell.correct > 1 ? "s" : ""} accusation${cell.correct > 1 ? "s" : ""}.`
          : `${cell.from.name} a accusé ${cell.to.name} ${cell.rounds} fois.`,
      }))
      .sort((a, b) => b.value - a.value || b.percent - a.percent)
      .slice(0, 12);
  }

  const pairsFromHistory = new Map<string, { from: Player; to: Player; rounds: number }>();
  for (const round of history) {
    const intrus = playerById.get(round.intrusPlayerId);
    if (!intrus) continue;
    for (const clue of round.clues) {
      if (clue.playerId === intrus.id) continue;
      const accuser = playerById.get(clue.playerId);
      if (!accuser) continue;
      if (round.topVotedPlayerId !== intrus.id) continue;
      const key = `${accuser.id}:${intrus.id}`;
      const cell = pairsFromHistory.get(key) ?? { from: accuser, to: intrus, rounds: 0 };
      cell.rounds += 1;
      pairsFromHistory.set(key, cell);
    }
  }
  return [...pairsFromHistory.values()]
    .map((cell): SummaryHeatCell => ({
      from: cell.from,
      to: cell.to,
      value: cell.rounds,
      percent: Math.min(100, cell.rounds * 25),
      metricLabel: `×${cell.rounds}`,
      detail: `${cell.from.name} a démasqué ${cell.to.name} ${cell.rounds} fois.`,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 12);
}

function buildIntrusRelationInsights(
  history: IntrusRoundRecord[],
  players: Player[],
  detective: DetectiveRow | null
): string[] {
  if (history.length === 0) return ["Lancez une manche pour commencer à révéler les relations."];
  const playerById = new Map(players.map((player) => [player.id, player]));
  const insights: string[] = [];
  if (detective) {
    insights.push(`${detective.player.name} est le plus efficace pour repérer l'intrus.`);
  }
  const survivors = history.filter((round) => !round.intrusFound);
  if (survivors.length > 0) {
    const survivor = playerById.get(survivors[survivors.length - 1].intrusPlayerId);
    if (survivor) {
      insights.push(`${survivor.name} a réussi à passer entre les mailles au moins une fois.`);
    }
  }
  const lastRound = history[history.length - 1];
  if (lastRound) {
    const intrus = playerById.get(lastRound.intrusPlayerId);
    if (intrus) {
      insights.push(
        lastRound.intrusFound
          ? `Dernier coup : ${intrus.name} a été démasqué sur "${lastRound.mainWord}".`
          : `Dernier coup : ${intrus.name} a survécu sur "${lastRound.mainWord}".`
      );
    }
  }
  return insights.length ? insights : ["Pas encore assez de manches pour dégager une dynamique."];
}

function buildIntrusRareMoments(history: IntrusRoundRecord[], players: Player[]): SummaryRareMoment[] {
  const moments: SummaryRareMoment[] = [];
  const playerById = new Map(players.map((player) => [player.id, player]));
  for (const round of history) {
    if (round.finaleCorrect === true) {
      const intrus = playerById.get(round.intrusPlayerId);
      moments.push({
        title: "Bluff parfait",
        detail: intrus
          ? `${intrus.name} démasqué a deviné "${round.mainWord}" lors de la manche ${round.roundNumber}.`
          : `L'intrus a rattrapé son sort sur "${round.mainWord}".`,
        tone: "gold",
      });
    } else if (!round.intrusFound) {
      const intrus = playerById.get(round.intrusPlayerId);
      if (intrus) {
        moments.push({
          title: "Survie totale",
          detail: `${intrus.name} a tenu sans se trahir : "${round.intrusWord}" contre "${round.mainWord}".`,
          tone: "pink",
        });
      }
    }
  }
  if (!moments.length && history.length) {
    moments.push({
      title: "Manches propres",
      detail: "Toutes les manches se sont jouées sans coup d'éclat.",
      tone: "ghost",
    });
  }
  return moments.slice(0, 4);
}

function buildIntrusRecapLines({
  leader,
  survivor,
  unmasked,
  detective,
  rareMoments,
  roundsPlayed,
}: {
  leader: SummaryScoreRow | null;
  survivor: IntrusPlayerStats | null;
  unmasked: IntrusPlayerStats | null;
  detective: DetectiveRow | null;
  rareMoments: SummaryRareMoment[];
  roundsPlayed: number;
}): string[] {
  if (roundsPlayed === 0) {
    return ["Aucune manche jouée — le bilan est vide."];
  }
  const lines: string[] = [];
  if (leader) lines.push(`${leader.player.name} termine en tête avec ${leader.score} points.`);
  if (survivor) lines.push(`${survivor.player.name} a survécu ${survivor.intrusSurvivedCount} fois en tant qu'intrus.`);
  if (detective) lines.push(`${detective.player.name} aide le groupe à démasquer l'intrus à répétition.`);
  if (unmasked) lines.push(`${unmasked.player.name} s'est fait épingler ${unmasked.intrusFoundCount} fois.`);
  if (rareMoments[0]) lines.push(rareMoments[0].detail);
  return lines.length ? lines : ["La table a joué, mais aucun fait marquant ne ressort."];
}
