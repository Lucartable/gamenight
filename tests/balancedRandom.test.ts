import { describe, expect, it } from "vitest";
import {
  buildPlayerSelectionStats,
  fairRandomPlayers,
  weightedRandomPlayer,
} from "@/lib/balancedRandom";

describe("balanced random player picker", () => {
  it("favorise un joueur peu selectionne", () => {
    const stats = buildPlayerSelectionStats(["lucas", "emma", "tom", "clara"], {
      currentRound: 4,
      history: [
        { roundNumber: 1, playerIds: ["clara"] },
        { roundNumber: 2, playerIds: ["lucas"] },
        { roundNumber: 3, playerIds: ["lucas"] },
      ],
    });
    const byId = new Map(stats.map((stat) => [stat.playerId, stat.weight]));

    expect(byId.get("emma")!).toBeGreaterThan(byId.get("clara")!);
    expect(byId.get("tom")!).toBeGreaterThan(byId.get("clara")!);
    expect(byId.get("clara")!).toBeGreaterThan(byId.get("lucas")!);
  });

  it("penalise fortement un joueur deja choisi a la manche precedente", () => {
    const stats = buildPlayerSelectionStats(["a", "b", "c"], {
      currentRound: 3,
      history: [
        { roundNumber: 1, playerIds: ["a"] },
        { roundNumber: 2, playerIds: ["b"] },
      ],
    });
    const byId = new Map(stats.map((stat) => [stat.playerId, stat.weight]));

    expect(byId.get("b")!).toBeLessThan(byId.get("a")!);
    expect(byId.get("c")!).toBeGreaterThan(byId.get("b")!);
  });

  it("ne cree pas de doublon en tirage multi-joueurs", () => {
    const picked = fairRandomPlayers(["a", "b", "c", "d"], 3, {
      random: () => 0.42,
    });

    expect(picked).toHaveLength(3);
    expect(new Set(picked).size).toBe(3);
  });

  it("evite de repeter trop vite les memes groupes mime", () => {
    const picked = fairRandomPlayers(["a", "b", "c", "d"], 2, {
      currentRound: 4,
      random: () => 0,
      history: [
        { roundNumber: 1, playerIds: ["a", "b"] },
        { roundNumber: 2, playerIds: ["a", "b"] },
        { roundNumber: 3, playerIds: ["c", "d"] },
      ],
    });

    expect(picked.sort()).not.toEqual(["a", "b"]);
  });

  it("intrus ne choisit pas toujours le meme joueur quand un autre ne l'a jamais ete", () => {
    const picked = weightedRandomPlayer(["lucas", "emma", "tom"], {
      currentRound: 4,
      random: () => 0,
      history: [
        { roundNumber: 1, playerIds: ["lucas"] },
        { roundNumber: 2, playerIds: ["lucas"] },
        { roundNumber: 3, playerIds: ["tom"] },
      ],
    });

    expect(picked).toBe("emma");
  });

  it("jauge distribue mieux les cibles", () => {
    const rounds = [
      { roundNumber: 1, playerIds: ["p1"] },
      { roundNumber: 2, playerIds: ["p1"] },
      { roundNumber: 3, playerIds: ["p2"] },
    ];

    expect(weightedRandomPlayer(["p1", "p2", "p3"], { history: rounds, currentRound: 4, random: () => 0 })).toBe("p3");
  });

  it("fallback correct si peu de joueurs", () => {
    expect(fairRandomPlayers([], 2)).toEqual([]);
    expect(fairRandomPlayers(["solo"], 4)).toEqual(["solo"]);
    expect(fairRandomPlayers(["a", "b"], 4).sort()).toEqual(["a", "b"]);
  });
});
