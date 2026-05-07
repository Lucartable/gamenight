import type { AskedQuestion, GameType, MimeGameState, Player, Vote } from "@/types/database";
import { getQuestionForGame } from "./gameQuestions";
import { computePredictionScores, isPredictionGame } from "./scoring";

export type SummaryTone = "gold" | "cyan" | "pink" | "green" | "purple" | "ghost" | "danger";

export interface SummaryScoreRow {
  player: Player;
  rank: number;
  score: number;
  scoreLabel: string;
  detail: string;
  tone: SummaryTone;
}

export interface SummarySpotlight {
  id: string;
  label: string;
  title: string;
  player: Player | null;
  value: string;
  detail: string;
  tone: SummaryTone;
}

export interface SummaryHeatCell {
  from: Player;
  to: Player;
  value: number;
  percent: number;
}

export interface SummaryRareMoment {
  title: string;
  detail: string;
  tone: SummaryTone;
}

export interface EndGameSummary {
  title: string;
  subtitle: string;
  roundsPlayed: number;
  totalVotes: number;
  leader: SummaryScoreRow | null;
  scoreboard: SummaryScoreRow[];
  spotlights: SummarySpotlight[];
  heatmapMode: "targets" | "alliances" | "mime" | "empty";
  heatmap: SummaryHeatCell[];
  relationInsights: string[];
  rareMoments: SummaryRareMoment[];
  recapLines: string[];
}

interface BuildSummaryInput {
  gameType: GameType | null | undefined;
  players: Player[];
  votes: Vote[];
  askedQuestions: AskedQuestion[];
  mimeGameState: MimeGameState | null;
}

interface RoundOptionStats {
  questionId: number;
  total: number;
  counts: Map<string, number>;
  maxCount: number;
  minPositiveCount: number;
  majorityOptions: Set<string>;
  rareOptions: Set<string>;
}

