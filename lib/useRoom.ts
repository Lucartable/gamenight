"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Player, Room, Vote } from "@/types/database";
import { getSupabase } from "./supabase";

interface UseRoomState {
  room: Room | null;
  players: Player[];
  votes: Vote[];
  askedQuestionIds: number[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

// Intervalle du polling de secours, au cas où la realtime ne fonctionne pas
// (publication non configurée, RLS, plan gratuit saturé, etc.).
const POLL_INTERVAL_MS = 1500;

/**
 * S'abonne en temps réel à une salle (rooms + players + votes + asked_questions).
 * Pour rester robuste si la realtime tombe, on combine :
 *   - une souscription Supabase (`postgres_changes`)
 *   - un polling de secours toutes les 1,5 s
 *   - une fonction `refresh()` exposée pour les actions qui veulent un retour
 *     immédiat (sans attendre realtime ni polling)
 */
export function useRoom(code: string): UseRoomState {
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [askedQuestionIds, setAskedQuestionIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Référence vers la dernière fonction refresh effective. On expose un wrapper
  // stable au-dessus, comme ça les useEffect du consommateur n'invalident pas.
  const refreshRef = useRef<() => Promise<void>>(async () => {});
  const refresh = useCallback(() => refreshRef.current(), []);

  useEffect(() => {
    if (!code) return;
    const supabase = getSupabase();
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let roomId: string | null = null;

    async function doRefresh() {
      if (!roomId || cancelled) return;
      const [p, v, r, aq] = await Promise.all([
        supabase.from("players").select("*").eq("room_id", roomId).order("joined_at"),
        supabase.from("votes").select("*").eq("room_id", roomId),
        supabase.from("rooms").select("*").eq("id", roomId).single(),
        supabase.from("asked_questions").select("question_id").eq("room_id", roomId),
      ]);
      if (cancelled) return;
      if (p.data) setPlayers(p.data as Player[]);
      if (v.data) setVotes(v.data as Vote[]);
      if (r.data) setRoom(r.data as Room);
      if (aq.data) setAskedQuestionIds(aq.data.map((d) => d.question_id as number));
    }
    refreshRef.current = doRefresh;

    async function init() {
      const { data, error } = await supabase
        .from("rooms")
        .select("*")
        .eq("code", code)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        setError("Salle introuvable.");
        setLoading(false);
        return;
      }
      const r = data as Room;
      roomId = r.id;
      setRoom(r);
      await doRefresh();
      setLoading(false);

      channel = supabase
        .channel(`room:${r.id}`)
        .on("postgres_changes",
          { event: "*", schema: "public", table: "rooms", filter: `id=eq.${r.id}` },
          () => doRefresh()
        )
        .on("postgres_changes",
          { event: "*", schema: "public", table: "players", filter: `room_id=eq.${r.id}` },
          () => doRefresh()
        )
        .on("postgres_changes",
          { event: "*", schema: "public", table: "votes", filter: `room_id=eq.${r.id}` },
          () => doRefresh()
        )
        .on("postgres_changes",
          { event: "*", schema: "public", table: "asked_questions", filter: `room_id=eq.${r.id}` },
          () => doRefresh()
        )
        .subscribe();
    }

    init();

    const pollId = setInterval(() => {
      void doRefresh();
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(pollId);
      if (channel) supabase.removeChannel(channel);
    };
  }, [code]);

  return { room, players, votes, askedQuestionIds, loading, error, refresh };
}
