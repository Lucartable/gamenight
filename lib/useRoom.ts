"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AskedQuestion, CustomQuestion, Player, Rating, Room, Vote } from "@/types/database";
import { getSupabase } from "./supabase";

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
  refresh: () => Promise<void>;
}

// Intervalle du polling de secours, au cas où la realtime ne fonctionne pas
// (publication non configurée, RLS, plan gratuit saturé, etc.).
const POLL_INTERVAL_MS = 1500;

/**
 * S'abonne en temps réel à une salle (rooms + players + votes + ratings + asked_questions).
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
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [customQuestions, setCustomQuestions] = useState<CustomQuestion[]>([]);
  const [askedQuestions, setAskedQuestions] = useState<AskedQuestion[]>([]);
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
    // Compteur de séquence pour ignorer les résultats de fetch obsolètes.
    // Sans ça, un fetch lent du polling peut revenir APRÈS une action récente
    // et écraser l'état frais avec des données périmées (race condition).
    let fetchSeq = 0;

    async function doRefresh() {
      if (!roomId || cancelled) return;
      const mySeq = ++fetchSeq;
      const [p, v, rt, cq, r, aq] = await Promise.all([
        supabase.from("players").select("*").eq("room_id", roomId).order("joined_at"),
        supabase.from("votes").select("*").eq("room_id", roomId),
        supabase.from("ratings").select("*").eq("room_id", roomId),
        supabase.from("custom_questions").select("*").eq("room_id", roomId).order("created_at"),
        supabase.from("rooms").select("*").eq("id", roomId).single(),
        supabase.from("asked_questions").select("*").eq("room_id", roomId),
      ]);
      // Si un autre refresh plus récent a démarré entre-temps, on jette nos
      // résultats — ils sont peut-être plus vieux que ce qui est déjà affiché.
      if (cancelled || mySeq !== fetchSeq) return;
      if (p.data) setPlayers(p.data as Player[]);
      if (v.data) setVotes(v.data as Vote[]);
      if (rt.data) setRatings(rt.data as Rating[]);
      if (cq.data) setCustomQuestions(cq.data as CustomQuestion[]);
      if (r.data) setRoom(r.data as Room);
      if (aq.data) {
        const asked = aq.data as AskedQuestion[];
        setAskedQuestions(asked);
        setAskedQuestionIds(asked.map((d) => d.question_id));
      }
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
          { event: "*", schema: "public", table: "ratings", filter: `room_id=eq.${r.id}` },
          () => doRefresh()
        )
        .on("postgres_changes",
          { event: "*", schema: "public", table: "custom_questions", filter: `room_id=eq.${r.id}` },
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

  return { room, players, votes, ratings, customQuestions, askedQuestions, askedQuestionIds, loading, error, refresh };
}
