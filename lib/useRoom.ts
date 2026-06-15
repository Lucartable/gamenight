"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AskedQuestion, CustomQuestion, GameType, Player, Rating, Room, Vote } from "@/types/database";
import { getSupabase } from "./supabase";
import {
  ASKED_QUESTION_SELECT,
  CUSTOM_QUESTION_SELECT,
  PLAYER_SELECT,
  RATING_SELECT,
  VOTE_SELECT,
  getRoomSelect,
  logSupabasePayload,
  normalizeRoomPayload,
} from "./supabasePayload";

type RoomRefreshScope = "room" | "players" | "votes" | "ratings" | "custom_questions" | "asked_questions";
type RoomRefreshTarget = RoomRefreshScope | "all";

interface UseRoomState {
  room: Room | null;
  players: Player[];
  votes: Vote[];
  ratings: Rating[];
  customQuestions: CustomQuestion[];
  askedQuestions: AskedQuestion[];
  askedQuestionIds: number[];
  loading: boolean;
  error: string | null;
  refresh: (target?: RoomRefreshTarget | RoomRefreshScope[]) => Promise<void>;
}

// Intervalle du polling de secours, au cas où la realtime ne fonctionne pas
// (publication non configurée, RLS, plan gratuit saturé, etc.). La realtime
// reste la source rapide; le polling ne sert plus qu'a resynchroniser.
const POLL_INTERVAL_MS = 30_000;
const ALL_REFRESH_SCOPES: RoomRefreshScope[] = ["room", "players", "votes", "ratings", "custom_questions", "asked_questions"];
const INITIAL_REFRESH_SCOPES: RoomRefreshScope[] = ["players", "votes", "ratings", "custom_questions", "asked_questions"];

type RealtimePayload = {
  eventType?: "INSERT" | "UPDATE" | "DELETE" | string;
  new?: Record<string, unknown> | null;
  old?: Record<string, unknown> | null;
};

/**
 * S'abonne en temps réel à une salle (rooms + players + votes + ratings + asked_questions).
 * Pour rester robuste si la realtime tombe, on combine :
 *   - une souscription Supabase (`postgres_changes`)
 *   - un polling de secours beaucoup moins fréquent
 *   - une fonction `refresh()` exposée pour les actions qui veulent un retour
 *     immédiat (sans attendre realtime ni polling)
 */