export function buildEndGameSummary({
  gameType,
  players,
  votes,
  askedQuestions,
  mimeGameState,
}: BuildSummaryInput): EndGameSummary {
  const activePlayers = [...players].sort((a, b) => a.name.localeCompare(b.name));
  const playerById = new Map(activePlayers.map((player) => [player.id, player]));
  const gameVotes = gameType ? votes.filter((vote) => vote.game_type === gameType) : votes;
  const askedForGame = gameType
    ? askedQuestions.filter((asked) => asked.game_type === gameType)
    : askedQuestions;
  const voteRounds = unique(gameVotes.map((vote) => vote.question_id));
  const roundsPlayed = gameType === "mime_expressions"
    ? mimeGameState?.mimeHistory.length ?? mimeGameState?.roundNumber ?? 0
    : Math.max(voteRounds.length, askedForGame.length);

  const targetVotes = gameVotes.filter((vote) => vote.selected_player_id && playerById.has(vote.selected_player_id));
  const targetCountByPlayer = countBy(activePlayers.map((player) => player.id), targetVotes.map((vote) => vote.selected_player_id ?? ""));
  const castCountByPlayer = countBy(activePlayers.map((player) => player.id), gameVotes.map((vote) => vote.voter_player_id));
  const optionRoundStats = buildOptionRoundStats(gameType, gameVotes, playerById);
  const majorityHits = new Map(activePlayers.map((player) => [player.id, 0]));
  const minorityChoices = new Map(activePlayers.map((player) => [player.id, 0]));
  const rareChoices = new Map(activePlayers.map((player) => [player.id, 0]));
  const soloChoices = new Map(activePlayers.map((player) => [player.id, 0]));
  const majorityStreaks = new Map(activePlayers.map((player) => [player.id, 0]));
  const bestMajorityStreaks = new Map(activePlayers.map((player) => [player.id, 0]));

  for (const [questionId, round] of optionRoundStats) {
    const votesForRound = gameVotes.filter((vote) => vote.question_id === questionId && vote.selected_option);
    const votedIds = new Set<string>();
    for (const vote of votesForRound) {
      if (!playerById.has(vote.voter_player_id) || !vote.selected_option) continue;
      votedIds.add(vote.voter_player_id);
      const selectedCount = round.counts.get(vote.selected_option) ?? 0;
      if (round.majorityOptions.has(vote.selected_option)) {
        increment(majorityHits, vote.voter_player_id);
        const nextStreak = (majorityStreaks.get(vote.voter_player_id) ?? 0) + 1;
        majorityStreaks.set(vote.voter_player_id, nextStreak);
        bestMajorityStreaks.set(vote.voter_player_id, Math.max(bestMajorityStreaks.get(vote.voter_player_id) ?? 0, nextStreak));
      } else {
        increment(minorityChoices, vote.voter_player_id);
        majorityStreaks.set(vote.voter_player_id, 0);
      }
      if (round.rareOptions.has(vote.selected_option)) increment(rareChoices, vote.voter_player_id);
      if (selectedCount === 1 && round.total > 1) increment(soloChoices, vote.voter_player_id);
    }
    for (const player of activePlayers) {
      if (!votedIds.has(player.id)) majorityStreaks.set(player.id, 0);
    }
  }

  const mimeCounts = countBy(
    activePlayers.map((player) => player.id),
    mimeGameState?.mimeHistory.map((entry) => entry.mimePlayerId) ?? []
  );
  const sameChoicePairs = buildSameChoicePairs(gameVotes, playerById);
  const targetPairs = buildTargetPairs(targetVotes, playerById);

  const scoreboard = buildScoreboard({
    gameType,
    players: activePlayers,
    votes: gameVotes,
    targetCountByPlayer,
    majorityHits,
    rareChoices,
    mimeCounts,
  });
  const leader = scoreboard[0] ?? null;
  const spotlights = buildSpotlights({
    players: activePlayers,
    roundsPlayed,
    targetCountByPlayer,
    castCountByPlayer,
    majorityHits,
    minorityChoices,
    rareChoices,
    soloChoices,
    bestMajorityStreaks,
  });
  const relationInsights = buildRelationInsights({
    players: activePlayers,
    targetPairs,
    sameChoicePairs,
    targetCountByPlayer,
    gameVotes,
  });
  const rareMoments = buildRareMoments(optionRoundStats, gameVotes, playerById);
  const heatmapMode =
    targetPairs.length > 0
      ? "targets"
      : sameChoicePairs.length > 0
        ? "alliances"
        : gameType === "mime_expressions" && (mimeGameState?.mimeHistory.length ?? 0) > 0
          ? "mime"
          : "empty";
  const heatmap = heatmapMode === "targets"
    ? targetPairs
    : heatmapMode === "alliances"
      ? sameChoicePairs
      : buildMimeHeatmap(activePlayers, mimeGameState);

  return {
    title: leader ? `${leader.player.name} fait trembler le classement` : "Bilan de soirée",
    subtitle: buildSubtitle(gameType, roundsPlayed, gameVotes.length),
    roundsPlayed,
    totalVotes: gameVotes.length,
    leader,
    scoreboard,
    spotlights,
    heatmapMode,
    heatmap,
    relationInsights,
    rareMoments,
    recapLines: buildRecapLines({ leader, spotlights, relationInsights, rareMoments, roundsPlayed }),
  };
}

function buildScoreboard({
  gameType,
  players,
  votes,
  targetCountByPlayer,
  majorityHits,
  rareChoices,
  mimeCounts,
}: {
  gameType: GameType | null | undefined;
  players: Player[];
  votes: Vote[];
  targetCountByPlayer: Map<string, number>;
  majorityHits: Map<string, number>;
  rareChoices: Map<string, number>;
  mimeCounts: Map<string, number>;
}): SummaryScoreRow[] {
  if (gameType && isPredictionGame(gameType)) {
    return computePredictionScores(gameType, players, votes, null).map((row, index) => ({
      player: row.player,
      rank: index + 1,
      score: row.points,
      scoreLabel: "pts",
      detail: `${row.votesCast} vote${row.votesCast > 1 ? "s" : ""} joués`,
      tone: index === 0 ? "gold" : "cyan",
    }));
  }

  const rows = players.map((player) => {
    const targetVotes = targetCountByPlayer.get(player.id) ?? 0;
    const majority = majorityHits.get(player.id) ?? 0;
    const rare = rareChoices.get(player.id) ?? 0;
    const mime = mimeCounts.get(player.id) ?? 0;
    const score =
      gameType === "who_of_us"
        ? targetVotes
        : gameType === "mime_expressions"
          ? mime
          : majority * 2 + rare;
    const scoreLabel =
      gameType === "who_of_us"
        ? "votes"
        : gameType === "mime_expressions"
          ? "mimes"
          : "impact";
    const detail =
      gameType === "who_of_us"
        ? `${targetVotes} désignation${targetVotes > 1 ? "s" : ""} reçue${targetVotes > 1 ? "s" : ""}`
        : gameType === "mime_expressions"
          ? `${mime} passage${mime > 1 ? "s" : ""} au mime`
          : `${majority} fois avec le groupe`;
    return { player, score, scoreLabel, detail };
  });

  return rows
    .sort((a, b) => b.score - a.score || a.player.name.localeCompare(b.player.name))
    .map((row, index) => ({
      ...row,
      rank: index + 1,
      tone: index === 0 ? "gold" : index === 1 ? "cyan" : index === 2 ? "pink" : "purple",
    }));
}

