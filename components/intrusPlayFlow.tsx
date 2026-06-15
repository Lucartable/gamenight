"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  IntrusCluesScreen,
  IntrusRevealCluesScreen,
  IntrusRevealFinalScreen,
  IntrusScoreboardSection,
  IntrusVoteScreen,
  computeIntrusRoundResultMemo,
} from "./intrusMode";
import {
  appendClue,
  currentCluePlayerId,
} from "@/lib/intrusGame";
import { getSupabase } from "@/lib/supabase";
import { playSfx } from "@/lib/audio";
import { applyIntrusFinaleAttempt } from "@/lib/intrusScoring";
import type {
  Player,
  Room,
  Vote,
} from "@/types/database";

interface IntrusPlayFlowProps {
  room: Room;
  participants: Player[];
  me: Player;
  votes: Vote[];
  refresh: (target?: "room" | "votes" | "all") => Promise<void>;
}

export function IntrusPlayFlow({ room, participants, me, votes, refresh }: IntrusPlayFlowProps) {
  const intrusState = room.intrus_game_state;
  const [submittingClue, setSubmittingClue] = useState(false);
  const [submittingVote, setSubmittingVote] = useState(false);
  const [submittingFinale, setSubmittingFinale] = useState(false);
  const [optimisticVoteTargetId, setOptimisticVoteTargetId] = useState<string | null>(null);

  useEffect(() => {
    setOptimisticVoteTargetId(null);
  }, [intrusState?.pairId]);

  const myVote = useMemo<Vote | undefined>(() => {
    if (!intrusState) return undefined;
    return votes.find(
      (vote) =>
        vote.game_type === "intrus" &&
        vote.voter_player_id === me.id &&
        vote.question_id === intrusState.pairId
    );
  }, [intrusState, votes, me.id]);

  const intrusVotes = useMemo(() => {
    if (!intrusState) return [];
    return votes.filter((vote) => vote.game_type === "intrus" && vote.question_id === intrusState.pairId);
  }, [intrusState, votes]);

  const votesCount = useMemo(() => {
    const voters = new Set(intrusVotes.map((v) => v.voter_player_id));
    if (optimisticVoteTargetId) voters.add(me.id);
    return voters.size;
  }, [intrusVotes, me.id, optimisticVoteTargetId]);

  const submitClue = useCallback(
    async (text: string) => {
      if (!intrusState || submittingClue) return;
      if (currentCluePlayerId(intrusState) !== me.id) return;
      setSubmittingClue(true);
      playSfx("validate");
      try {
        const nextState = appendClue(intrusState, { playerId: me.id, text, ts: Date.now() });
        const { error } = await getSupabase()
          .from("rooms")
          .update({ intrus_game_state: nextState })
          .eq("id", room.id);
        if (error) throw error;
        await refresh("room");
      } finally {
        setSubmittingClue(false);
      }
    },
    [intrusState, submittingClue, me.id, room.id, refresh]
  );

  const passTurn = useCallback(async () => {
    if (!intrusState || submittingClue) return;
    if (currentCluePlayerId(intrusState) !== me.id) return;
    setSubmittingClue(true);
    try {
      const nextState = appendClue(intrusState, { playerId: me.id, text: null, ts: Date.now() });
      const { error } = await getSupabase()
        .from("rooms")
        .update({ intrus_game_state: nextState })
        .eq("id", room.id);
      if (error) throw error;
      await refresh("room");
    } finally {
      setSubmittingClue(false);
    }
  }, [intrusState, submittingClue, me.id, room.id, refresh]);

  const pickVote = useCallback(
    async (targetId: string) => {
      if (!intrusState || submittingVote || targetId === me.id) return;
      setSubmittingVote(true);
      playSfx("validate");
      try {
        const { error } = await getSupabase()
          .from("votes")
          .upsert(
            {
              room_id: room.id,
              game_type: "intrus",
              voter_player_id: me.id,
              question_id: intrusState.pairId,
              selected_option: null,
              selected_player_id: targetId,
            },
            { onConflict: "room_id,game_type,question_id,voter_player_id" }
          );
        if (error) throw error;
        setOptimisticVoteTargetId(targetId);
      } finally {
        setSubmittingVote(false);
      }
    },
    [intrusState, submittingVote, me.id, room.id]
  );

  const submitFinale = useCallback(
    async (guess: string) => {
      if (!intrusState || submittingFinale) return;
      if (intrusState.intrusPlayerId !== me.id) return;
      if (intrusState.finaleCorrect !== null) return;
      const isCorrect = normalize(guess) === normalize(intrusState.mainWord);
      setSubmittingFinale(true);
      try {
        const nextState = applyIntrusFinaleAttempt({
          state: intrusState,
          votes: intrusVotes,
          players: participants,
          attempt: guess,
          correct: isCorrect,
        });
        const { error } = await getSupabase()
          .from("rooms")
          .update({ intrus_game_state: nextState })
          .eq("id", room.id);
        if (error) throw error;
        await refresh("room");
      } finally {
        setSubmittingFinale(false);
      }
    },
    [intrusState, submittingFinale, me.id, intrusVotes, participants, room.id, refresh]
  );

  if (!intrusState) {
    return (
      <section className="card p-5 text-center">
        <p className="font-semibold text-white/65">En attente du lancement de la partie…</p>
      </section>
    );
  }

  const result = (intrusState.phase === "reveal_final" || intrusState.phase === "ended")
    ? computeIntrusRoundResultMemo(intrusState, intrusVotes, participants)
    : null;

  return (
    <>
      {intrusState.phase === "clues" && (
        <IntrusCluesScreen
          state={intrusState}
          participants={participants}
          me={me}
          isTv={false}
          onSubmitClue={submitClue}
          submittingClue={submittingClue}
          onPass={passTurn}
        />
      )}
      {intrusState.phase === "reveal_clues" && (
        <IntrusRevealCluesScreen
          state={intrusState}
          participants={participants}
          me={me}
          isTv={false}
        />
      )}
      {intrusState.phase === "vote" && (
        <IntrusVoteScreen
          state={intrusState}
          participants={participants}
          me={me}
          isTv={false}
          myVoteTargetId={optimisticVoteTargetId ?? myVote?.selected_player_id ?? null}
          onPickVote={pickVote}
          submittingVote={submittingVote}
          votesCount={votesCount}
          totalVoters={participants.length}
        />
      )}
      {(intrusState.phase === "reveal_final" || intrusState.phase === "ended") && result && (
        <IntrusRevealFinalScreen
          state={intrusState}
          participants={participants}
          me={me}
          isTv={false}
          result={result}
          finaleAttempt={intrusState.finaleAttempt}
          onSubmitFinale={submitFinale}
          submittingFinale={submittingFinale}
          isFinal={false}
        />
      )}
      <IntrusScoreboardSection state={intrusState} participants={participants} votes={votes} />
    </>
  );
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[\s\p{P}]+/gu, " ")
    .trim();
}
