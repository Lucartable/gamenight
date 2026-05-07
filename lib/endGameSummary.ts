import type { AskedQuestion, GameType, JaugeGameState, MimeGameState, Player, Rating, Vote } from "@/types/database";
import { getQuestionForGame } from "./gameQuestions";
import { computePredictionScores, isPredictionGame } from "./scoring";

export type SummaryTone = "gold" | "cyan" | "pink" | "green" | "purple" | "ghost" | "danger";
export type SummaryProfile = "mime" | "social_vote" | "duel" | "prediction" | "rating" | "generic";

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
  detail?: string;
  metricLabel?: string;
}

export interface SummaryRareMoment {
  title: string;
  detail: string;
  tone: SummaryTone;
}

export interface EndGameSummary {
  profile: SummaryProfile;
  title: string;
  subtitle: string;
  leaderLabel: string;
  sectionLabels: SummarySectionLabels;
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

export interface SummarySectionLabels {
  scoreboardEyebrow: string;
  scoreboardTitle: string;
  scoreboardPill: string;
  scoreboardEmpty: string;
  spotlightsEyebrow: string;
  spotlightsTitle: string;
  heatmapEyebrow: string;
  heatmapTitle: string;
  heatmapEmpty: string;
  rareEyebrow: string;
  rareTitle: string;
  rareFallbackTitle: string;
  rareFallbackDetail: string;
  recapEyebrow: string;
  recapTitle: string;
}

interface BuildSummaryInput {
  gameType: GameType | null | undefined;
  players: Player[];
  votes: Vote[];
  ratings?: Rating[];
  askedQuestions: AskedQuestion[];
  roundQuestionIds?: number[];
  mimeGameState: MimeGameState | null;
  jaugeGameState?: JaugeGameState | null;
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
  ratings = [],
  askedQuestions,
  roundQuestionIds = [],
  mimeGameState,
  jaugeGameState = null,
}: BuildSummaryInput): EndGameSummary {
  const activePlayers = [...players].sort((a, b) => a.name.localeCompare(b.name));
  const playerById = new Map(activePlayers.map((player) => [player.id, player]));
  const gameVotes = gameType ? votes.filter((vote) => vote.game_type === gameType) : votes;
  const gameRatings = gameType === "jauge" ? ratings.filter((rating) => rating.game_type === "jauge") : [];
  const askedForGame = gameType
    ? askedQuestions.filter((asked) => asked.game_type === gameType)
    : askedQuestions;
  if (gameType === "jauge") {
    return buildJaugeSummary({
      players: activePlayers,
      ratings: gameRatings,
      askedForGame,
      roundQuestionIds,
      jaugeGameState,
    });
  }
  const currentRoundIds = unique(roundQuestionIds.filter((id) => Number.isFinite(id) && id > 0));
  const voteRounds = unique(gameVotes.map((vote) => vote.question_id));
  const roundsPlayed = gameType === "mime_expressions"
    ? mimeGameState?.mimeHistory.length ?? mimeGameState?.roundNumber ?? 0
    : currentRoundIds.length
      ? Math.max(voteRounds.length, currentRoundIds.length)
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
  const spotlights = buildModeSpotlights({
    gameType,
    players: activePlayers,
    roundsPlayed,
    targetCountByPlayer,
    castCountByPlayer,
    majorityHits,
    minorityChoices,
    rareChoices,
    soloChoices,
    bestMajorityStreaks,
    targetPairs,
    sameChoicePairs,
    optionRoundStats,
    mimeCounts,
    mimeGameState,
  });
  const relationInsights = gameType === "mime_expressions"
    ? buildMimeInsights(activePlayers, mimeGameState, mimeCounts)
    : buildRelationInsights({
      gameType,
      players: activePlayers,
      targetPairs,
      sameChoicePairs,
      targetCountByPlayer,
      gameVotes,
    });
  const rareMoments = gameType === "mime_expressions"
    ? buildMimeRareMoments(activePlayers, mimeGameState, mimeCounts)
    : buildRareMoments(optionRoundStats, gameVotes, playerById);
  const heatmapMode =
    gameType === "mime_expressions" && (mimeGameState?.playerOrder.length ?? 0) > 0
      ? "mime"
      : targetPairs.length > 0
      ? "targets"
      : sameChoicePairs.length > 0
        ? "alliances"
        : "empty";
  const heatmap = heatmapMode === "targets"
    ? targetPairs
    : heatmapMode === "alliances"
      ? sameChoicePairs
      : buildMimeHeatmap(activePlayers, mimeGameState);
  const profile = getSummaryProfile(gameType);
  const sectionLabels = getSectionLabels(profile);

  return {
    profile,
    title: buildTitle(gameType, leader, roundsPlayed, mimeGameState, activePlayers),
    subtitle: buildSubtitle(gameType, roundsPlayed, gameVotes.length, activePlayers, mimeGameState),
    leaderLabel: getLeaderLabel(profile),
    sectionLabels,
    roundsPlayed,
    totalVotes: gameVotes.length,
    leader,
    scoreboard,
    spotlights,
    heatmapMode,
    heatmap,
    relationInsights,
    rareMoments,
    recapLines: buildRecapLines({ gameType, leader, spotlights, relationInsights, rareMoments, roundsPlayed }),
  };
}

interface JaugePlayerStats {
  player: Player;
  received: Rating[];
  given: Rating[];
  averageReceived: number;
  averageGiven: number;
  spreadReceived: number;
  extremeGiven: number;
}

