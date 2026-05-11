import type { IntrusGameState, Player, Vote } from "@/types/database";

export interface IntrusRoundResult {
  intrusPlayerId: string;
  topVotedPlayerId: string | null;
  intrusFound: boolean;
  voteCountByTarget: Record<string, number>;
  voteByVoter: Record<string, string | null>;
  awards: Record<string, number>;
  finaleCorrect: boolean | null;
}

const POINTS_FOUND_INTRUS = 2;
const POINTS_INTRUS_SURVIVES = 4;
const POINTS_FINALE_GUESS = 2;
const POINTS_DETECTIVE_BONUS = 1;

export function computeIntrusRoundResult({
  state,
  votes,
  players,
}: {
  state: IntrusGameState;
  votes: Vote[];
  players: Player[];
}): IntrusRoundResult {
  const playerIds = new Set(players.map((p) => p.id));
  const voteCountByTarget: Record<string, number> = {};
  const voteByVoter: Record<string, string | null> = {};
  for (const vote of votes) {
    if (vote.game_type !== "intrus") continue;
    if (!playerIds.has(vote.voter_player_id)) continue;
    if (vote.voter_player_id === state.intrusPlayerId && false) {
      // intrus may vote, his vote counts for scoring deduplication only.
    }
    if (vote.selected_player_id && playerIds.has(vote.selected_player_id)) {
      voteByVoter[vote.voter_player_id] = vote.selected_player_id;
      voteCountByTarget[vote.selected_player_id] = (voteCountByTarget[vote.selected_player_id] ?? 0) + 1;
    } else {
      voteByVoter[vote.voter_player_id] = null;
    }
  }
  // déterminer le joueur le plus voté (tie-break : ordre alphabétique de l'id pour stabilité).
  let topVotedPlayerId: string | null = null;
  let topCount = -1;
  for (const [target, count] of Object.entries(voteCountByTarget)) {
    if (count > topCount || (count === topCount && (!topVotedPlayerId || target < topVotedPlayerId))) {
      topVotedPlayerId = target;
      topCount = count;
    }
  }
  const intrusFound = topVotedPlayerId !== null && topVotedPlayerId === state.intrusPlayerId;
  const finaleCorrect = state.finaleCorrect ?? null;

  const awards: Record<string, number> = {};
  for (const player of players) awards[player.id] = 0;

  if (intrusFound) {
    for (const [voterId, target] of Object.entries(voteByVoter)) {
      if (voterId === state.intrusPlayerId) continue;
      if (target === state.intrusPlayerId) {
        awards[voterId] = (awards[voterId] ?? 0) + POINTS_FOUND_INTRUS;
      }
    }
    if (finaleCorrect === true) {
      awards[state.intrusPlayerId] = (awards[state.intrusPlayerId] ?? 0) + POINTS_FINALE_GUESS;
    }
    // détective bonus : si une seule personne (autre que l'intrus) a voté juste, elle gagne en plus
    const correctVoters = Object.entries(voteByVoter)
      .filter(([voterId, target]) => voterId !== state.intrusPlayerId && target === state.intrusPlayerId)
      .map(([voterId]) => voterId);
    if (correctVoters.length === 1) {
      awards[correctVoters[0]] = (awards[correctVoters[0]] ?? 0) + POINTS_DETECTIVE_BONUS;
    }
  } else {
    awards[state.intrusPlayerId] = (awards[state.intrusPlayerId] ?? 0) + POINTS_INTRUS_SURVIVES;
  }

  return {
    intrusPlayerId: state.intrusPlayerId,
    topVotedPlayerId,
    intrusFound,
    voteCountByTarget,
    voteByVoter,
    awards,
    finaleCorrect,
  };
}

export function applyRoundResultToScores(
  scoresByPlayer: Record<string, number>,
  result: IntrusRoundResult
): Record<string, number> {
  const next = { ...scoresByPlayer };
  for (const [playerId, delta] of Object.entries(result.awards)) {
    next[playerId] = (next[playerId] ?? 0) + delta;
  }
  return next;
}

export interface IntrusScoreboardRow {
  player: Player;
  score: number;
  intrusRoles: number;
  detectiveCount: number;
}

export function buildIntrusScoreboard(
  players: Player[],
  state: IntrusGameState | null
): IntrusScoreboardRow[] {
  if (!state) {
    return players.map((player) => ({
      player,
      score: 0,
      intrusRoles: 0,
      detectiveCount: 0,
    }));
  }
  const intrusByPlayer = new Map<string, number>();
  const detectiveByPlayer = new Map<string, number>();
  for (const record of state.history) {
    intrusByPlayer.set(record.intrusPlayerId, (intrusByPlayer.get(record.intrusPlayerId) ?? 0) + 1);
    if (record.intrusFound) {
      const detectives = record.clues
        .map((clue) => clue.playerId)
        .filter((id) => id !== record.intrusPlayerId);
      for (const id of detectives) {
        if (record.intrusFound) detectiveByPlayer.set(id, (detectiveByPlayer.get(id) ?? 0) + 1);
      }
    }
  }
  return players
    .map((player) => ({
      player,
      score: state.scoresByPlayer[player.id] ?? 0,
      intrusRoles: intrusByPlayer.get(player.id) ?? 0,
      detectiveCount: detectiveByPlayer.get(player.id) ?? 0,
    }))
    .sort((a, b) => b.score - a.score || a.player.name.localeCompare(b.player.name));
}
