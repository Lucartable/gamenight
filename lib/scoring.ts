import type { GameType, Player, Vote } from "@/types/database";
import type { PredictionGameQuestion } from "./gameQuestions";
import { getQuestionForGame } from "./gameQuestions";
import { clampInt } from "./utils";

export type PredictionGameType = "majority" | "minority";

export interface MinorityScoringConfig {
  minPoints: number;
  maxPoints: number;
}

export const DEFAULT_MINORITY_SCORING: MinorityScoringConfig = {
  minPoints: 1,
  maxPoints: 5,
};

export interface PredictionOptionResult {
  option: string;
  count: number;
  percent: number;
  voters: Player[];
  score: number;
  isWinner: boolean;
  status: "majority" | "rare" | "popular" | "valid" | "empty";
  statusLabel: string;
}

export interface PredictionPlayerGain {
  player: Player;
  selectedOption: string | null;
  points: number;
  isWinner: boolean;
}

export interface PredictionRoundResult {
  mode: PredictionGameType;
  totalVotes: number;
  options: PredictionOptionResult[];
  winners: Player[];
  gains: PredictionPlayerGain[];
  headline: string;
  subline: string;
}

export interface PredictionScoreRow {
  player: Player;
  points: number;
  roundGain: number;
  votesCast: number;
  majorityHits: number;
  rareHits: number;
  popularVotes: number;
  zeroPointVotes: number;
}

export interface FunStat {
  label: string;
  value: string;
  detail: string;
}

export function isPredictionGame(gameType: GameType | null | undefined): gameType is PredictionGameType {
  return gameType === "majority" || gameType === "minority";
}

export function getMinorityPoints(
  count: number,
  totalVotes: number,
  config: MinorityScoringConfig = DEFAULT_MINORITY_SCORING
): number {
  if (count <= 0 || totalVotes <= 0) return 0;
  if (totalVotes === 1) return config.maxPoints;
  const rarity = (totalVotes - count) / Math.max(1, totalVotes - 1);
  return clampInt(config.minPoints + Math.round(rarity * (config.maxPoints - config.minPoints)), config.minPoints, config.maxPoints);
}

export function computePredictionRound(
  mode: PredictionGameType,
  question: PredictionGameQuestion,
  players: Player[],
  votes: Vote[],
  scoringConfig: MinorityScoringConfig = DEFAULT_MINORITY_SCORING
): PredictionRoundResult {
  const playerById = new Map(players.map((player) => [player.id, player]));
  const validOptionSet = new Set(question.options);
  const validVotes = votes.filter(
    (vote) =>
      playerById.has(vote.voter_player_id) &&
      typeof vote.selected_option === "string" &&
      validOptionSet.has(vote.selected_option)
  );
  const totalVotes = validVotes.length;
  const counts = new Map(question.options.map((option) => [option, 0]));
  const votersByOption = new Map<string, Player[]>();

  for (const vote of validVotes) {
    const option = vote.selected_option;
    if (!option) continue;
    const voter = playerById.get(vote.voter_player_id);
    if (!voter) continue;
    counts.set(option, (counts.get(option) ?? 0) + 1);
    votersByOption.set(option, [...(votersByOption.get(option) ?? []), voter]);
  }

  const countValues = question.options.map((option) => counts.get(option) ?? 0);
  const maxCount = Math.max(0, ...countValues);
  const positiveCounts = countValues.filter((count) => count > 0);
  const minPositiveCount = positiveCounts.length ? Math.min(...positiveCounts) : 0;

  const options = question.options.map<PredictionOptionResult>((option) => {
    const count = counts.get(option) ?? 0;
    const percent = totalVotes === 0 ? 0 : Math.round((count / totalVotes) * 100);
    const isMajorityWinner = mode === "majority" && count > 0 && count === maxCount;
    const isMinorityWinner = mode === "minority" && count > 0 && count === minPositiveCount;
    const isWinner = isMajorityWinner || isMinorityWinner;
    const score = mode === "majority" ? (isWinner ? 1 : 0) : getMinorityPoints(count, totalVotes, scoringConfig);

    let status: PredictionOptionResult["status"] = "valid";
    let statusLabel = "Dans le peloton";
    if (count === 0) {
      status = "empty";
      statusLabel = "Personne n'a choisi ça";
    } else if (mode === "majority" && isWinner) {
      status = "majority";
      statusLabel = "Majorité";
    } else if (mode === "minority" && isWinner) {
      status = "rare";
      statusLabel = "Choix rare";
    } else if (mode === "minority" && percent >= 50) {
      status = "popular";
      statusLabel = "Trop populaire";
    } else if (mode === "minority") {
      status = "valid";
      statusLabel = `${score} pts`;
    }

    return {
      option,
      count,
      percent,
      voters: votersByOption.get(option) ?? [],
      score,
      isWinner,
      status,
      statusLabel,
    };
  });

  const optionByName = new Map(options.map((option) => [option.option, option]));
  const gains = players.map<PredictionPlayerGain>((player) => {
    const vote = validVotes.find((item) => item.voter_player_id === player.id);
    const option = vote?.selected_option ?? null;
    const result = option ? optionByName.get(option) : undefined;
    return {
      player,
      selectedOption: option,
      points: result?.score ?? 0,
      isWinner: Boolean(result?.isWinner),
    };
  });
  const winners = gains.filter((gain) => gain.isWinner).map((gain) => gain.player);

  return {
    mode,
    totalVotes,
    options,
    winners,
    gains,
    headline:
      mode === "majority"
        ? maxCount > 0
          ? "Majorité trouvée !"
          : "Aucune majorité"
        : minPositiveCount > 0
          ? "Choix rare trouvé !"
          : "Aucune minorité valide",
    subline:
      mode === "majority"
        ? "Les joueurs dans le choix majoritaire marquent 1 point."
        : "Plus ton choix est rare, plus il rapporte. Une option vide rapporte 0.",
  };
}

