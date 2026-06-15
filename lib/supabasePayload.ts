"use client";

import type { GameType, Room } from "@/types/database";

const ROOM_BASE_COLUMNS = [
  "id",
  "code",
  "host_client_id",
  "created_by_guest_id",
  "created_by_user_id",
  "game_type",
  "status",
  "host_mode",
  "current_question_id",
  "question_started_at",
  "reveal_started_at",
  "scoreboard_started_at",
  "total_questions",
  "vote_duration_sec",
  "reveal_duration_sec",
  "scoreboard_duration_sec",
  "autoplay",
  "hide_scores",
  "scoreboard_frequency",
  "score_target",
  "selected_categories",
  "round_question_ids",
  "question_source_settings",
  "current_question_snapshot",
  "last_activity_at",
  "expires_at",
  "created_at",
] as const;

const ROOM_STATE_COLUMNS_BY_GAME: Partial<Record<GameType, string[]>> = {
  mime_expressions: ["mime_game_state"],
  jauge: ["jauge_game_state"],
  intrus: ["intrus_game_state"],
};

export const PLAYER_SELECT = [
  "id",
  "room_id",
  "client_id",
  "guest_id",
  "auth_user_id",
  "name",
  "avatar",
  "color",
  "avatar_style",
  "avatar_seed",
  "avatar_options",
  "avatar_color",
  "is_host",
  "last_seen_at",
  "joined_at",
].join(",");

export const VOTE_SELECT = [
  "id",
  "room_id",
  "game_type",
  "voter_player_id",
  "question_id",
  "selected_option",
  "selected_player_id",
  "created_at",
].join(",");

export const RATING_SELECT = [
  "id",
  "room_id",
  "game_type",
  "voter_player_id",
  "target_player_id",
  "question_id",
  "rating",
  "is_anonymous",
  "created_at",
].join(",");

export const CUSTOM_QUESTION_SELECT = [
  "id",
  "room_id",
  "author_player_id",
  "game_type",
  "local_question_id",
  "question_text",
  "category",
  "payload",
  "created_at",
].join(",");

export const SAVED_CUSTOM_QUESTION_SELECT = [
  "id",
  "host_user_id",
  "game_type",
  "local_question_id",
  "question_text",
  "category",
  "payload",
  "source_game",
  "original_author_id",
  "original_room_id",
  "created_at",
  "updated_at",
].join(",");

export const QUESTION_PACK_SELECT = [
  "id",
  "owner_user_id",
  "name",
  "description",
  "game_type",
  "is_public",
  "created_at",
  "updated_at",
].join(",");

export const QUESTION_PACK_ITEM_SELECT = [
  "pack_id",
  "saved_question_id",
  "position",
].join(",");

export const ASKED_QUESTION_SELECT = [
  "id",
  "room_id",
  "game_type",
  "question_id",
  "asked_at",
].join(",");

export const PROFILE_SELECT = [
  "id",
  "role",
  "display_name",
  "created_at",
  "updated_at",
].join(",");

export function getRoomSelect(currentRoom: Room | null): string {
  const gameType = currentRoom?.game_type ?? null;
  const shouldLoadAllState =
    !currentRoom ||
    currentRoom.status === "lobby" ||
    currentRoom.status === "end_game_summary" ||
    !gameType;

  const stateColumns = shouldLoadAllState
    ? ["mime_game_state", "jauge_game_state", "intrus_game_state"]
    : ROOM_STATE_COLUMNS_BY_GAME[gameType] ?? [];

  return [...ROOM_BASE_COLUMNS, ...stateColumns].join(",");
}

export function normalizeRoomPayload(row: Partial<Room>): Room {
  return {
    ...row,
    mime_game_state: row.mime_game_state ?? null,
    jauge_game_state: row.jauge_game_state ?? null,
    intrus_game_state: row.intrus_game_state ?? null,
  } as Room;
}

export function logSupabasePayload(label: string, payload: unknown): void {
  if (process.env.NODE_ENV !== "development") return;

  try {
    const json = JSON.stringify(payload ?? null);
    const rows = Array.isArray(payload) ? `, ${payload.length} row${payload.length > 1 ? "s" : ""}` : "";
    console.debug(`[supabase payload] ${label}: ${formatBytes(json.length)}${rows}`);
  } catch {
    console.debug(`[supabase payload] ${label}: size unavailable`);
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}