function buildSpotlights({
  players,
  roundsPlayed,
  targetCountByPlayer,
  castCountByPlayer,
  majorityHits,
  minorityChoices,
  rareChoices,
  soloChoices,
  bestMajorityStreaks,
}: {
  players: Player[];
  roundsPlayed: number;
  targetCountByPlayer: Map<string, number>;
  castCountByPlayer: Map<string, number>;
  majorityHits: Map<string, number>;
  minorityChoices: Map<string, number>;
  rareChoices: Map<string, number>;
  soloChoices: Map<string, number>;
  bestMajorityStreaks: Map<string, number>;
}): SummarySpotlight[] {
  const mostVoted = maxPlayer(players, targetCountByPlayer);
  const majority = maxPlayer(players, majorityHits);
  const unpredictable = maxPlayer(players, minorityChoices);
  const chaos = maxPlayer(players, rareChoices, soloChoices);
  const invisible = minPlayer(players, targetCountByPlayer, castCountByPlayer);
  const controversial = mostVoted?.value ? mostVoted : maxPlayer(players, castCountByPlayer);
  const sheepRate = majority?.player && roundsPlayed > 0 ? Math.round((majority.value / Math.max(1, castCountByPlayer.get(majority.player.id) ?? roundsPlayed)) * 100) : 0;

  return [
    {
      id: "most-voted",
      label: "Joueur le plus voté",
      title: mostVoted?.player ? "Aimant à accusations" : "Pas encore de cible",
      player: mostVoted?.player ?? null,
      value: mostVoted?.player ? `${mostVoted.value}` : "0",
      detail: mostVoted?.player ? `${mostVoted.player.name} a été choisi ${mostVoted.value} fois.` : "Aucun vote nominatif sur cette partie.",
      tone: "gold",
    },
    {
      id: "majority-master",
      label: "Dans la majorité",
      title: majority?.player ? "Radar collectif" : "Majorité introuvable",
      player: majority?.player ?? null,
      value: majority?.player ? `${sheepRate}%` : "0%",
      detail: majority?.player ? `${majority.player.name} colle au groupe avec un streak max de ${bestMajorityStreaks.get(majority.player.id) ?? 0}.` : "Pas assez de votes comparables.",
      tone: "cyan",
    },
    {
      id: "unpredictable",
      label: "Joueur imprévisible",
      title: unpredictable?.player ? "Anti-NPC" : "Tout le monde est sage",
      player: unpredictable?.player ?? null,
      value: unpredictable?.player ? `${unpredictable.value}` : "0",
      detail: unpredictable?.player ? `${unpredictable.player.name} s'est éloigné du groupe ${unpredictable.value} fois.` : "Aucune vraie divergence détectée.",
      tone: "purple",
    },
    {
      id: "sheep",
      label: "Mouton officiel",
      title: majority?.player ? "Synchronisé au groupe" : "Pas de troupeau",
      player: majority?.player ?? null,
      value: majority?.player ? `${majority.value}` : "0",
      detail: majority?.player ? `${majority.player.name} suit le tempo collectif sans trembler.` : "Le groupe n'a pas assez voté pareil.",
      tone: "green",
    },
    {
      id: "chaos",
      label: "Agent du chaos",
      title: chaos?.player ? "Détonateur social" : "Chaos contenu",
      player: chaos?.player ?? null,
      value: chaos?.player ? `${chaos.value}` : "0",
      detail: chaos?.player ? `${chaos.player.name} a signé les choix les plus rares.` : "Aucun choix vraiment explosif.",
      tone: "danger",
    },
    {
      id: "controversial",
      label: "Plus controversé",
      title: controversial?.player ? "Dossier sensible" : "Calme plat",
      player: controversial?.player ?? null,
      value: controversial?.player ? `${controversial.value}` : "0",
      detail: controversial?.player ? `Impossible de ne pas parler de ${controversial.player.name}.` : "Aucune controverse mesurable.",
      tone: "pink",
    },
    {
      id: "invisible",
      label: "Invisible",
      title: invisible?.player ? "Mode furtif" : "Personne n'a disparu",
      player: invisible?.player ?? null,
      value: invisible?.player ? `${invisible.value}` : "0",
      detail: invisible?.player ? `${invisible.player.name} a traversé la soirée en silence radio.` : "Tout le monde a laissé des traces.",
      tone: "ghost",
    },
  ];
}

