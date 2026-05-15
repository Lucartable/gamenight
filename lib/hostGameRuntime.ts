import { getDefaultCategories } from "@/lib/gameQuestions";
import {
  getArrivalOrder,
  mergePlayerOrder,
} from "@/lib/mimeGame";
import { shuffleIds as shuffleJaugeIds } from "@/lib/jaugeGame";
import { isPredictionGame } from "@/lib/scoring";
import type {
  Choice,
  GameType,
  JaugeTargetMode,
  Player,
  Rating,
  Room,
  Vote,
} from "@/types/database";

export interface HostLocalVote {
  qid: number;
  selected_option: Choice | null;
  selected_player_id: string | null;
}

export function getSelectedCategories(room: Room | null): string[] {
  if (!room?.game_type) return [];
  if (room.selected_categories?.length) return room.selected_categories;
  return getDefaultCategories(room.game_type);
}

export function voteToLocalVote(vote: Vote | undefined): HostLocalVote | null {
  if (!vote) return null;
  return {
    qid: vote.question_id,
    selected_option: vote.selected_option,
    selected_player_id: vote.selected_player_id,
  };
}

export function countSubmittedVotes(gameType: GameType | null, players: Player[], votes: Vote[]): number {
  const playerIds = new Set(players.map((player) => player.id));
  return votes.filter((vote) => {
    if (!playerIds.has(vote.voter_player_id)) return false;
    if (gameType === "who_would") return vote.selected_option === "A" || vote.selected_option === "B";
    if (gameType === "who_of_us") return Boolean(vote.selected_player_id);
    if (isPredictionGame(gameType)) return Boolean(vote.selected_option);
    return false;
  }).length;
}

export function countSubmittedRatings(requiredPlayers: Player[], ratings: Rating[]): number {
  const requiredIds = new Set(requiredPlayers.map((player) => player.id));
  const voterIds = new Set(
    ratings
      .filter((rating) => requiredIds.has(rating.voter_player_id) && rating.rating >= 1 && rating.rating <= 10)
      .map((rating) => rating.voter_player_id),
  );
  return voterIds.size;
}

export function getJaugeLobbyOrder(
  mode: JaugeTargetMode,
  players: Player[],
  randomOrder: string[],
  customOrder: string[],
): string[] {
  if (mode === "balanced") return getArrivalOrder(players);
  if (mode === "arrival") return getArrivalOrder(players);
  if (mode === "custom") return mergePlayerOrder(customOrder, players);
  const arrivalOrder = getArrivalOrder(players);
  return randomOrder.length ? mergePlayerOrder(randomOrder, players) : shuffleJaugeIds(arrivalOrder);
}

export function dedupeJaugePlayerQuestions(questions: NonNullable<Room["jauge_game_state"]>["playerQuestions"]) {
  const seen = new Set<number>();
  const output: NonNullable<Room["jauge_game_state"]>["playerQuestions"] = [];
  for (const question of questions) {
    if (seen.has(question.id)) continue;
    seen.add(question.id);
    output.push(question);
  }
  return output;
}

export function sameOrder(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}

export function uniqueIds(ids: number[]): number[] {
  return [...new Set(ids.filter((id) => Number.isFinite(id) && id !== 0))];
}

export function addUniqueId(ids: number[], id: number): number[] {
  return uniqueIds([...ids, id]);
}

export function describeError(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message;
  if (err && typeof err === "object") {
    const candidate = err as { message?: unknown; details?: unknown; hint?: unknown; code?: unknown };
    const parts: string[] = [];
    if (typeof candidate.message === "string" && candidate.message) parts.push(candidate.message);
    if (typeof candidate.details === "string" && candidate.details) parts.push(candidate.details);
    if (typeof candidate.hint === "string" && candidate.hint) parts.push(`(${candidate.hint})`);
    if (typeof candidate.code === "string" && candidate.code) parts.push(`[${candidate.code}]`);
    if (parts.length) return parts.join(" ");
  }
  if (typeof err === "string" && err) return err;
  return fallback;
}
