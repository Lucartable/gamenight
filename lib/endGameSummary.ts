import type { GameType, MimeGameState, Player, Vote } from "@/types/database";
import { buildJaugeSummary } from "./endGameSummaryJauge";
import { getLeaderLabel, getSectionLabels, getSummaryProfile } from "./endGameSummaryLabels";
import { buildMimeInsights, buildMimeRareMoments, buildMimeSpotlights } from "./endGameSummaryMime";
import { buildOptionRoundStats, buildRareMoments, type RoundOptionStats } from "./endGameSummaryOptions";
import {
  buildMimeHeatmap,
  buildRelationInsights,
  buildSameChoicePairs,
  buildTargetPairs,
} from "./endGameSummaryRelations";
import {
  countBy,
  increment,
  maxPlayer,
  minPlayer,
  unique,
} from "./endGameSummaryUtils";
import { computePredictionScores, isPredictionGame } from "./scoring";
import type {
  BuildSummaryInput,
  EndGameSummary,
  SummaryHeatCell,
  SummaryRareMoment,
  SummaryScoreRow,
  SummarySpotlight,
} from "./endGameSummaryTypes";

export type {
  EndGameSummary,
  SummaryHeatCell,
  SummaryProfile,
  SummaryRareMoment,
  SummaryScoreRow,
  SummarySectionLabels,
  SummarySpotlight,
  SummaryTone,
} from "./endGameSummaryTypes";

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
