export type RoomStatus = "lobby" | "question_active" | "reveal_results" | "ended";
export type Choice = "A" | "B";

export interface Room {
  id: string;
  code: string;
  host_client_id: string;
  status: RoomStatus;
  current_question_id: number | null;
  question_started_at: string | null;
  reveal_started_at: string | null;
  total_questions: number;
  vote_duration_sec: number;
  reveal_duration_sec: number;
  autoplay: boolean;
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
  player_id: string;
  question_id: number;
  choice: Choice;
  created_at: string;
}

export interface AskedQuestion {
  id: string;
  room_id: string;
  question_id: number;
  asked_at: string;
}