function buildJaugeSummary({
  players,
  ratings,
  askedForGame,
  roundQuestionIds,
  jaugeGameState,
}: {
  players: Player[];
  ratings: Rating[];
  askedForGame: AskedQuestion[];
  roundQuestionIds: number[];
  jaugeGameState: JaugeGameState | null;
}): EndGameSummary {
  const playerById = new Map(players.map((player) => [player.id, player]));
  const visibleRatings = ratings.filter((rating) => playerById.has(rating.voter_player_id) && playerById.has(rating.target_player_id));
  const roundIds = unique([...roundQuestionIds, ...visibleRatings.map((rating) => rating.question_id)].filter((id) => Number.isFinite(id) && id !== 0));
  const roundsPlayed = Math.max(roundIds.length, askedForGame.length, jaugeGameState?.roundNumber ?? 0);
  const stats = players.map((player) => buildJaugePlayerStats(player, visibleRatings));
  const rankedTargets = stats
    .filter((row) => row.received.length > 0)
    .sort((a, b) => b.averageReceived - a.averageReceived || b.received.length - a.received.length || a.player.name.localeCompare(b.player.name));
  const leaderStats = rankedTargets[0] ?? null;
  const scoreboard: SummaryScoreRow[] = rankedTargets.map((row, index) => ({
    player: row.player,
    rank: index + 1,
    score: Math.round(row.averageReceived * 10),
    scoreLabel: "/100",
    detail: `${formatRating(row.averageReceived)}/10 sur ${row.received.length} note${row.received.length > 1 ? "s" : ""}`,
    tone: index === 0 ? "gold" : index === 1 ? "cyan" : index === 2 ? "pink" : "purple",
  }));
  const leader = scoreboard[0] ?? null;
  const mostControversial = [...stats]
    .filter((row) => row.received.length > 1)
    .sort((a, b) => b.spreadReceived - a.spreadReceived || b.received.length - a.received.length)[0] ?? null;
  const generous = [...stats]
    .filter((row) => row.given.length > 0)
    .sort((a, b) => b.averageGiven - a.averageGiven || b.given.length - a.given.length)[0] ?? null;
  const severe = [...stats]
    .filter((row) => row.given.length > 0)
    .sort((a, b) => a.averageGiven - b.averageGiven || b.given.length - a.given.length)[0] ?? null;
  const extreme = [...stats]
    .filter((row) => row.given.length > 0)
    .sort((a, b) => b.extremeGiven - a.extremeGiven || b.given.length - a.given.length)[0] ?? null;
  const invisible = [...stats]
    .sort((a, b) => a.received.length - b.received.length || a.averageReceived - b.averageReceived || a.player.name.localeCompare(b.player.name))[0] ?? null;
  const underrated = rankedTargets[rankedTargets.length - 1] ?? null;
  const heatmap = buildJaugeHeatmap(players, visibleRatings);
  const canRevealAuthors = jaugeGameState?.anonymityMode !== "anonymous";
  const relationInsights = canRevealAuthors
    ? buildJaugeRelationInsights(heatmap, generous, severe)
    : ["Anonymat permanent activé : les relations de notes restent enterrées."];
  const rareMoments = buildJaugeRareMoments(players, visibleRatings, rankedTargets, mostControversial);
  const spotlights: SummarySpotlight[] = [
    {
      id: "best-average",
      label: "Meilleure moyenne",
      title: leaderStats ? "Réputation validée" : "Pas encore noté",
      player: leaderStats?.player ?? null,
      value: leaderStats ? `${formatRating(leaderStats.averageReceived)}/10` : "0",
      detail: leaderStats
        ? `${leaderStats.player.name} sort avec la meilleure jauge du groupe.`
        : "Aucune note exploitable pour départager la table.",
      tone: "gold",
    },
    {
      id: "controversial-rating",
      label: "Le plus controversé",
      title: mostControversial ? "Table coupée en deux" : "Avis plutôt sages",
      player: mostControversial?.player ?? null,
      value: mostControversial ? `${mostControversial.spreadReceived}` : "0",
      detail: mostControversial
        ? `${mostControversial.player.name} a déclenché l'écart de notes le plus violent.`
        : "Pas assez d'écarts pour créer un vrai débat.",
      tone: mostControversial && mostControversial.spreadReceived >= 6 ? "danger" : "pink",
    },
    {
      id: "generous",
      label: "Juge généreux",
      title: generous ? "Distribue les 10" : "Personne ne valide",
      player: generous?.player ?? null,
      value: generous ? `${formatRating(generous.averageGiven)}` : "0",
      detail: generous
        ? `${generous.player.name} donne en moyenne ${formatRating(generous.averageGiven)}/10.`
        : "Aucune note donnée.",
      tone: "green",
    },
    {
      id: "severe",
      label: "Juge sévère",
      title: severe ? "Correcteur impitoyable" : "Aucune sévérité",
      player: severe?.player ?? null,
      value: severe ? `${formatRating(severe.averageGiven)}` : "0",
      detail: severe
        ? `${severe.player.name} note en moyenne ${formatRating(severe.averageGiven)}/10.`
        : "Aucune note donnée.",
      tone: "cyan",
    },
    {
      id: "extreme",
      label: "Notes extrêmes",
      title: extreme ? "Zéro nuance" : "Tout est tiède",
      player: extreme?.player ?? null,
      value: extreme ? `${formatRating(extreme.extremeGiven)}` : "0",
      detail: extreme
        ? `${extreme.player.name} s'éloigne le plus du centre de la jauge.`
        : "Pas assez de notes pour mesurer les extrêmes.",
      tone: "purple",
    },
    {
      id: "low-average",
      label: "Le plus détruit",
      title: underrated ? "La table n'a pas cru au dossier" : "Personne au sol",
      player: underrated?.player ?? null,
      value: underrated ? `${formatRating(underrated.averageReceived)}/10` : "0",
      detail: underrated
        ? `${underrated.player.name} reçoit la moyenne la plus basse de la soirée.`
        : "Aucune moyenne basse détectée.",
      tone: underrated && underrated.averageReceived <= 3.5 ? "danger" : "ghost",
    },
    {
      id: "invisible-rating",
      label: "Peu évalué",
      title: invisible && invisible.received.length === 0 ? "Hors radar" : "Présence discrète",
      player: invisible?.player ?? null,
      value: invisible ? `${invisible.received.length}` : "0",
      detail: invisible
        ? `${invisible.player.name} a reçu le moins de passages à la jauge.`
        : "Tout le monde a été évalué.",
      tone: "ghost",
    },
  ];

  return {
    profile: "rating",
    title: leaderStats ? `${leaderStats.player.name} explose la jauge` : "La jauge attend son verdict",
    subtitle: `Jauge · ${roundsPlayed} manche${roundsPlayed > 1 ? "s" : ""} · ${visibleRatings.length} note${visibleRatings.length > 1 ? "s" : ""} analysée${visibleRatings.length > 1 ? "s" : ""}`,
    leaderLabel: "Réputation du soir",
    sectionLabels: getSectionLabels("rating"),
    roundsPlayed,
    totalVotes: visibleRatings.length,
    leader,
    scoreboard,
    spotlights,
    heatmapMode: canRevealAuthors ? "targets" : "empty",
    heatmap: canRevealAuthors ? heatmap : [],
    relationInsights,
    rareMoments,
    recapLines: buildJaugeRecapLines(leaderStats, mostControversial, generous, severe, relationInsights, rareMoments),
  };
}

