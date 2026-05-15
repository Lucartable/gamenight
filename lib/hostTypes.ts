import type { JaugeGameState, MimeGameState, Room } from "@/types/database";

/**
 * Sous-ensemble du Room mutable depuis le host page lors des transitions de config.
 * Toutes les vues lobby acceptent ce shape pour leurs callbacks `onUpdateConfig`.
 */
type BaseRoomConfigPatch = Partial<
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

export type RoomConfigPatch = Omit<
  BaseRoomConfigPatch,
  "mime_game_state" | "jauge_game_state"
> & {
  mime_game_state?: Room["mime_game_state"] | Partial<MimeGameState> | null;
  jauge_game_state?: Room["jauge_game_state"] | Partial<JaugeGameState> | null;
};