export function computePredictionScores(
  mode: PredictionGameType,
  players: Player[],
  votes: Vote[],
  currentQuestionId?: number | null
): PredictionScoreRow[] {
  const rows = new Map(
    players.map((player) => [
      player.id,
      {
        player,
        points: 0,
        roundGain: 0,
        votesCast: 0,
        majorityHits: 0,
        rareHits: 0,
        popularVotes: 0,
        zeroPointVotes: 0,
      } satisfies PredictionScoreRow,
    ])
  );
  const votesByQuestion = new Map<number, Vote[]>();

  for (const vote of votes) {
    if (vote.game_type !== mode) continue;
    votesByQuestion.set(vote.question_id, [...(votesByQuestion.get(vote.question_id) ?? []), vote]);
  }

  for (const [questionId, questionVotes] of votesByQuestion) {
    const question = getQuestionForGame(mode, questionId);
    if (!question || question.gameType !== mode) continue;
    const round = computePredictionRound(mode, question as PredictionGameQuestion, players, questionVotes);
    for (const gain of round.gains) {
      const row = rows.get(gain.player.id);
      if (!row || !gain.selectedOption) continue;
      const option = round.options.find((item) => item.option === gain.selectedOption);
      row.votesCast += 1;
      row.points += gain.points;
      if (questionId === currentQuestionId) row.roundGain = gain.points;
      if (gain.isWinner && mode === "majority") row.majorityHits += 1;
      if (gain.isWinner && mode === "minority") row.rareHits += 1;
      if (option?.status === "popular") row.popularVotes += 1;
      if (gain.points === 0) row.zeroPointVotes += 1;
    }
  }

  return [...rows.values()].sort(
    (a, b) =>
      b.points - a.points ||
      b.roundGain - a.roundGain ||
      a.player.name.localeCompare(b.player.name)
  );
}

export function hasReachedScoreTarget(rows: PredictionScoreRow[], scoreTarget: number | null | undefined): boolean {
  if (!scoreTarget) return false;
  return rows.some((row) => row.points >= scoreTarget);
}

export function buildFunStats(mode: PredictionGameType, rows: PredictionScoreRow[]): FunStat[] {
  const playedRows = rows.filter((row) => row.votesCast > 0);
  if (!playedRows.length) return [];

  const top = rows[0];
  const predictable = maxBy(playedRows, (row) => row.majorityHits);
  const independent = maxBy(playedRows, (row) => row.rareHits);
  const chaos = maxBy(playedRows, (row) => row.zeroPointVotes);
  const popular = maxBy(playedRows, (row) => row.popularVotes);

  const stats: FunStat[] = [
    {
      label: "Champion",
      value: top?.player.name ?? "Personne",
      detail: `${top?.points ?? 0} point${(top?.points ?? 0) > 1 ? "s" : ""}`,
    },
  ];

  if (mode === "majority" && predictable) {
    stats.push({
      label: "Le plus prévisible",
      value: predictable.player.name,
      detail: `${predictable.majorityHits} majorité${predictable.majorityHits > 1 ? "s" : ""} trouvée${predictable.majorityHits > 1 ? "s" : ""}`,
    });
    stats.push({
      label: "Mouton certifié",
      value: predictable.player.name,
      detail: "Toujours dans le tempo du groupe.",
    });
  }

  if (mode === "minority" && independent) {
    stats.push({
      label: "Esprit indépendant",
      value: independent.player.name,
      detail: `${independent.rareHits} choix rare${independent.rareHits > 1 ? "s" : ""}`,
    });
    stats.push({
      label: "Choix les plus rares",
      value: independent.player.name,
      detail: "Le radar anti-évidence était allumé.",
    });
  }

  if (chaos && chaos.zeroPointVotes > 0) {
    stats.push({
      label: "Maître du chaos",
      value: chaos.player.name,
      detail: `${chaos.zeroPointVotes} vote${chaos.zeroPointVotes > 1 ? "s" : ""} à 0 point`,
    });
  }

  if (mode === "minority" && popular && popular.popularVotes > 0) {
    stats.push({
      label: "Trop populaire",
      value: popular.player.name,
      detail: "Les choix rares, ce sera pour la prochaine.",
    });
  }

  return stats.slice(0, 5);
}

function maxBy(rows: PredictionScoreRow[], score: (row: PredictionScoreRow) => number): PredictionScoreRow | undefined {
  return rows.reduce<PredictionScoreRow | undefined>((best, row) => {
    if (!best) return row;
    return score(row) > score(best) ? row : best;
  }, undefined);
}
