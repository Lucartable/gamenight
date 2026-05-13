import { describe, expect, it } from "vitest";
import { buildEndGameSummary } from "@/lib/endGameSummary";
import type { IntrusGameState, Player, Vote } from "@/types/database";

function player(id: string, name: string): Player {
  return {
    id,
    room_id: "room-intrus",
    client_id: `client-${id}`,
    guest_id: `guest-${id}`,
    auth_user_id: null,
    name,
    avatar: null,
    color: null,
    avatar_style: "adventurer",
    avatar_seed: id,
    avatar_options: {},
    avatar_color: "#ff3ea5",
    is_host: false,
    last_seen_at: "2026-05-13T00:00:00.000Z",
    joined_at: "2026-05-13T00:00:00.000Z",
  };
}

function vote(voter: string, target: string, questionId = 701): Vote {
  return {
    id: `vote-${voter}-${target}`,
    room_id: "room-intrus",
    game_type: "intrus",
    voter_player_id: voter,
    question_id: questionId,
    selected_option: null,
    selected_player_id: target,
    created_at: "2026-05-13T00:00:00.000Z",
  };
}

function intrusState(): IntrusGameState {
  return {
    pairId: 701,
    mainWord: "Pizza",
    intrusWord: "Burger",
    intrusPlayerId: "p3",
    playerOrder: ["p1", "p2", "p3"],
    currentClueIndex: 3,
    clues: [],
    phase: "ended",
    roundNumber: 1,
    usedPairIds: [701],
    mode: "unconscious",
    cluePhaseStartedAt: "2026-05-13T00:00:00.000Z",
    votePhaseStartedAt: "2026-05-13T00:01:00.000Z",
    clueDurationSec: 15,
    voteDurationSec: 30,
    finaleEnabled: true,
    finaleAttempt: null,
    finaleCorrect: null,
    scoresByPlayer: { p1: 2, p2: 0, p3: 0 },
    history: [
      {
        roundNumber: 1,
        pairId: 701,
        intrusPlayerId: "p3",
        mainWord: "Pizza",
        intrusWord: "Burger",
        intrusFound: true,
        topVotedPlayerId: "p3",
        finaleCorrect: null,
        clues: [
          { playerId: "p1", text: "fromage", ts: 1 },
          { playerId: "p2", text: "livraison", ts: 2 },
          { playerId: "p3", text: "pain", ts: 3 },
        ],
      },
    ],
  };
}

describe("EndGameSummary Intrus", () => {
  it("utilise les vrais votes pour le detective et la heatmap", () => {
    const players = [player("p1", "Lucas"), player("p2", "Emma"), player("p3", "Tom")];
    const summary = buildEndGameSummary({
      gameType: "intrus",
      players,
      votes: [vote("p1", "p3"), vote("p2", "p1"), vote("p3", "p1")],
      ratings: [],
      askedQuestions: [],
      roundQuestionIds: [701],
      mimeGameState: null,
      jaugeGameState: null,
      intrusGameState: intrusState(),
    });

    expect(summary.profile).toBe("intrus");
    expect(summary.scoreboard[0]?.player.id).toBe("p1");
    expect(summary.spotlights.find((spotlight) => spotlight.id === "intrus-detective")?.player?.id).toBe("p1");
    expect(summary.heatmap.find((cell) => cell.from.id === "p1" && cell.to.id === "p3")?.metricLabel).toBe("1/1");
    expect(summary.heatmap.some((cell) => cell.from.id === "p2" && cell.to.id === "p3")).toBe(false);
  });
});
