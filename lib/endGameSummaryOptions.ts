import type { GameType, Player, Vote } from "@/types/database";
import { getQuestionForGame } from "./gameQuestions";
import type { SummaryRareMoment } from "./endGameSummaryTypes";
import { unique, uniqueBy } from "./endGameSummaryUtils";

export interface RoundOptionStats {
  questionId: number;
  total: number;
  counts: Map<string, number>;
  maxCount: number;
  minPositiveCount: number;
  majorityOptions: Set<string>;
  rareOptions: Set<string>;
}

export function buildOptionRoundStats(
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

export function buildRareMoments(
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
