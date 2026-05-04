export type RoomStatus = "lobby" | "voting" | "reveal" | "debate" | "ended";
export type Choice = "A" | "B";

export interface Room {
  id: string;
  code: string;
  host_client_id: string;
  status: RoomStatus;
  current_question_id: number | null;
  question_started_at: string | null;
  debate_started_at: string | null;
  debate_mode: boolean;
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

export interface Question {
  id: number;
  optionA: string;
  optionB: string;
}
