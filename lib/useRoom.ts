"use client";

import { useEffect, useRef, useState } from "react";
import type { Player, Room, Vote } from "@/types/database";
import { getSupabase } from "./supabase";

interface UseRoomState {
  room: Room | null;
  players: Player[];
  votes: Vote[];
  loading: boolean;
  error: string | null;
}

/**
 * S'abonne en temps réel à une salle (état + joueurs + votes).
 * Recharge à chaque event Supabase pour rester simple : volume très faible
 * (jeu de soirée, ~10 joueurs), donc pas besoin de patcher l'état finement.
 */
export function useRoom(code: string): UseRoomState {
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const roomIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!code) return;
    let cancelled = false;
    const supabase = getSupabase();

    async function refresh(roomId: string) {
      const [p, v, r] = await Promise.all([
        supabase.from("players").select("*").eq("room_id", roomId).order("joined_at"),
        supabase.from("votes").select("*").eq("room_id", roomId),
        supabase.from("rooms").select("*").eq("id", roomId).single(),
      ]);
      if (cancelled) return;
      if (p.data) setPlayers(p.data as Player[]);
      if (v.data) setVotes(v.data as Vote[]);
      if (r.data) setRoom(r.data as Room);
    }

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
      setRoom(r);
      roomIdRef.current = r.id;
      await refresh(r.id);
      setLoading(false);

      // Un seul channel pour les 3 tables.
      const channel = supabase
        .channel(`room:${r.id}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "rooms", filter: `id=eq.${r.id}` },
          () => refresh(r.id)
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "players", filter: `room_id=eq.${r.id}` },
          () => refresh(r.id)
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "votes", filter: `room_id=eq.${r.id}` },
          () => refresh(r.id)
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }

    let cleanup: (() => void) | undefined;
    init().then((fn) => {
      cleanup = fn;
    });

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [code]);

  return { room, players, votes, loading, error };
}