export function useRoom(code: string): UseRoomState {
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [customQuestions, setCustomQuestions] = useState<CustomQuestion[]>([]);
  const [askedQuestions, setAskedQuestions] = useState<AskedQuestion[]>([]);
  const [askedQuestionIds, setAskedQuestionIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Référence vers la dernière fonction refresh effective. On expose un wrapper
  // stable au-dessus, comme ça les useEffect du consommateur n'invalident pas.
  const refreshRef = useRef<(target?: RoomRefreshTarget | RoomRefreshScope[]) => Promise<void>>(async () => {});
  const refresh = useCallback((target?: RoomRefreshTarget | RoomRefreshScope[]) => refreshRef.current(target), []);

  useEffect(() => {
    if (!code) return;
    const supabase = getSupabase();
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let roomId: string | null = null;
    let latestRoom: Room | null = null;
    const fetchSeq: Record<RoomRefreshScope, number> = {
      room: 0,
      players: 0,
      votes: 0,
      ratings: 0,
      custom_questions: 0,
      asked_questions: 0,
    };

    async function refreshRoom() {
      if (!roomId || cancelled) return;
      const seq = ++fetchSeq.room;
      const { data } = await supabase
        .from("rooms")
        .select(getRoomSelect(latestRoom))
        .eq("id", roomId)
        .single();
      if (cancelled || seq !== fetchSeq.room || !data) return;
      const previousScopeKey = getLiveScopeKey(latestRoom);
      logSupabasePayload("useRoom.rooms", data);
      latestRoom = normalizeRoomPayload(data as Partial<Room>);
      setRoom(latestRoom);
      if (previousScopeKey !== getLiveScopeKey(latestRoom)) {
        void refreshTargets(["votes", "ratings", "asked_questions"]);
      }
    }

    async function refreshPlayers() {
      if (!roomId || cancelled) return;
      const seq = ++fetchSeq.players;
      const { data } = await supabase.from("players").select(PLAYER_SELECT).eq("room_id", roomId).order("joined_at");
      if (cancelled || seq !== fetchSeq.players || !data) return;
      logSupabasePayload("useRoom.players", data);
      setPlayers(data as unknown as Player[]);
    }

    async function refreshVotes() {
      if (!roomId || cancelled) return;
      const seq = ++fetchSeq.votes;
      const scope = getVoteScope(latestRoom);
      if (scope.kind === "none") {
        if (!cancelled && seq === fetchSeq.votes) setVotes([]);
        return;
      }
      let query = supabase.from("votes").select(VOTE_SELECT).eq("room_id", roomId);
      if (scope.kind === "round") {
        query = query.eq("game_type", scope.gameType).eq("question_id", scope.questionId);
      }
      const { data } = await query;
      if (cancelled || seq !== fetchSeq.votes || !data) return;
      logSupabasePayload(scope.kind === "history" ? "useRoom.votes.history" : "useRoom.votes.round", data);
      setVotes(data as unknown as Vote[]);
    }

    async function refreshRatings() {
      if (!roomId || cancelled) return;
      const seq = ++fetchSeq.ratings;
      const scope = getRatingScope(latestRoom);
      if (scope.kind === "none") {
        if (!cancelled && seq === fetchSeq.ratings) setRatings([]);
        return;
      }
      let query = supabase.from("ratings").select(RATING_SELECT).eq("room_id", roomId);
      if (scope.kind === "round") {
        query = query.eq("question_id", scope.questionId);
        if (scope.targetPlayerId) query = query.eq("target_player_id", scope.targetPlayerId);
      }
      const { data } = await query;
      if (cancelled || seq !== fetchSeq.ratings || !data) return;
      logSupabasePayload(scope.kind === "history" ? "useRoom.ratings.history" : "useRoom.ratings.round", data);
      setRatings(data as unknown as Rating[]);
    }

    async function refreshCustomQuestions() {
      if (!roomId || cancelled) return;
      const seq = ++fetchSeq.custom_questions;
      const { data } = await supabase
        .from("custom_questions")
        .select(CUSTOM_QUESTION_SELECT)
        .eq("room_id", roomId)
        .order("created_at");
      if (cancelled || seq !== fetchSeq.custom_questions || !data) return;
      logSupabasePayload("useRoom.custom_questions", data);
      setCustomQuestions(data as unknown as CustomQuestion[]);
    }

    async function refreshAskedQuestions() {
      if (!roomId || cancelled) return;
      const seq = ++fetchSeq.asked_questions;
      let query = supabase.from("asked_questions").select(ASKED_QUESTION_SELECT).eq("room_id", roomId);
      if (latestRoom?.game_type) query = query.eq("game_type", latestRoom.game_type);
      const { data } = await query;
      if (cancelled || seq !== fetchSeq.asked_questions || !data) return;
      logSupabasePayload("useRoom.asked_questions", data);
      const asked = data as unknown as AskedQuestion[];
      setAskedQuestions(asked);
      setAskedQuestionIds(asked.map((d) => d.question_id));
    }

    const refreshers: Record<RoomRefreshScope, () => Promise<void>> = {
      room: refreshRoom,
      players: refreshPlayers,
      votes: refreshVotes,
      ratings: refreshRatings,
      custom_questions: refreshCustomQuestions,
      asked_questions: refreshAskedQuestions,
    };

    async function refreshTargets(target: RoomRefreshTarget | RoomRefreshScope[] = "all") {
      const scopes = target === "all" ? ALL_REFRESH_SCOPES : Array.isArray(target) ? target : [target];
      await Promise.all(scopes.map((scope) => refreshers[scope]()));
    }

    function applyRoomChange(payload: RealtimePayload) {
      if (payload.eventType === "DELETE") return;
      const nextRoom = payloadRow<Partial<Room>>(payload, "new");
      if (!nextRoom) return;
      const previousScopeKey = getLiveScopeKey(latestRoom);
      latestRoom = normalizeRoomPayload(nextRoom);
      setRoom(latestRoom);
      if (previousScopeKey !== getLiveScopeKey(latestRoom)) {
        void refreshTargets(["votes", "ratings", "asked_questions"]);
      }
    }

    function applyPlayersChange(payload: RealtimePayload) {
      applyCollectionChange<Player>(payload, setPlayers, sortPlayers);
    }

    function applyVotesChange(payload: RealtimePayload) {
      applyCollectionChange<Vote>(payload, setVotes, undefined, (vote) => isVoteInScope(vote, latestRoom));
    }

    function applyRatingsChange(payload: RealtimePayload) {
      applyCollectionChange<Rating>(payload, setRatings, undefined, (rating) => isRatingInScope(rating, latestRoom));
    }

    function applyCustomQuestionsChange(payload: RealtimePayload) {
      applyCollectionChange<CustomQuestion>(payload, setCustomQuestions, sortCustomQuestions);
    }

    function applyAskedQuestionsChange(payload: RealtimePayload) {
      const nextRow = payloadRow<AskedQuestion>(payload, "new");
      const oldRow = payloadRow<AskedQuestion>(payload, "old");
      setAskedQuestions((current) => {
        const next = applyChangeToArray(current, payload.eventType, nextRow, oldRow, sortAskedQuestions);
        setAskedQuestionIds(next.map((question) => question.question_id));
        return next;
      });
    }

    refreshRef.current = refreshTargets;

    async function init() {
      const { data, error } = await supabase
        .from("rooms")
        .select(getRoomSelect(null))
        .eq("code", code)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        setError("Salle introuvable.");
        setLoading(false);
        return;
      }
      const r = normalizeRoomPayload(data as Partial<Room>);
      logSupabasePayload("useRoom.rooms.initial", data);
      roomId = r.id;
      latestRoom = r;
      setRoom(r);
      await refreshTargets(INITIAL_REFRESH_SCOPES);
      setLoading(false);

      channel = supabase
        .channel(`room:${r.id}`)
        .on("postgres_changes",
          { event: "*", schema: "public", table: "rooms", filter: `id=eq.${r.id}` },
          (payload) => applyRoomChange(payload)
        )
        .on("postgres_changes",
          { event: "*", schema: "public", table: "players", filter: `room_id=eq.${r.id}` },
          (payload) => applyPlayersChange(payload)
        )
        .on("postgres_changes",
          { event: "*", schema: "public", table: "votes", filter: `room_id=eq.${r.id}` },
          (payload) => applyVotesChange(payload)
        )
        .on("postgres_changes",
          { event: "*", schema: "public", table: "ratings", filter: `room_id=eq.${r.id}` },
          (payload) => applyRatingsChange(payload)
        )
        .on("postgres_changes",
          { event: "*", schema: "public", table: "custom_questions", filter: `room_id=eq.${r.id}` },
          (payload) => applyCustomQuestionsChange(payload)
        )
        .on("postgres_changes",
          { event: "*", schema: "public", table: "asked_questions", filter: `room_id=eq.${r.id}` },
          (payload) => applyAskedQuestionsChange(payload)
        )
        .subscribe();
    }

    init();

    const pollId = setInterval(() => {
      void refreshTargets("all");
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(pollId);
      if (channel) supabase.removeChannel(channel);
    };
  }, [code]);

  return { room, players, votes, ratings, customQuestions, askedQuestions, askedQuestionIds, loading, error, refresh };
}

function payloadRow<T>(payload: RealtimePayload, key: "new" | "old"): T | null {
  const row = payload[key];
  if (!row || Object.keys(row).length === 0) return null;
  return row as T;
}

function applyCollectionChange<T extends { id: string }>(
  payload: RealtimePayload,
  setItems: (updater: (current: T[]) => T[]) => void,
  sort?: (items: T[]) => T[],
  accepts?: (item: T) => boolean,
) {
  const nextRow = payloadRow<T>(payload, "new");
  const oldRow = payloadRow<T>(payload, "old");
  if (payload.eventType !== "DELETE" && nextRow && accepts && !accepts(nextRow)) {
    if (oldRow?.id) setItems((current) => current.filter((item) => item.id !== oldRow.id));
    return;
  }
  setItems((current) => applyChangeToArray(current, payload.eventType, nextRow, oldRow, sort));
}

function applyChangeToArray<T extends { id: string }>(
  current: T[],
  eventType: RealtimePayload["eventType"],
  nextRow: T | null,
  oldRow: T | null,
  sort?: (items: T[]) => T[],
): T[] {
  if (eventType === "DELETE") {
    if (!oldRow?.id) return current;
    return current.filter((item) => item.id !== oldRow.id);
  }

  if (!nextRow?.id) return current;
  const index = current.findIndex((item) => item.id === nextRow.id);
  const next = index === -1 ? [...current, nextRow] : current.map((item) => (item.id === nextRow.id ? nextRow : item));
  return sort ? sort(next) : next;
}

function sortPlayers(players: Player[]): Player[] {
  return [...players].sort((a, b) => a.joined_at.localeCompare(b.joined_at));
}

function sortCustomQuestions(questions: CustomQuestion[]): CustomQuestion[] {
  return [...questions].sort((a, b) => a.created_at.localeCompare(b.created_at));
}

function sortAskedQuestions(questions: AskedQuestion[]): AskedQuestion[] {
  return [...questions].sort((a, b) => a.asked_at.localeCompare(b.asked_at));
}

type VoteScope =
  | { kind: "history" }
  | { kind: "round"; gameType: GameType; questionId: number }
  | { kind: "none" };

type RatingScope =
  | { kind: "history" }
  | { kind: "round"; questionId: number; targetPlayerId: string | null }
  | { kind: "none" };

function getVoteScope(room: Room | null): VoteScope {
  if (!room) return { kind: "none" };
  if (room.status === "end_game_summary") return { kind: "history" };
  if (!room.game_type || room.status === "lobby" || room.status === "ended") return { kind: "none" };

  if (
    (room.game_type === "majority" || room.game_type === "minority") &&
    (room.status === "reveal_results" || room.status === "scoreboard")
  ) {
    return { kind: "history" };
  }

  if (room.game_type === "intrus") {
    const pairId = room.intrus_game_state?.pairId;
    return typeof pairId === "number" ? { kind: "round", gameType: "intrus", questionId: pairId } : { kind: "none" };
  }

  return typeof room.current_question_id === "number"
    ? { kind: "round", gameType: room.game_type, questionId: room.current_question_id }
    : { kind: "none" };
}

function getRatingScope(room: Room | null): RatingScope {
  if (!room || room.game_type !== "jauge") return { kind: "none" };
  if (room.status === "end_game_summary") return { kind: "history" };
  if (room.status === "lobby" || room.status === "ended" || typeof room.current_question_id !== "number") return { kind: "none" };
  return {
    kind: "round",
    questionId: room.current_question_id,
    targetPlayerId: room.jauge_game_state?.currentTargetPlayerId ?? null,
  };
}

function isVoteInScope(vote: Vote, room: Room | null): boolean {
  const scope = getVoteScope(room);
  if (scope.kind === "history") return true;
  return scope.kind === "round" && vote.game_type === scope.gameType && vote.question_id === scope.questionId;
}

function isRatingInScope(rating: Rating, room: Room | null): boolean {
  const scope = getRatingScope(room);
  if (scope.kind === "history") return true;
  return (
    scope.kind === "round" &&
    rating.question_id === scope.questionId &&
    (!scope.targetPlayerId || rating.target_player_id === scope.targetPlayerId)
  );
}

function getLiveScopeKey(room: Room | null): string {
  const voteScope = getVoteScope(room);
  const ratingScope = getRatingScope(room);
  const voteKey = voteScope.kind === "round"
    ? `vote:${voteScope.gameType}:${voteScope.questionId}`
    : `vote:${voteScope.kind}`;
  const ratingKey = ratingScope.kind === "round"
    ? `rating:${ratingScope.questionId}:${ratingScope.targetPlayerId ?? ""}`
    : `rating:${ratingScope.kind}`;
  return `${room?.game_type ?? "none"}:${room?.status ?? "none"}:${voteKey}:${ratingKey}`;
}
