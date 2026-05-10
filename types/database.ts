export type RoomStatus = "lobby" | "question_active" | "reveal_results" | "scoreboard" | "end_game_summary" | "ended";
export type HostMode = "classic" | "tv";
export type GameType = "who_would" | "who_of_us" | "majority" | "minority" | "mime_expressions" | "jauge";
export type Choice = string;
export type ScoreboardFrequency = "round" | "end";
export type MimeRoundStatus = "waiting" | "playing" | "ended" | "revealed";
export type JaugeTargetMode = "random" | "arrival" | "custom";
export type JaugeQuestionMode = "random" | "fixed" | "players";
export type JaugeAnonymityMode = "visible" | "round_anonymous" | "final_reveal" | "anonymous";
export type UserRole = "player" | "trusted" | "admin";
export type QuestionSourceMode = "system_only" | "players_only" | "saved_only" | "smart_mix" | "all_mix";
export type QuestionAuthorVisibility = "hidden" | "final_reveal" | "visible";

export interface QuestionSourceSettings {
  mode: QuestionSourceMode;
  useSystemQuestions: boolean;
  useLiveQuestions: boolean;
  useSavedQuestions: boolean;
  maxQuestionsPerPlayer: number;
  authorVisibility: QuestionAuthorVisibility;
}

export interface QuestionSnapshot {
  id: number;
  gameType: GameType;
  source: "system" | "live" | "saved";
  category: string;
  text?: string;
  optionA?: string;
  optionB?: string;
  options?: string[];
  authorPlayerId?: string | null;
  savedQuestionId?: string | null;
}

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

export interface JaugeGameState {
  targetMode: JaugeTargetMode;
  targetOrder: string[];
  currentTargetIndex: number;
  currentTargetPlayerId: string;
  questionMode: JaugeQuestionMode;
  questionOrder: number[];
  currentQuestionOrderIndex: number;
  currentQuestionText: string;
  currentQuestionCategory: string;
  usedQuestionIds: number[];
  roundNumber: number;
  anonymityMode: JaugeAnonymityMode;
  brutalMode: boolean;
  autoJaugeMode: boolean;
  allowPlayerQuestions: boolean;
  playerQuestions: JaugePlayerQuestion[];
}

export interface JaugePlayerQuestion {
  id: number;
  text: string;
  authorPlayerId: string;
  category: string;
  source?: "live" | "saved";
}

export interface Room {
  id: string;
  code: string;
  host_client_id: string;
  created_by_guest_id: string | null;
  created_by_user_id: string | null;
  game_type: GameType | null;
  status: RoomStatus;
  host_mode: HostMode;
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
  question_source_settings: QuestionSourceSettings | null;
  current_question_snapshot: QuestionSnapshot | null;
  mime_game_state: MimeGameState | null;
  jauge_game_state: JaugeGameState | null;
  last_activity_at: string;
  expires_at: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  role: UserRole;
  display_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomQuestion {
  id: string;
  room_id: string;
  author_player_id: string;
  game_type: GameType;
  local_question_id: number;
  question_text: string;
  category: string;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface SavedCustomQuestion {
  id: string;
  host_user_id: string;
  game_type: GameType;
  local_question_id: number;
  question_text: string;
  category: string;
  payload: Record<string, unknown>;
  source_game: GameType;
  original_author_id: string | null;
  original_room_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuestionPack {
  id: string;
  owner_user_id: string;
  name: string;
  description: string | null;
  game_type: GameType | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface QuestionPackItem {
  pack_id: string;
  saved_question_id: string;
  position: number;
}

export interface Player {
  id: string;
  room_id: string;
  client_id: string;
  guest_id: string | null;
  auth_user_id: string | null;
  name: string;
  avatar: string | null;
  color: string | null;
  avatar_style: string | null;
  avatar_seed: string | null;
  avatar_options: Record<string, unknown> | null;
  avatar_color: string | null;
  is_host: boolean;
  last_seen_at: string;
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

export interface Rating {
  id: string;
  room_id: string;
  game_type: "jauge";
  voter_player_id: string;
  target_player_id: string;
  question_id: number;
  rating: number;
  is_anonymous: boolean;
  created_at: string;
}

export interface AskedQuestion {
  id: string;
  room_id: string;
  game_type: GameType;
  question_id: number;
  asked_at: string;
}