function buildJaugePlayerStats(player: Player, ratings: Rating[]): JaugePlayerStats {
  const received = ratings.filter((rating) => rating.target_player_id === player.id);
  const given = ratings.filter((rating) => rating.voter_player_id === player.id);
  const receivedValues = received.map((rating) => rating.rating);
  const givenValues = given.map((rating) => rating.rating);
  return {
    player,
    received,
    given,
    averageReceived: average(receivedValues),
    averageGiven: average(givenValues),
    spreadReceived: receivedValues.length > 1 ? Math.max(...receivedValues) - Math.min(...receivedValues) : 0,
    extremeGiven: givenValues.length ? average(givenValues.map((value) => Math.abs(value - 5.5))) : 0,
  };
}

function buildJaugeHeatmap(players: Player[], ratings: Rating[]): SummaryHeatCell[] {
  const playerById = new Map(players.map((player) => [player.id, player]));
  const grouped = new Map<string, Rating[]>();
  for (const rating of ratings) {
    if (rating.voter_player_id === rating.target_player_id) continue;
    const key = `${rating.voter_player_id}:${rating.target_player_id}`;
    grouped.set(key, [...(grouped.get(key) ?? []), rating]);
  }
  return [...grouped.entries()]
    .map(([key, rows]): SummaryHeatCell | null => {
      const [fromId, toId] = key.split(":");
      const from = playerById.get(fromId);
      const to = playerById.get(toId);
      if (!from || !to) return null;
      const avg = average(rows.map((row) => row.rating));
      return {
        from,
        to,
        value: rows.length,
        percent: Math.round(avg * 10),
        metricLabel: `${formatRating(avg)}/10`,
        detail: `${rows.length} note${rows.length > 1 ? "s" : ""}, moyenne ${formatRating(avg)}/10`,
      };
    })
    .filter((cell): cell is SummaryHeatCell => Boolean(cell))
    .sort((a, b) => b.value - a.value || a.percent - b.percent)
    .slice(0, 12);
}

function buildJaugeRelationInsights(
  heatmap: SummaryHeatCell[],
  generous: JaugePlayerStats | null,
  severe: JaugePlayerStats | null
): string[] {
  const harsh = [...heatmap].sort((a, b) => a.percent - b.percent || b.value - a.value)[0];
  const hype = [...heatmap].sort((a, b) => b.percent - a.percent || b.value - a.value)[0];
  const asymmetry = findJaugeAsymmetry(heatmap);
  return [
    harsh ? `${harsh.from.name} est le plus dur avec ${harsh.to.name} : ${harsh.metricLabel}.` : "Aucune sévérité ciblée détectée.",
    hype ? `${hype.from.name} valide fortement ${hype.to.name} : ${hype.metricLabel}.` : "Aucun boost évident entre deux joueurs.",
    asymmetry ?? "Pas de relation asymétrique nette sur cette partie.",
    generous ? `${generous.player.name} a la main la plus généreuse de la table.` : "Aucun juge généreux mesurable.",
    severe ? `${severe.player.name} garde les notes les plus froides.` : "Aucun juge vraiment sévère.",
  ];
}

function findJaugeAsymmetry(heatmap: SummaryHeatCell[]): string | null {
  const byPair = new Map(heatmap.map((cell) => [`${cell.from.id}:${cell.to.id}`, cell]));
  let best: { a: SummaryHeatCell; b: SummaryHeatCell; gap: number } | null = null;
  for (const cell of heatmap) {
    const reverse = byPair.get(`${cell.to.id}:${cell.from.id}`);
    if (!reverse) continue;
    const gap = Math.abs(cell.percent - reverse.percent);
    if (!best || gap > best.gap) best = { a: cell, b: reverse, gap };
  }
  if (!best || best.gap < 30) return null;
  const high = best.a.percent >= best.b.percent ? best.a : best.b;
  const low = high === best.a ? best.b : best.a;
  return `${high.from.name} note ${high.to.name} bien plus haut que l'inverse : ${high.metricLabel} contre ${low.metricLabel}.`;
}

function buildJaugeRareMoments(
  players: Player[],
  ratings: Rating[],
  rankedTargets: JaugePlayerStats[],
  controversial: JaugePlayerStats | null
): SummaryRareMoment[] {
  const perfectTens = ratings.filter((rating) => rating.rating === 10).length;
  const brutalLows = rankedTargets.filter((row) => row.averageReceived > 0 && row.averageReceived <= 3).length;
  const perfectPlayer = rankedTargets.find((row) => row.averageReceived >= 9.5 && row.received.length >= Math.max(1, Math.floor(players.length / 2)));
  const moments: SummaryRareMoment[] = [];
  if (perfectPlayer) {
    moments.push({
      title: "Réputation dorée",
      detail: `${perfectPlayer.player.name} finit presque au plafond avec ${formatRating(perfectPlayer.averageReceived)}/10.`,
      tone: "gold",
    });
  }
  if (perfectTens > 0) {
    moments.push({
      title: "Pluie de 10",
      detail: `${perfectTens} note${perfectTens > 1 ? "s" : ""} maximale${perfectTens > 1 ? "s" : ""} envoyée${perfectTens > 1 ? "s" : ""}.`,
      tone: "green",
    });
  }
  if (controversial && controversial.spreadReceived >= 6) {
    moments.push({
      title: "Écart maximal",
      detail: `${controversial.player.name} déclenche un écart de ${controversial.spreadReceived} points.`,
      tone: "danger",
    });
  }
  if (brutalLows > 0) {
    moments.push({
      title: "Jugement brutal",
      detail: `${brutalLows} moyenne${brutalLows > 1 ? "s" : ""} sous 3/10. La table n'a pas tremblé.`,
      tone: "pink",
    });
  }
  return moments;
}