function buildOptionRoundStats(
  gameType: GameType | null | undefined,
  votes: Vote[],
  playerById: Map<string, Player>
): Map<number, RoundOptionStats> {
  const byQuestion = new Map<number, Vote[]>();
  for (const vote of votes) {
    if (!vote.selected_option || !playerById.has(vote.voter_player_id)) continue;
    byQuestion.set(vote.question_id, [...(byQuestion.get(vote.question_id) ?? []), vote]);
  }

  const output = new Map<number, RoundOptionStats>();
  for (const [questionId, questionVotes] of byQuestion) {
    const question = gameType ? getQuestionForGame(gameType, questionId) : undefined;
    const validOptions = question && "options" in question
      ? question.options
      : question && "optionA" in question
        ? ["A", "B"]
        : unique(questionVotes.map((vote) => vote.selected_option).filter((option): option is string => Boolean(option)));
    const counts = new Map(validOptions.map((option) => [option, 0]));
    for (const vote of questionVotes) {
      if (!vote.selected_option) continue;
      counts.set(vote.selected_option, (counts.get(vote.selected_option) ?? 0) + 1);
    }
    const values = [...counts.values()];
    const positive = values.filter((value) => value > 0);
    const maxCount = Math.max(0, ...values);
    const minPositiveCount = positive.length ? Math.min(...positive) : 0;
    output.set(questionId, {
      questionId,
      total: questionVotes.length,
      counts,
      maxCount,
      minPositiveCount,
      majorityOptions: new Set([...counts.entries()].filter(([, count]) => count > 0 && count === maxCount).map(([option]) => option)),
      rareOptions: new Set([...counts.entries()].filter(([, count]) => count > 0 && count === minPositiveCount).map(([option]) => option)),
    });
  }
  return output;
}

