"use client";

import { useEffect, useRef, useState } from "react";
import type { Player, Room, Vote } from "@/types/database";
import { getSupabase } from "./supabase";

interface UseRoomState {
  room: Room | null;
  players: Player[];
  votes: Vote[];
  askedQuestionIds: number[];
  loading: boolean;
  error: string | null;
}

/**
 * S'abonne en temps réel à une salle (état + joueurs + votes + asked_questions).
 * Recharge à chaque event Supabase pour rester simple : volume très faible
 * (jeu de soirée, ~10 joueurs), donc pas besoin de patcher l'état finement.
 */
export function useRoom(code: string): UseRoomState {
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [askedQuestionIds, setAskedQuestionIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (!code) return;
    cancelledRef.current = false;
    const supabase = getSupabase();
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function refresh(roomId: string) {
      const [p, v, r, aq] = await Promise.all([
        supabase.from("players").select("*").eq("room_id", roomId).order("joined_at"),
        supabase.from("votes").select("*").eq("room_id", roomId),
        supabase.from("rooms").select("*").eq("id", roomId).single(),
        supabase.from("asked_questions").select("question_id").eq("room_id", roomId),
      ]);
      if (cancelledRef.current) return;
      if (p.data) setPlayers(p.data as Player[]);
      if (v.data) setVotes(v.data as Vote[]);
      if (r.data) setRoom(r.data as Room);
      if (aq.data) setAskedQuestionIds(aq.data.map((d) => d.question_id as number));
    }

    async function init() {
      const { data, error } = await supabase
        .from("rooms")
        .select("*")
        .eq("code", code)
        .maybeSingle();
      if (cancelledRef.current) return;
      if (error || !data) {
        setError("Salle introuvable.");
        setLoading(false);
        return;
      }
      const r = data as Room;
      setRoom(r);
      await refresh(r.id);
      setLoading(false);

      channel = supabase
        .channel(`room:${r.id}`)
        .on("postgres_changes",
          { event: "*", schema: "public", table: "rooms", filter: `id=eq.${r.id}` },
          () => refresh(r.id)
        )
        .on("postgres_changes",
          { event: "*", schema: "public", table: "players", filter: `room_id=eq.${r.id}` },
          () => refresh(r.id)
        )
        .on("postgres_changes",
          { event: "*", schema: "public", table: "votes", filter: `room_id=eq.${r.id}` },
          () => refresh(r.id)
        )
        .on("postgres_changes",
          { event: "*", schema: "public", table: "asked_questions", filter: `room_id=eq.${r.id}` },
          () => refresh(r.id)
        )
        .subscribe();
    }

    init();

    return () => {
      cancelledRef.current = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [code]);

  return { room, players, votes, askedQuestionIds, loading, error };
}
