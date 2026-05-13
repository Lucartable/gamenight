import { describe, expect, it } from "vitest";
import {
  buildMimeGameState,
  findNextMimeIndex,
  getMimeGameState,
  mergePlayerOrder as mergeMimePlayerOrder,
  moveId as moveMimeId,
} from "@/lib/mimeGame";
import {
  appendClue,
  buildInitialIntrusState,
  buildNextIntrusRound,
  currentCluePlayerId,
  getWordForPlayer,
  isCluePhaseDone,
} from "@/lib/intrusGame";
import {
  buildInitialJaugeState,
  buildNextJaugeState,
  computeJaugeRoundResult,
  getJaugeRequiredVoters,
} from "@/lib/jaugeGame";
import { getEffectiveJaugeQuestionMode } from "@/lib/jaugeQuestionMode";
import { DEFAULT_QUESTION_SOURCE_SETTINGS } from "@/lib/questionPoolTypes";
import type {
  JaugePlayerQuestion,
  QuestionSourceMode,
  QuestionSourceSettings,
  Player,
  Rating,
} from "@/types/database";

const ROOM_ID = "room-state-tests";
const START = "2026-05-13T18:00:00.000Z";

function player(id: string, name = id, index = 0): Player {
  return {
    id,
    room_id: ROOM_ID,
    client_id: `client-${id}`,
    guest_id: `guest-${id}`,
    auth_user_id: null,
    name,
    avatar: null,
    color: null,
    avatar_style: null,
    avatar_seed: null,
    avatar_options: null,
    avatar_color: null,
    is_host: index === 0,
    last_seen_at: START,
    joined_at: new Date(Date.parse(START) + index * 1000).toISOString(),
  };
}

function rating({
  voterId,
  targetId,
  value,
  index,
}: {
  voterId: string;
  targetId: string;
  value: number;
  index: number;
}): Rating {
  return {
    id: `rating-${voterId}-${targetId}-${index}`,
    room_id: ROOM_ID,
    game_type: "jauge",
    voter_player_id: voterId,
    target_player_id: targetId,
    question_id: 101,
    rating: value,
    is_anonymous: false,
    created_at: new Date(Date.parse(START) + index * 1000).toISOString(),
  };
}

function sourceSettings(
  mode: QuestionSourceMode,
  overrides: Partial<QuestionSourceSettings> = {},
): QuestionSourceSettings {
  return {
    ...DEFAULT_QUESTION_SOURCE_SETTINGS,
    mode,
    useSystemQuestions: mode === "system_only" || mode === "smart_mix" || mode === "all_mix",
    useLiveQuestions: mode === "players_only" || mode === "smart_mix" || mode === "all_mix",
    useSavedQuestions: mode === "saved_only" || mode === "all_mix",
    ...overrides,
  };
}

