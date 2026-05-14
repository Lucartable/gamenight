import { describe, expect, it } from "vitest";
import {
  filterJaugePlayerQuestionsAfterClear,
  getLiveQuestionsForGame,
  getPlayedLiveQuestionIdsForGame,
} from "@/lib/customQuestionCleanup";
import type { CustomQuestion, GameType, JaugePlayerQuestion } from "@/types/database";

const ROOM_ID = "room-cleanup";
const AUTHOR_ID = "player-author";

function liveQuestion(id: number, gameType: GameType, text = `Question ${id}`): CustomQuestion {
  return {
    id: `live-${Math.abs(id)}`,
    room_id: ROOM_ID,
    author_player_id: AUTHOR_ID,
    game_type: gameType,
    local_question_id: id,
    question_text: text,
    category: "joueurs",
    payload: {},
    created_at: "2026-05-14T00:00:00.000Z",
  };
}

function jaugePlayerQuestion(id: number): JaugePlayerQuestion {
  return {
    id,
    text: `A quel point test ${id} ?`,
    authorPlayerId: AUTHOR_ID,
    category: "joueurs",
    source: "live",
  };
}

function savedJaugePlayerQuestion(id: number): JaugePlayerQuestion {
  return {
    ...jaugePlayerQuestion(id),
    source: "saved",
  };
}

describe("custom question cleanup", () => {
  it("filtre les questions live du jeu courant uniquement", () => {
    const questions = [
      liveQuestion(-101, "jauge"),
      liveQuestion(-102, "jauge"),
      liveQuestion(-201, "who_of_us"),
    ];

    expect(getLiveQuestionsForGame(questions, "jauge").map((question) => question.local_question_id)).toEqual([-101, -102]);
  });

  it("detecte les questions joueurs deja jouees avec asked_questions et round_question_ids", () => {
    const questions = [
      liveQuestion(-101, "jauge"),
      liveQuestion(-102, "jauge"),
      liveQuestion(-103, "jauge"),
      liveQuestion(-201, "majority"),
    ];

    expect(
      getPlayedLiveQuestionIdsForGame({
        customQuestions: questions,
        gameType: "jauge",
        askedQuestionIds: [-101, 42, -201],
        roundQuestionIds: [-103],
      }).sort((a, b) => a - b),
    ).toEqual([-103, -101]);
  });

  it("nettoie le miroir jauge playerQuestions sans toucher aux questions non jouees", () => {
    const questions = [jaugePlayerQuestion(-101), jaugePlayerQuestion(-102), jaugePlayerQuestion(-103), savedJaugePlayerQuestion(-301)];

    expect(
      filterJaugePlayerQuestionsAfterClear({
        playerQuestions: questions,
        scope: "played",
        playedLiveQuestionIds: [-101, -103],
      }).map((question) => question.id),
    ).toEqual([-102, -301]);

    expect(
      filterJaugePlayerQuestionsAfterClear({
        playerQuestions: questions,
        scope: "all",
        playedLiveQuestionIds: [],
      }),
    ).toEqual([savedJaugePlayerQuestion(-301)]);
  });
});
