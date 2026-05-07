export type RoomStatus = "lobby" | "question_active" | "reveal_results" | "scoreboard" | "end_game_summary" | "ended";
export type GameType = "who_would" | "who_of_us" | "majority" | "minority" | "mime_expressions";
export type Choice = string;
export type ScoreboardFrequency = "round" | "end";
export type MimeRoundStatus = "waiting" | "playing" | "ended" | "revealed";

export interface MimeGameState {
  playerOrder: string[];
  currentMimeIndex: number;
  currentMimePlayerId: string;
  currentExpressionId: number;
  usedExpressionIds: number[];
  mimeHistory: MimeRoundRecord[];
  roundNumber: number;
  timerDuration: number;
  roundStatus: MimeRoundStatus;
  hostPlayMode: boolean;
}

export interface MimeRoundRecord {
  roundNumber: number;
  mimePlayerId: string;
  expressionId: number;
}

export interface Room {
  id: string;
  code: string;
  host_client_id: string;
  game_type: GameType | null;
  status: RoomStatus;
  current_question_id: number | null;
  question_started_at: string | null;
  reveal_started_at: string | null;
  scoreboard_started_at: string | null;
  total_questions: number;
  vote_duration_sec: number;
  reveal_duration_sec: number;
  scoreboard_duration_sec: number;
  autoplay: boolean;
  hide_scores: boolean;
  scoreboard_frequency: ScoreboardFrequency;
  score_target: number | null;
  selected_categories: string[];
  round_question_ids: number[];
  mime_game_state: MimeGameState | null;
  created_at: string;
}

export interface Player {
  id: string;
  room_id: string;
  client_id: string;
  name: string;
  is_host: boolean;
  joined_at: string;
}

export interface Vote {
  id: string;
  room_id: string;
  game_type: GameType;
  voter_player_id: string;
  question_id: number;
  selected_option: Choice | null;
  selected_player_id: string | null;
  created_at: string;
}

export interface AskedQuestion {
  id: string;
  room_id: string;
  game_type: GameType;
  question_id: number;
  asked_at: string;
}
