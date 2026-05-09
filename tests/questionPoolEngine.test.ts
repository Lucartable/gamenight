import { describe, expect, it } from "vitest";
import {
  buildQuestionPlanWithDiagnostics,
} from "@/lib/questionPoolEngine";
import { DEFAULT_QUESTION_SOURCE_SETTINGS } from "@/lib/questionPoolTypes";
import type {
  CustomQuestion,
  GameType,
  QuestionSourceMode,
  QuestionSourceSettings,
  SavedCustomQuestion,
} from "@/types/database";

const ROOM_ID = "room-test";
const AUTHOR_ID = "player-author";
const HOST_ID = "00000000-0000-0000-0000-000000000001";

function settings(
  mode: QuestionSourceMode,
  overrides: Partial<QuestionSourceSettings> = {}
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

function liveQuestion({
  id,
  gameType,
  text,
  payload = {},
  category = "joueurs",
  authorId = AUTHOR_ID,
}: {
  id: number;
  gameType: GameType;
  text: string;
  payload?: Record<string, unknown>;
  category?: string;
  authorId?: string;
}): CustomQuestion {
  return {
    id: `live-${Math.abs(id)}`,
    room_id: ROOM_ID,
    author_player_id: authorId,
    game_type: gameType,
    local_question_id: id,
    question_text: text,
    category,
    payload,
    created_at: "2026-05-09T00:00:00.000Z",
  };
}

function savedQuestion({
  id,
  gameType,
  text,
  payload = {},
  category = "sauvegardees",
}: {
  id: number;
  gameType: GameType;
  text: string;
  payload?: Record<string, unknown>;
  category?: string;
}): SavedCustomQuestion {
  return {
    id: `saved-${Math.abs(id)}`,
    host_user_id: HOST_ID,
    game_type: gameType,
    local_question_id: id,
    question_text: text,
    category,
    payload,
    source_game: gameType,
    original_author_id: AUTHOR_ID,
    original_room_id: ROOM_ID,
    created_at: "2026-05-09T00:00:00.000Z",
    updated_at: "2026-05-09T00:00:00.000Z",
  };
}

describe("QuestionPoolEngine", () => {
  it("utilise uniquement les questions systeme en mode system_only", () => {
    const live = liveQuestion({
      id: -101,
      gameType: "who_of_us",
      text: "Qui de nous testera le mode live ?",
    });
    const saved = savedQuestion({
      id: -201,
      gameType: "who_of_us",
      text: "Qui de nous sortira de la bibliotheque ?",
    });

    const { plan, diagnostics } = buildQuestionPlanWithDiagnostics({
      gameType: "who_of_us",
      selectedCategories: [],
      totalQuestions: 3,
      excludeIds: [],
      liveQuestions: [live],
      savedQuestions: [saved],
      settings: settings("system_only", { useLiveQuestions: true, useSavedQuestions: true }),
    });

    expect(plan).toHaveLength(3);
    expect(plan.every((question) => question.source === "system")).toBe(true);
    expect(plan.map((question) => question.id)).not.toContain(live.local_question_id);
    expect(plan.map((question) => question.id)).not.toContain(saved.local_question_id);
    expect(diagnostics.sources.liveRaw).toBe(0);
    expect(diagnostics.sources.savedRaw).toBe(0);
    expect(diagnostics.issue).toBeNull();
  });

  it("utilise uniquement les questions joueurs en mode players_only", () => {
    const liveQuestions = [
      liveQuestion({ id: -101, gameType: "jauge", text: "A quel point cette personne survivrait sans telephone ?" }),
      liveQuestion({ id: -102, gameType: "jauge", text: "A quel point cette personne lancerait une rumeur absurde ?" }),
    ];

    const { plan, diagnostics } = buildQuestionPlanWithDiagnostics({
      gameType: "jauge",
      selectedCategories: [],
      totalQuestions: 5,
      excludeIds: [],
      liveQuestions,
      savedQuestions: [
        savedQuestion({ id: -201, gameType: "jauge", text: "A quel point cette question devrait rester cachee ?" }),
      ],
      settings: settings("players_only", { useSystemQuestions: true, useSavedQuestions: true }),
    });

    expect(plan).toHaveLength(2);
    expect(plan.every((question) => question.source === "live")).toBe(true);
    expect(new Set(plan.map((question) => question.id))).toEqual(new Set([-101, -102]));
    expect(diagnostics.sources.liveValid).toBe(2);
    expect(diagnostics.sources.systemRaw).toBe(0);
    expect(diagnostics.sources.savedRaw).toBe(0);
    expect(diagnostics.issue).toBe("Pool partiel : 2/5 questions disponibles.");
  });

  it("utilise uniquement les questions sauvegardees en mode saved_only", () => {
    const { plan, diagnostics } = buildQuestionPlanWithDiagnostics({
      gameType: "who_would",
      selectedCategories: [],
      totalQuestions: 2,
      excludeIds: [],
      liveQuestions: [
        liveQuestion({
          id: -101,
          gameType: "who_would",
          text: "Tu preferes ignorer ce live ?",
          payload: { optionA: "Live A", optionB: "Live B" },
        }),
      ],
      savedQuestions: [
        savedQuestion({
          id: -201,
          gameType: "who_would",
          text: "Tu preferes tester les sauvegardees ?",
          payload: { optionA: "Option sauvegardee A", optionB: "Option sauvegardee B" },
        }),
      ],
      settings: settings("saved_only", { useSystemQuestions: true, useLiveQuestions: true }),
    });

    expect(plan).toHaveLength(1);
    expect(plan[0]?.source).toBe("saved");
    expect(plan[0]?.id).toBe(-201);
    expect(diagnostics.sources.savedValid).toBe(1);
    expect(diagnostics.sources.liveRaw).toBe(0);
    expect(diagnostics.sources.systemRaw).toBe(0);
  });

  it("garantit les questions joueurs en smart_mix avant de completer avec le systeme", () => {
    const liveQuestions = [
      liveQuestion({ id: -101, gameType: "jauge", text: "A quel point cette personne tiendrait un secret ?" }),
      liveQuestion({ id: -102, gameType: "jauge", text: "A quel point cette personne deviendrait celebre ?" }),
      liveQuestion({ id: -103, gameType: "jauge", text: "A quel point cette personne serait chaotique ?" }),
    ];

    const { plan, diagnostics } = buildQuestionPlanWithDiagnostics({
      gameType: "jauge",
      selectedCategories: [],
      totalQuestions: 5,
      excludeIds: [],
      liveQuestions,
      savedQuestions: [],
      settings: settings("smart_mix"),
    });

    const ids = new Set(plan.map((question) => question.id));
    expect(plan).toHaveLength(5);
    expect(ids.has(-101)).toBe(true);
    expect(ids.has(-102)).toBe(true);
    expect(ids.has(-103)).toBe(true);
    expect(plan.filter((question) => question.source === "live")).toHaveLength(3);
    expect(plan.filter((question) => question.source === "system")).toHaveLength(2);
    expect(diagnostics.sources.liveValid).toBe(3);
    expect(diagnostics.issue).toBeNull();
  });

  it("garantit les questions live et sauvegardees en all_mix puis complete", () => {
    const liveQuestions = [
      liveQuestion({
        id: -101,
        gameType: "majority",
        text: "Le meilleur snack de soiree ?",
        payload: { options: ["Chips", "Pizza", "Bonbons"] },
      }),
      liveQuestion({
        id: -102,
        gameType: "majority",
        text: "La pire heure pour relancer une partie ?",
        payload: { options: ["Minuit", "2h", "4h"] },
      }),
    ];
    const savedQuestions = [
      savedQuestion({
        id: -201,
        gameType: "majority",
        text: "La meilleure excuse pour arriver en retard ?",
        payload: { options: ["Metro", "Sommeil", "Drame imaginaire"] },
      }),
    ];

    const { plan } = buildQuestionPlanWithDiagnostics({
      gameType: "majority",
      selectedCategories: [],
      totalQuestions: 4,
      excludeIds: [],
      liveQuestions,
      savedQuestions,
      settings: settings("all_mix"),
    });

    const ids = new Set(plan.map((question) => question.id));
    expect(plan).toHaveLength(4);
    expect(ids.has(-101)).toBe(true);
    expect(ids.has(-102)).toBe(true);
    expect(ids.has(-201)).toBe(true);
    expect(plan.filter((question) => question.source === "system")).toHaveLength(1);
  });

  it("rejette les formats invalides propres a chaque jeu", () => {
    const liveQuestions = [
      liveQuestion({
        id: -101,
        gameType: "majority",
        text: "Majorite sans options valides ?",
        payload: { options: ["Une seule option"] },
      }),
      liveQuestion({
        id: -102,
        gameType: "who_would",
        text: "Tu preferes une question incomplete ?",
        payload: { optionA: "Seulement A" },
      }),
      liveQuestion({
        id: -103,
        gameType: "majority",
        text: "Question majorite correcte ?",
        payload: { options: ["Oui", "Non"] },
      }),
    ];

    const { plan, diagnostics } = buildQuestionPlanWithDiagnostics({
      gameType: "majority",
      selectedCategories: [],
      totalQuestions: 3,
      excludeIds: [],
      liveQuestions,
      savedQuestions: [],
      settings: settings("players_only"),
    });

    expect(plan).toHaveLength(1);
    expect(plan[0]?.id).toBe(-103);
    expect(diagnostics.sources.liveRaw).toBe(2);
    expect(diagnostics.sources.liveValid).toBe(1);
    expect(diagnostics.sources.rejected).toBe(1);
  });

  it("deduplique les questions equivalentes et respecte les exclusions de session", () => {
    const liveQuestions = [
      liveQuestion({ id: -101, gameType: "who_of_us", text: "Qui de nous garde toujours les memes questions ?" }),
      liveQuestion({ id: -102, gameType: "who_of_us", text: "Qui de nous garde toujours les memes questions ?" }),
      liveQuestion({ id: -103, gameType: "who_of_us", text: "Qui de nous propose une nouvelle question ?" }),
    ];

    const { plan } = buildQuestionPlanWithDiagnostics({
      gameType: "who_of_us",
      selectedCategories: [],
      totalQuestions: 5,
      excludeIds: [-103],
      liveQuestions,
      savedQuestions: [],
      settings: settings("players_only"),
    });

    expect(plan).toHaveLength(1);
    expect(plan[0]?.source).toBe("live");
    expect(plan[0]?.text).toBe("Qui de nous garde toujours les memes questions ?");
    expect(plan.map((question) => question.id)).not.toContain(-103);
  });
});