function buildTargetPairs(votes: Vote[], playerById: Map<string, Player>): SummaryHeatCell[] {
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

function buildSameChoicePairs(votes: Vote[], playerById: Map<string, Player>): SummaryHeatCell[] {
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

function buildMimeHeatmap(players: Player[], state: MimeGameState | null): SummaryHeatCell[] {
  if (!state) return [];
  const playerById = new Map(players.map((player) => [player.id, player]));
  const counts = countBy(players.map((player) => player.id), state.mimeHistory.map((entry) => entry.mimePlayerId));
  return players
    .map((player) => ({
      from: player,
      to: player,
      value: counts.get(player.id) ?? 0,
      percent: Math.round(((counts.get(player.id) ?? 0) / Math.max(1, state.mimeHistory.length)) * 100),
    }))
    .filter((cell) => playerById.has(cell.from.id) && cell.value > 0)
    .sort((a, b) => b.value - a.value);
}

function buildRelationInsights({
  targetPairs,
  sameChoicePairs,
  targetCountByPlayer,
  players,
}: {
  players: Player[];
  targetPairs: SummaryHeatCell[];
  sameChoicePairs: SummaryHeatCell[];
  targetCountByPlayer: Map<string, number>;
  gameVotes: Vote[];
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
  const invisible = players.find((player) => (targetCountByPlayer.get(player.id) ?? 0) === 0);
  if (invisible) lines.push(`Personne ne choisit ${invisible.name}. Profil ninja confirmé.`);
  if (!lines.length) lines.push("La soirée manque encore de preuves, mais les soupçons montent.");
  return lines.slice(0, 4);
}

function buildRareMoments(
  rounds: Map<number, RoundOptionStats>,
  votes: Vote[],
  playerById: Map<string, Player>
): SummaryRareMoment[] {
  const moments: SummaryRareMoment[] = [];
  for (const round of rounds.values()) {
    if (round.total >= 3 && round.maxCount === round.total) {
      moments.push({ title: "Unanimité totale", detail: `Tout le monde a choisi pareil sur une manche. C'est presque inquiétant.`, tone: "gold" });
    }
    const positiveCounts = [...round.counts.values()].filter((count) => count > 0);
    if (positiveCounts.length >= 2 && positiveCounts.every((count) => count === positiveCounts[0])) {
      moments.push({ title: "Égalité parfaite", detail: "Le groupe s'est coupé en parts égales. Aucun camp ne lâche.", tone: "cyan" });
    }
    if (round.total >= 3 && round.minPositiveCount === 1) {
      const soloVote = votes.find(
        (vote) => vote.question_id === round.questionId && vote.selected_option && (round.counts.get(vote.selected_option) ?? 0) === 1
      );
      const player = soloVote ? playerById.get(soloVote.voter_player_id) : null;
      moments.push({ title: "Seul contre tous", detail: `${player?.name ?? "Quelqu'un"} a choisi l'option solitaire. Respect ou inquiétude.`, tone: "danger" });
    }
  }
  return uniqueBy(moments, (moment) => moment.title).slice(0, 5);
}

function buildRecapLines({
  leader,
  spotlights,
  relationInsights,
  rareMoments,
  roundsPlayed,
}: {
  leader: SummaryScoreRow | null;
  spotlights: SummarySpotlight[];
  relationInsights: string[];
  rareMoments: SummaryRareMoment[];
  roundsPlayed: number;
}): string[] {
  const chaos = spotlights.find((spotlight) => spotlight.id === "chaos");
  return [
    leader ? `${leader.player.name} sort en tête après ${roundsPlayed} manche${roundsPlayed > 1 ? "s" : ""}.` : "Aucun vainqueur net, mais beaucoup de matière.",
    chaos?.player ? `${chaos.player.name} repart avec l'étiquette chaos.` : "Le chaos est resté poli.",
    relationInsights[0] ?? "Les alliances restent à confirmer.",
    rareMoments[0]?.title ? `Moment rare : ${rareMoments[0].title}.` : "Aucun événement rarissime, juste du désordre normal.",
  ];
}

function buildSubtitle(gameType: GameType | null | undefined, rounds: number, votes: number): string {
  const label =
    gameType === "who_would"
      ? "Tu préfères"
      : gameType === "who_of_us"
        ? "Qui de nous ?"
        : gameType === "majority"
          ? "Majorité"
          : gameType === "minority"
            ? "Minorité"
            : gameType === "mime_expressions"
              ? "Mime les expressions"
              : "Partie";
  return `${label} · ${rounds} manche${rounds > 1 ? "s" : ""} · ${votes} vote${votes > 1 ? "s" : ""} analysé${votes > 1 ? "s" : ""}`;
}

function maxPlayer(players: Player[], primary: Map<string, number>, secondary?: Map<string, number>) {
  const rows = players
    .map((player) => ({
      player,
      value: (primary.get(player.id) ?? 0) + (secondary?.get(player.id) ?? 0),
    }))
    .sort((a, b) => b.value - a.value || a.player.name.localeCompare(b.player.name));
  return rows[0]?.value ? rows[0] : null;
}

function minPlayer(players: Player[], primary: Map<string, number>, fallback: Map<string, number>) {
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

function countBy(keys: string[], values: string[]): Map<string, number> {
  const counts = new Map(keys.map((key) => [key, 0]));
  for (const value of values) {
    if (!value) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return counts;
}

function increment(map: Map<string, number>, key: string): void {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

function uniqueBy<T>(items: T[], getKey: (item: T) => string): T[] {
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