describe("game state engines", () => {
  it("mime conserve un ordre vivant et passe au mimeur suivant", () => {
    const players = [player("p1", "Luca", 0), player("p2", "Emma", 1), player("p3", "Tom", 2)];
    const initialOrder = ["p2", "missing", "p1"];

    const mergedOrder = mergeMimePlayerOrder(initialOrder, players);
    expect(mergedOrder).toEqual(["p2", "p1", "p3"]);

    const movedOrder = moveMimeId(mergedOrder, "p1", -1);
    expect(movedOrder).toEqual(["p1", "p2", "p3"]);

    const state = buildMimeGameState({
      playerOrder: movedOrder,
      currentMimeIndex: 0,
      expressionId: 42,
      usedExpressionIds: [42],
      roundNumber: 1,
      timerDuration: 30,
      roundStatus: "playing",
      hostPlayMode: true,
      mimeMode: "classic",
    });

    expect(state.currentMimePlayerId).toBe("p1");
    expect(findNextMimeIndex(state, movedOrder)).toBe(1);
    expect(getMimeGameState(state)?.currentExpressionId).toBe(42);
  });

  it("jauge garantit les questions joueurs dans le mix puis change de cible", () => {
    const players = [player("p1", "Luca", 0), player("p2", "Emma", 1), player("p3", "Tom", 2)];
    const playerQuestions: JaugePlayerQuestion[] = [
      {
        id: -101,
        text: "A quel point cette personne survivrait dans une apocalypse zombie ?",
        authorPlayerId: "p1",
        category: "joueurs",
        source: "live",
      },
      {
        id: -102,
        text: "A quel point cette personne serait dangereuse avec beaucoup d'argent ?",
        authorPlayerId: "p2",
        category: "joueurs",
        source: "live",
      },
    ];

    const first = buildInitialJaugeState({
      players,
      selectedCategories: [],
      targetMode: "arrival",
      targetOrder: players.map((item) => item.id),
      questionMode: "random",
      anonymityMode: "visible",
      brutalMode: false,
      autoJaugeMode: false,
      allowPlayerQuestions: true,
      playerQuestions,
      usedQuestionIds: [],
      totalQuestions: 4,
    });

    expect(first).not.toBeNull();
    expect(first?.state.questionOrder).toEqual(expect.arrayContaining([-101, -102]));
    expect(first?.state.currentTargetPlayerId).toBe("p1");
    expect(getJaugeRequiredVoters(players, first?.state ?? null).map((item) => item.id)).toEqual(["p2", "p3"]);

    const second = buildNextJaugeState({
      players,
      selectedCategories: [],
      previous: first!.state,
      extraUsedQuestionIds: [],
    });

    expect(second).not.toBeNull();
    expect(second?.state.currentTargetPlayerId).toBe("p2");
    expect(second?.question.id).not.toBe(first?.question.id);
  });

  it("jauge garde une seule logique effective entre config host et lobby", () => {
    expect(getEffectiveJaugeQuestionMode(sourceSettings("system_only"), "random")).toBe("fixed");
    expect(getEffectiveJaugeQuestionMode(sourceSettings("players_only"), "random")).toBe("players");
    expect(getEffectiveJaugeQuestionMode(sourceSettings("saved_only"), "random")).toBe("players");
    expect(getEffectiveJaugeQuestionMode(sourceSettings("all_mix"), "fixed")).toBe("random");
    expect(
      getEffectiveJaugeQuestionMode(
        sourceSettings("smart_mix", {
          useSystemQuestions: false,
          useLiveQuestions: true,
        }),
        "fixed",
      ),
    ).toBe("players");
  });

  it("jauge calcule un reveal coherent avec anonymat final", () => {
    const players = [player("p1", "Luca", 0), player("p2", "Emma", 1), player("p3", "Tom", 2)];
    const result = computeJaugeRoundResult({
      players,
      targetPlayerId: "p1",
      anonymityMode: "final_reveal",
      finalReveal: false,
      ratings: [
        rating({ voterId: "p2", targetId: "p1", value: 8, index: 1 }),
        rating({ voterId: "p3", targetId: "p1", value: 4, index: 2 }),
      ],
    });

    expect(result.target?.id).toBe("p1");
    expect(result.average).toBe(6);
    expect(result.spread).toBe(4);
    expect(result.rows.every((row) => row.visible === false)).toBe(true);
    expect(result.distribution.find((entry) => entry.rating === 8)?.count).toBe(1);

    const finalResult = computeJaugeRoundResult({
      players,
      targetPlayerId: "p1",
      anonymityMode: "final_reveal",
      finalReveal: true,
      ratings: [
        rating({ voterId: "p2", targetId: "p1", value: 8, index: 1 }),
        rating({ voterId: "p3", targetId: "p1", value: 4, index: 2 }),
      ],
    });

    expect(finalResult.rows.every((row) => row.visible === true)).toBe(true);
  });

  it("intrus enchaine les indices et cree une manche suivante sans repeter la paire", () => {
    const participants = [player("p1", "Luca", 0), player("p2", "Emma", 1), player("p3", "Tom", 2)];
    const state = buildInitialIntrusState({
      participants,
      selectedCategories: [],
      orderMode: "arrival",
      customOrder: [],
      clueDurationSec: 15,
      voteDurationSec: 30,
      mode: "conscious",
      finaleEnabled: true,
    });

    expect(state).not.toBeNull();
    expect(state?.playerOrder).toEqual(["p1", "p2", "p3"]);
    expect(currentCluePlayerId(state)).toBe("p1");
    expect(getWordForPlayer(state, state!.intrusPlayerId)).toBe(state?.intrusWord);

    const afterFirstClue = appendClue(state!, { playerId: "p1", text: "indice", ts: 1 });
    expect(currentCluePlayerId(afterFirstClue)).toBe("p2");

    const completed = participants.reduce(
      (current, item, index) => appendClue(current, { playerId: item.id, text: `indice-${index}`, ts: index }),
      state!
    );
    expect(isCluePhaseDone(completed)).toBe(true);

    const next = buildNextIntrusRound(completed, {
      participants,
      selectedCategories: [],
      orderMode: "arrival",
      customOrder: [],
    });

    expect(next).not.toBeNull();
    expect(next?.roundNumber).toBe(2);
    expect(next?.usedPairIds).toContain(state?.pairId);
    expect(next?.pairId).not.toBe(state?.pairId);
  });
});
