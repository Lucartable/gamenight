import type { Room } from "@/types/database";

/**
 * Sous-ensemble du Room mutable depuis le host page lors des transitions de config.
 * Toutes les vues lobby acceptent ce shape pour leurs callbacks `onUpdateConfig`.
 */
export type RoomConfigPatch = Partial<
  Pick<
    Room,
    | "game_type"
    | "current_question_id"
    | "selected_categories"
    | "total_questions"
    | "vote_duration_sec"
    | "reveal_duration_sec"
    | "scoreboard_duration_sec"
    | "autoplay"
    | "hide_scores"
    | "scoreboard_frequency"
    | "score_target"
    | "round_question_ids"
    | "question_source_settings"
    | "current_question_snapshot"
    | "mime_game_state"
    | "jauge_game_state"
    | "intrus_game_state"
  >
>;