function buildJaugeRecapLines(
  leader: JaugePlayerStats | null,
  controversial: JaugePlayerStats | null,
  generous: JaugePlayerStats | null,
  severe: JaugePlayerStats | null,
  relationInsights: string[],
  rareMoments: SummaryRareMoment[]
): string[] {
  return [
    leader ? `${leader.player.name} finit avec la meilleure moyenne : ${formatRating(leader.averageReceived)}/10.` : "Pas assez de notes pour désigner une meilleure moyenne.",
    controversial ? `${controversial.player.name} a le plus divisé la table.` : "La table a noté sans énorme fracture.",
    generous && severe && generous.player.id !== severe.player.id
      ? `${generous.player.name} donne haut, ${severe.player.name} note froid.`
      : "Les styles de notation restent assez proches.",
    relationInsights[0] ?? "Aucune relation de notes assez nette.",
    rareMoments[0]?.detail ?? "Aucun moment rare, mais la réputation de chacun a bougé.",
  ];
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
          ? "passages"
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

function buildModeSpotlights({
  gameType,
  players,
  roundsPlayed,
  targetCountByPlayer,
  castCountByPlayer,
  majorityHits,
  minorityChoices,
  rareChoices,
  soloChoices,
  bestMajorityStreaks,
  targetPairs,
  sameChoicePairs,
  optionRoundStats,
  mimeCounts,
  mimeGameState,
}: {
  gameType: GameType | null | undefined;
  players: Player[];
  roundsPlayed: number;
  targetCountByPlayer: Map<string, number>;
  castCountByPlayer: Map<string, number>;
  majorityHits: Map<string, number>;
  minorityChoices: Map<string, number>;
  rareChoices: Map<string, number>;
  soloChoices: Map<string, number>;
  bestMajorityStreaks: Map<string, number>;
  targetPairs: SummaryHeatCell[];
  sameChoicePairs: SummaryHeatCell[];
  optionRoundStats: Map<number, RoundOptionStats>;
  mimeCounts: Map<string, number>;
  mimeGameState: MimeGameState | null;
}): SummarySpotlight[] {
  if (gameType === "mime_expressions") {
    return buildMimeSpotlights(players, mimeGameState, mimeCounts);
  }

  if (gameType === "who_of_us") {
    return buildSocialVoteSpotlights(players, targetCountByPlayer, castCountByPlayer, targetPairs);
  }

  if (gameType === "who_would") {
    return buildDuelSpotlights(players, castCountByPlayer, majorityHits, rareChoices, soloChoices, sameChoicePairs, optionRoundStats);
  }

  if (gameType === "majority" || gameType === "minority") {
    return buildPredictionSpotlights({
      gameType,
      players,
      roundsPlayed,
      castCountByPlayer,
      majorityHits,
      minorityChoices,
      rareChoices,
      soloChoices,
      bestMajorityStreaks,
    });
  }

  return buildGenericSpotlights({
    players,
    roundsPlayed,
    targetCountByPlayer,
    castCountByPlayer,
    majorityHits,
    minorityChoices,
    rareChoices,
    soloChoices,
    bestMajorityStreaks,
  });
}

function buildGenericSpotlights({
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

function buildMimeSpotlights(
  players: Player[],
  state: MimeGameState | null,
  mimeCounts: Map<string, number>
): SummarySpotlight[] {
  const playerById = new Map(players.map((player) => [player.id, player]));
  const history = state?.mimeHistory ?? [];
  const firstRecord = history[0];
  const lastRecord = history[history.length - 1];
  const firstMime = firstRecord ? playerById.get(firstRecord.mimePlayerId) ?? null : null;
  const lastMime = lastRecord ? playerById.get(lastRecord.mimePlayerId) ?? null : null;
  const mostOnStage = maxPlayer(players, mimeCounts);
  const waiting = players.find((player) => (mimeCounts.get(player.id) ?? 0) === 0) ?? null;
  const nextPlayer = getNextMimePlayer(players, state);
  const lastExpression = lastRecord ? getQuestionText("mime_expressions", lastRecord.expressionId) : null;

  return [
    {
      id: "mime-opener",
      label: "Ouverture de scène",
      title: firstMime ? "Premier mime" : "Rideau fermé",
      player: firstMime,
      value: firstMime ? "#1" : "0",
      detail: firstMime
        ? `${firstMime.name} a lancé le show${lastExpression && history.length === 1 ? ` avec "${lastExpression}"` : ""}.`
        : "Aucun passage au mime enregistré.",
      tone: "gold",
    },
    {
      id: "mime-last",
      label: "Dernière expression",
      title: lastExpression ?? "Expression gardée secrète",
      player: lastMime,
      value: history.length ? `${history.length}` : "0",
      detail: lastMime
        ? `${lastMime.name} était sur scène pour la dernière manche jouée.`
        : "La partie n'a pas encore laissé de dernière scène.",
      tone: "cyan",
    },
    {
      id: "mime-spotlight",
      label: "Le plus exposé",
      title: mostOnStage?.player ? "Aimant à spotlight" : "Spotlight disponible",
      player: mostOnStage?.player ?? null,
      value: mostOnStage?.player ? `${mostOnStage.value}` : "0",
      detail: mostOnStage?.player
        ? `${mostOnStage.player.name} a pris la lumière ${mostOnStage.value} fois.`
        : "Personne n'a encore vraiment monopolisé la scène.",
      tone: "pink",
    },
    {
      id: "mime-next",
      label: "Dans la file",
      title: nextPlayer ? "Prochain à surveiller" : "File vide",
      player: nextPlayer,
      value: nextPlayer && state ? `#${Math.max(1, state.playerOrder.indexOf(nextPlayer.id) + 1)}` : "-",
      detail: nextPlayer
        ? `${nextPlayer.name} attend son passage dans l'ordre automatique.`
        : "Aucun prochain joueur détecté dans l'ordre.",
      tone: "purple",
    },
    {
      id: "mime-waiting",
      label: "Encore en coulisses",
      title: waiting ? "Pas encore passé" : "Tout le monde a joué",
      player: waiting,
      value: waiting ? "0" : "OK",
      detail: waiting
        ? `${waiting.name} n'a pas encore eu son moment de mime.`
        : "La rotation a déjà donné une scène à tout le monde.",
      tone: waiting ? "ghost" : "green",
    },
    {
      id: "mime-host-mode",
      label: "Mode hôte",
      title: state?.hostPlayMode ? "Hôte joueur activé" : "Hôte régisseur",
      player: null,
      value: state?.hostPlayMode ? "ON" : "OFF",
      detail: state?.hostPlayMode
        ? "L'hôte ne voit l'expression que quand c'est son tour de mimer."
        : "L'hôte garde la vision complète pour animer la partie.",
      tone: state?.hostPlayMode ? "green" : "cyan",
    },
  ];
}

function buildSocialVoteSpotlights(
  players: Player[],
  targetCountByPlayer: Map<string, number>,
  castCountByPlayer: Map<string, number>,
  targetPairs: SummaryHeatCell[]
): SummarySpotlight[] {
  const mostVoted = maxPlayer(players, targetCountByPlayer);
  const topVoter = maxPlayer(players, castCountByPlayer);
  const invisible = minPlayer(players, targetCountByPlayer, castCountByPlayer);
  const topPair = targetPairs[0];
  const controversial = mostVoted;

  return [
    {
      id: "most-voted",
      label: "Joueur le plus désigné",
      title: mostVoted?.player ? "Aimant à accusations" : "Pas encore de suspect",
      player: mostVoted?.player ?? null,
      value: mostVoted?.player ? `${mostVoted.value}` : "0",
      detail: mostVoted?.player ? `${mostVoted.player.name} a été choisi ${mostVoted.value} fois.` : "Aucun vote nominatif sur cette partie.",
      tone: "gold",
    },
    {
      id: "top-voter",
      label: "Accusateur actif",
      title: topVoter?.player ? "Doigt pointé" : "Personne ne balance",
      player: topVoter?.player ?? null,
      value: topVoter?.player ? `${topVoter.value}` : "0",
      detail: topVoter?.player ? `${topVoter.player.name} a envoyé le plus de votes nominaux.` : "Pas assez de votes envoyés.",
      tone: "cyan",
    },
    {
      id: "favorite-target",
      label: "Fixette sociale",
      title: topPair ? `${topPair.from.name} -> ${topPair.to.name}` : "Aucune fixette",
      player: topPair?.to ?? null,
      value: topPair ? `${topPair.value}` : "0",
      detail: topPair ? `${topPair.from.name} a choisi ${topPair.to.name} dans ${topPair.percent}% de ses votes.` : "Aucune relation assez nette pour accuser quelqu'un.",
      tone: "pink",
    },
    {
      id: "controversial",
      label: "Plus controversé",
      title: controversial?.player ? "Dossier sensible" : "Calme plat",
      player: controversial?.player ?? null,
      value: controversial?.player ? `${controversial.value}` : "0",
      detail: controversial?.player ? `Impossible de ne pas parler de ${controversial.player.name}.` : "Aucune controverse mesurable.",
      tone: "purple",
    },
    {
      id: "invisible",
      label: "Invisible",
      title: invisible?.player ? "Mode furtif" : "Tout le monde est visible",
      player: invisible?.player ?? null,
      value: invisible?.player ? `${invisible.value}` : "0",
      detail: invisible?.player ? `${invisible.player.name} a reçu le moins de désignations.` : "Tout le monde a laissé des traces.",
      tone: "ghost",
    },
  ];
}

function buildDuelSpotlights(
  players: Player[],
  castCountByPlayer: Map<string, number>,
  majorityHits: Map<string, number>,
  rareChoices: Map<string, number>,
  soloChoices: Map<string, number>,
  sameChoicePairs: SummaryHeatCell[],
  rounds: Map<number, RoundOptionStats>
): SummarySpotlight[] {
  const activeVoter = maxPlayer(players, castCountByPlayer);
  const groupReader = maxPlayer(players, majorityHits);
  const solo = maxPlayer(players, soloChoices, rareChoices);
  const alliance = sameChoicePairs[0];
  const tightRounds = [...rounds.values()].filter((round) => {
    const positive = [...round.counts.values()].filter((count) => count > 0);
    return positive.length === 2 && Math.abs(positive[0] - positive[1]) <= 1;
  }).length;

  return [
    {
      id: "duel-group",
      label: "Camp dominant",
      title: groupReader?.player ? "Lit le groupe" : "Camp illisible",
      player: groupReader?.player ?? null,
      value: groupReader?.player ? `${groupReader.value}` : "0",
      detail: groupReader?.player ? `${groupReader.player.name} s'est retrouvé du côté populaire ${groupReader.value} fois.` : "Pas assez de duels pour dégager un camp.",
      tone: "gold",
    },
    {
      id: "duel-solo",
      label: "Choix radical",
      title: solo?.player ? "Seul dans son délire" : "Aucun solo",
      player: solo?.player ?? null,
      value: solo?.player ? `${solo.value}` : "0",
      detail: solo?.player ? `${solo.player.name} a souvent pris l'option la plus rare.` : "Personne ne s'est vraiment isolé.",
      tone: "danger",
    },
    {
      id: "duel-alliance",
      label: "Duo synchronisé",
      title: alliance ? `${alliance.from.name} + ${alliance.to.name}` : "Pas de duo net",
      player: alliance?.from ?? null,
      value: alliance ? `${alliance.percent}%` : "0%",
      detail: alliance ? `Même choix dans ${alliance.percent}% de leurs duels communs.` : "Les choix sont trop dispersés pour former un duo.",
      tone: "cyan",
    },
    {
      id: "duel-active",
      label: "Voteur le plus actif",
      title: activeVoter?.player ? "Toujours prêt" : "Participation discrète",
      player: activeVoter?.player ?? null,
      value: activeVoter?.player ? `${activeVoter.value}` : "0",
      detail: activeVoter?.player ? `${activeVoter.player.name} a le plus participé aux duels.` : "Aucun vote exploitable.",
      tone: "green",
    },
    {
      id: "duel-tight",
      label: "Duel serré",
      title: tightRounds ? "Table coupée en deux" : "Pas de split",
      player: null,
      value: `${tightRounds}`,
      detail: tightRounds ? `${tightRounds} manche${tightRounds > 1 ? "s" : ""} se joue${tightRounds > 1 ? "nt" : ""} à presque rien.` : "Les duels ont eu des camps plutôt nets.",
      tone: tightRounds ? "pink" : "ghost",
    },
  ];
}

function buildPredictionSpotlights({
  gameType,
  players,
  roundsPlayed,
  castCountByPlayer,
  majorityHits,
  minorityChoices,
  rareChoices,
  soloChoices,
  bestMajorityStreaks,
}: {
  gameType: "majority" | "minority";
  players: Player[];
  roundsPlayed: number;
  castCountByPlayer: Map<string, number>;
  majorityHits: Map<string, number>;
  minorityChoices: Map<string, number>;
  rareChoices: Map<string, number>;
  soloChoices: Map<string, number>;
  bestMajorityStreaks: Map<string, number>;
}): SummarySpotlight[] {
  const majority = maxPlayer(players, majorityHits);
  const unpredictable = maxPlayer(players, minorityChoices);
  const chaos = maxPlayer(players, rareChoices, soloChoices);
  const active = maxPlayer(players, castCountByPlayer);
  const bestStreakPlayer = players
    .map((player) => ({ player, value: bestMajorityStreaks.get(player.id) ?? 0 }))
    .sort((a, b) => b.value - a.value || a.player.name.localeCompare(b.player.name))[0];
  const leaderRate = majority?.player && roundsPlayed > 0
    ? Math.round((majority.value / Math.max(1, castCountByPlayer.get(majority.player.id) ?? roundsPlayed)) * 100)
    : 0;

  if (gameType === "minority") {
    return [
      {
        id: "minority-master",
        label: "Champion minorité",
        title: chaos?.player ? "Rare mais rentable" : "Minorité introuvable",
        player: chaos?.player ?? null,
        value: chaos?.player ? `${chaos.value}` : "0",
        detail: chaos?.player ? `${chaos.player.name} a trouvé les choix les plus rares.` : "Personne n'a vraiment capté le choix rare.",
        tone: "gold",
      },
      {
        id: "solo-choice",
        label: "Seul contre tous",
        title: chaos?.player ? "Option solitaire" : "Jamais seul",
        player: chaos?.player ?? null,
        value: chaos?.player ? `${soloChoices.get(chaos.player.id) ?? 0}` : "0",
        detail: chaos?.player ? `${chaos.player.name} a osé les réponses les moins peuplées.` : "Aucun vrai choix solitaire détecté.",
        tone: "danger",
      },
      {
        id: "too-mainstream",
        label: "Trop mainstream",
        title: majority?.player ? "Attiré par le groupe" : "Groupe flou",
        player: majority?.player ?? null,
        value: majority?.player ? `${leaderRate}%` : "0%",
        detail: majority?.player ? `${majority.player.name} tombe souvent dans le choix populaire.` : "Pas assez de votes pour mesurer le piège.",
        tone: "pink",
      },
      {
        id: "unpredictable",
        label: "Anti-groupe",
        title: unpredictable?.player ? "Esprit indépendant" : "Tout le monde suit",
        player: unpredictable?.player ?? null,
        value: unpredictable?.player ? `${unpredictable.value}` : "0",
        detail: unpredictable?.player ? `${unpredictable.player.name} s'est éloigné du groupe ${unpredictable.value} fois.` : "Aucune vraie divergence détectée.",
        tone: "purple",
      },
      {
        id: "active",
        label: "Participation",
        title: active?.player ? "Toujours dans le game" : "Silence radio",
        player: active?.player ?? null,
        value: active?.player ? `${active.value}` : "0",
        detail: active?.player ? `${active.player.name} a joué le plus de manches.` : "Aucun vote exploitable.",
        tone: "cyan",
      },
    ];
  }

  return [
    {
      id: "majority-master",
      label: "Dans la majorité",
      title: majority?.player ? "Radar collectif" : "Majorité introuvable",
      player: majority?.player ?? null,
      value: majority?.player ? `${leaderRate}%` : "0%",
      detail: majority?.player ? `${majority.player.name} colle au groupe avec un streak max de ${bestMajorityStreaks.get(majority.player.id) ?? 0}.` : "Pas assez de votes comparables.",
      tone: "gold",
    },
    {
      id: "best-streak",
      label: "Meilleure série",
      title: bestStreakPlayer?.value ? "Streak propre" : "Pas de série",
      player: bestStreakPlayer?.value ? bestStreakPlayer.player : null,
      value: bestStreakPlayer?.value ? `${bestStreakPlayer.value}` : "0",
      detail: bestStreakPlayer?.value ? `${bestStreakPlayer.player.name} a enchaîné ${bestStreakPlayer.value} bonnes lectures.` : "Aucun streak assez net.",
      tone: "cyan",
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
      id: "unpredictable",
      label: "Joueur imprévisible",
      title: unpredictable?.player ? "Anti-NPC" : "Tout le monde est sage",
      player: unpredictable?.player ?? null,
      value: unpredictable?.player ? `${unpredictable.value}` : "0",
      detail: unpredictable?.player ? `${unpredictable.player.name} s'est éloigné du groupe ${unpredictable.value} fois.` : "Aucune vraie divergence détectée.",
      tone: "purple",
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

function buildRelationInsights({
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

function buildMimeInsights(
  players: Player[],
  state: MimeGameState | null,
  mimeCounts: Map<string, number>
): string[] {
  if (!state || state.mimeHistory.length === 0) {
    return ["Le rideau n'a presque pas eu le temps de s'ouvrir."];
  }

  const playerById = new Map(players.map((player) => [player.id, player]));
  const firstRecord = state.mimeHistory[0];
  const lastRecord = state.mimeHistory[state.mimeHistory.length - 1];
  const first = playerById.get(firstRecord.mimePlayerId);
  const last = playerById.get(lastRecord.mimePlayerId);
  const next = getNextMimePlayer(players, state);
  const waiting = players.filter((player) => (mimeCounts.get(player.id) ?? 0) === 0);
  const lastExpression = getQuestionText("mime_expressions", lastRecord.expressionId);

  const lines: string[] = [];
  if (first) lines.push(`${first.name} a ouvert la scène, donc tout le monde peut le remercier ou lui en vouloir.`);
  if (last && lastExpression) lines.push(`Dernier dossier mimé : "${lastExpression}" par ${last.name}.`);
  if (next) lines.push(`Le relais automatique pointe maintenant vers ${next.name}.`);
  if (waiting.length) {
    lines.push(`${waiting.map((player) => player.name).join(", ")} attend${waiting.length > 1 ? "ent" : ""} encore le spotlight.`);
  } else {
    lines.push("La rotation a déjà fait passer toute la table.");
  }

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

function buildMimeRareMoments(
  players: Player[],
  state: MimeGameState | null,
  mimeCounts: Map<string, number>
): SummaryRareMoment[] {
  const moments: SummaryRareMoment[] = [];
  const history = state?.mimeHistory ?? [];
  if (!state || history.length === 0) return moments;

  if (history.length === 1) {
    moments.push({
      title: "Premier rideau levé",
      detail: "Une seule manche, donc le bilan garde surtout la trace du lancement du show.",
      tone: "cyan",
    });
  }

  const everyonePassed = players.length > 0 && players.every((player) => (mimeCounts.get(player.id) ?? 0) > 0);
  if (everyonePassed) {
    moments.push({
      title: "Tour complet",
      detail: "Chaque joueur a eu son passage au mime. Rotation propre.",
      tone: "gold",
    });
  }

  const repeat = maxPlayer(players, mimeCounts);
  if (repeat && repeat.value >= 2) {
    moments.push({
      title: "Rappel sur scène",
      detail: `${repeat.player.name} est passé ${repeat.value} fois au mime.`,
      tone: "pink",
    });
  }

  if (state.hostPlayMode) {
    moments.push({
      title: "Hôte dans l'arène",
      detail: "Le mode hôte joueur était activé : pas de spoiler permanent pour l'hôte.",
      tone: "green",
    });
  }

  return moments.slice(0, 5);
}

function buildRecapLines({
  gameType,
  leader,
  spotlights,
  relationInsights,
  rareMoments,
  roundsPlayed,
}: {
  gameType: GameType | null | undefined;
  leader: SummaryScoreRow | null;
  spotlights: SummarySpotlight[];
  relationInsights: string[];
  rareMoments: SummaryRareMoment[];
  roundsPlayed: number;
}): string[] {
  if (gameType === "mime_expressions") {
    const waiting = spotlights.find((spotlight) => spotlight.id === "mime-waiting");
    return [
      `${roundsPlayed} passage${roundsPlayed > 1 ? "s" : ""} au mime enregistré${roundsPlayed > 1 ? "s" : ""}.`,
      leader ? `${leader.player.name} a le plus pris la lumière.` : "Le show n'a pas encore de star statistique.",
      waiting?.detail ?? "La file de passage reste prête pour la suite.",
      rareMoments[0]?.title ? `Moment de scène : ${rareMoments[0].title}.` : "Pas de moment rare, juste une rotation propre.",
    ];
  }

  if (gameType === "who_of_us") {
    const mostVoted = spotlights.find((spotlight) => spotlight.id === "most-voted");
    return [
      mostVoted?.player ? `${mostVoted.player.name} finit au centre des accusations.` : "Aucun suspect officiel ne ressort.",
      relationInsights[0] ?? "Les relations restent à clarifier.",
      rareMoments[0]?.title ? `Moment rare : ${rareMoments[0].title}.` : "Les votes nominaux sont restés plutôt sages.",
      `${roundsPlayed} question${roundsPlayed > 1 ? "s" : ""} sociale${roundsPlayed > 1 ? "s" : ""} analysée${roundsPlayed > 1 ? "s" : ""}.`,
    ];
  }

  const chaos = spotlights.find((spotlight) => spotlight.id === "chaos");
  return [
    leader ? `${leader.player.name} sort en tête après ${roundsPlayed} manche${roundsPlayed > 1 ? "s" : ""}.` : "Aucun vainqueur net, mais beaucoup de matière.",
    chaos?.player ? `${chaos.player.name} repart avec l'étiquette chaos.` : "Le chaos est resté poli.",
    relationInsights[0] ?? "Les alliances restent à confirmer.",
    rareMoments[0]?.title ? `Moment rare : ${rareMoments[0].title}.` : "Aucun événement rarissime, juste du désordre normal.",
  ];
}

function buildSubtitle(
  gameType: GameType | null | undefined,
  rounds: number,
  votes: number,
  players: Player[],
  mimeGameState: MimeGameState | null
): string {
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

  if (gameType === "mime_expressions") {
    const orderSize = mimeGameState?.playerOrder.length || players.length;
    return `${label} · ${rounds} passage${rounds > 1 ? "s" : ""} sur scène · ${orderSize} joueur${orderSize > 1 ? "s" : ""} dans la file`;
  }

  if (gameType === "who_of_us") {
    return `${label} · ${rounds} manche${rounds > 1 ? "s" : ""} · ${votes} vote${votes > 1 ? "s" : ""} nominatif${votes > 1 ? "s" : ""}`;
  }

  if (gameType === "majority" || gameType === "minority") {
    return `${label} · ${rounds} manche${rounds > 1 ? "s" : ""} · ${votes} prédiction${votes > 1 ? "s" : ""} analysée${votes > 1 ? "s" : ""}`;
  }

  return `${label} · ${rounds} manche${rounds > 1 ? "s" : ""} · ${votes} choix analysé${votes > 1 ? "s" : ""}`;
}

function buildTitle(
  gameType: GameType | null | undefined,
  leader: SummaryScoreRow | null,
  roundsPlayed: number,
  mimeGameState: MimeGameState | null,
  players: Player[]
): string {
  if (gameType === "mime_expressions") {
    const playerById = new Map(players.map((player) => [player.id, player]));
    const firstRecord = mimeGameState?.mimeHistory[0];
    const firstMime = firstRecord ? playerById.get(firstRecord.mimePlayerId) : null;
    if (roundsPlayed <= 0) return "Le rideau attend son premier mime";
    if (firstMime && roundsPlayed === 1) return `${firstMime.name} a ouvert le show`;
    if (leader) return `${leader.player.name} a pris la lumière`;
    return "Le show du mime est lancé";
  }

  if (gameType === "who_of_us") {
    return leader ? `${leader.player.name} finit dans le viseur` : "Les accusations restent ouvertes";
  }

  if (gameType === "who_would") {
    return leader ? `${leader.player.name} influence les duels` : "Les duels ont parlé";
  }

  if (gameType === "majority") {
    return leader ? `${leader.player.name} lit la table` : "La majorité garde ses secrets";
  }

  if (gameType === "minority") {
    return leader ? `${leader.player.name} trouve les angles morts` : "La minorité brouille les pistes";
  }

  return leader ? `${leader.player.name} fait trembler le classement` : "Bilan de soirée";
}

function getSummaryProfile(gameType: GameType | null | undefined): SummaryProfile {
  if (gameType === "mime_expressions") return "mime";
  if (gameType === "who_of_us") return "social_vote";
  if (gameType === "who_would") return "duel";
  if (gameType === "majority" || gameType === "minority") return "prediction";
  if (gameType === "jauge") return "rating";
  return "generic";
}

function getLeaderLabel(profile: SummaryProfile): string {
  if (profile === "mime") return "Spotlight";
  if (profile === "social_vote") return "Au centre des débats";
  if (profile === "duel") return "Influence du soir";
  if (profile === "prediction") return "Leader final";
  if (profile === "rating") return "Réputation du soir";
  return "Leader final";
}

function getSectionLabels(profile: SummaryProfile): SummarySectionLabels {
  if (profile === "mime") {
    return {
      scoreboardEyebrow: "Rotation de scène",
      scoreboardTitle: "Ordre des passages",
      scoreboardPill: "file auto",
      scoreboardEmpty: "Aucun passage au mime enregistré pour le moment.",
      spotlightsEyebrow: "Dossiers du show",
      spotlightsTitle: "Ce que la scène raconte",
      heatmapEyebrow: "File de passage",
      heatmapTitle: "Qui passe le relais à qui",
      heatmapEmpty: "Pas encore assez d'ordre pour dessiner la rotation.",
      rareEyebrow: "Moments de scène",
      rareTitle: "Les détails qui font rire après",
      rareFallbackTitle: "Show encore jeune",
      rareFallbackDetail: "Pas de moment rare pour l'instant, mais la file automatique est prête.",
      recapEyebrow: "Recap du show",
      recapTitle: "À retenir avant de relancer",
    };
  }

  if (profile === "social_vote") {
    return {
      scoreboardEyebrow: "Accusations finales",
      scoreboardTitle: "Les plus désignés",
      scoreboardPill: "votes sociaux",
      scoreboardEmpty: "Aucun vote nominatif à classer.",
      spotlightsEyebrow: "Awards sociaux",
      spotlightsTitle: "Les dossiers de la table",
      heatmapEyebrow: "Carte relationnelle",
      heatmapTitle: "Qui vote le plus pour qui",
      heatmapEmpty: "Pas assez de votes nominaux pour dessiner une relation.",
      rareEyebrow: "Événements rares",
      rareTitle: "Les votes qui font parler",
      rareFallbackTitle: "Table calme",
      rareFallbackDetail: "Aucune unanimité ou égalité parfaite détectée.",
      recapEyebrow: "Recap social",
      recapTitle: "Les accusations à garder en mémoire",
    };
  }

  if (profile === "duel") {
    return {
      scoreboardEyebrow: "Influence des choix",
      scoreboardTitle: "Les duellistes du soir",
      scoreboardPill: "duels",
      scoreboardEmpty: "Aucun choix à classer.",
      spotlightsEyebrow: "Awards de duel",
      spotlightsTitle: "Les camps et les solos",
      heatmapEyebrow: "Synchronisation",
      heatmapTitle: "Qui choisit pareil",
      heatmapEmpty: "Pas assez de choix communs pour former une alliance.",
      rareEyebrow: "Moments serrés",
      rareTitle: "Les duels qui ont coupé la table",
      rareFallbackTitle: "Duel standard",
      rareFallbackDetail: "Aucun split rarissime, mais les préférences sont enregistrées.",
      recapEyebrow: "Recap des duels",
      recapTitle: "Ce que les choix racontent",
    };
  }

  if (profile === "prediction") {
    return {
      scoreboardEyebrow: "Scoreboard vivant",
      scoreboardTitle: "Podium final",
      scoreboardPill: "live reveal",
      scoreboardEmpty: "Pas encore assez de prédictions pour classer la table.",
      spotlightsEyebrow: "Awards de lecture",
      spotlightsTitle: "Qui comprend vraiment le groupe",
      heatmapEyebrow: "Carte des alliances",
      heatmapTitle: "Qui pense comme qui",
      heatmapEmpty: "Pas assez de votes comparables pour détecter les alliances.",
      rareEyebrow: "Événements rares",
      rareTitle: "Les prédictions qui ont secoué la table",
      rareFallbackTitle: "Chaos standard",
      rareFallbackDetail: "Aucun événement rarissime, mais les choix ont laissé des traces.",
      recapEyebrow: "Recap final",
      recapTitle: "À retenir avant de relancer",
    };
  }

  if (profile === "rating") {
    return {
      scoreboardEyebrow: "Courbe de réputation",
      scoreboardTitle: "Les moyennes finales",
      scoreboardPill: "1-10",
      scoreboardEmpty: "Aucune note exploitable pour classer la table.",
      spotlightsEyebrow: "Awards de jauge",
      spotlightsTitle: "Qui note, qui encaisse",
      heatmapEyebrow: "Relations de notes",
      heatmapTitle: "Qui note sévèrement qui",
      heatmapEmpty: "Anonymat permanent ou pas assez de notes croisées.",
      rareEyebrow: "Moments de jauge",
      rareTitle: "Les écarts qui font parler",
      rareFallbackTitle: "Jauge stable",
      rareFallbackDetail: "Aucun écart rarissime, mais les moyennes sont enregistrées.",
      recapEyebrow: "Recap jauge",
      recapTitle: "La réputation à retenir",
    };
  }

  return {
    scoreboardEyebrow: "Scoreboard vivant",
    scoreboardTitle: "Podium final",
    scoreboardPill: "live reveal",
    scoreboardEmpty: "Pas encore assez de données pour classer la table.",
    spotlightsEyebrow: "Awards absurdes",
    spotlightsTitle: "Les dossiers de la table",
    heatmapEyebrow: "Heatmap relationnelle",
    heatmapTitle: "Circulation du chaos",
    heatmapEmpty: "Pas assez de relations détectées pour dessiner la carte.",
    rareEyebrow: "Événements rares",
    rareTitle: "Les moments qui font du bruit",
    rareFallbackTitle: "Chaos standard",
    rareFallbackDetail: "Aucun événement rarissime, mais la soirée a laissé des traces.",
    recapEyebrow: "Recap final",
    recapTitle: "À retenir avant de relancer",
  };
}

function getNextMimePlayer(players: Player[], state: MimeGameState | null): Player | null {
  if (!state || state.playerOrder.length === 0) return null;
  const playerById = new Map(players.map((player) => [player.id, player]));
  const nextIndex = (state.currentMimeIndex + 1) % state.playerOrder.length;
  return playerById.get(state.playerOrder[nextIndex]) ?? null;
}

function getQuestionText(gameType: GameType, questionId: number): string | null {
  const question = getQuestionForGame(gameType, questionId);
  if (!question) return null;
  if ("text" in question && question.text) return question.text;
  if ("optionA" in question && "optionB" in question) return `${question.optionA} / ${question.optionB}`;
  return null;
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

function average(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function formatRating(value: number): string {
  return (Math.round(value * 10) / 10).toFixed(1);
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
