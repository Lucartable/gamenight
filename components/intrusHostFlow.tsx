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
  buildInitialIntrusState,
  buildNextIntrusRound,
  currentCluePlayerId,
  isCluePhaseDone,
  type IntrusOrderMode,
} from "@/lib/intrusGame";
import {
  applyRoundResultToScores,
  type IntrusRoundResult,
} from "@/lib/intrusScoring";
import { INTRUS_PAIR_CATEGORIES, type IntrusPairCategory } from "@/lib/intrusPairs";
import { getSupabase } from "@/lib/supabase";
import { playSfx } from "@/lib/audio";
import type {
  IntrusGameState,
  IntrusMode,
  IntrusRoundRecord,
  Player,
  Room,
  Vote,
} from "@/types/database";

interface IntrusHostFlowProps {
  room: Room;
  participants: Player[];
  hostPlayer: Player | null;
  votes: Vote[];
  totalQuestions: number;
  isTv: boolean;
  busy: boolean;
  runTransition: (action: () => Promise<void>) => Promise<void>;
  refresh: () => Promise<void>;
  onEndGame: () => void;
}

export function IntrusHostFlow({
  room,
  participants,
  hostPlayer,
  votes,
  totalQuestions,
  isTv,
  busy,
  runTransition,
  refresh,
  onEndGame,
}: IntrusHostFlowProps) {
  const intrusState = room.intrus_game_state;
  const isLobby = room.status === "lobby";

  // Config lobby
  const [orderMode, setOrderMode] = useState<IntrusOrderMode>("random");
  const [mode, setMode] = useState<IntrusMode>("unconscious");
  const [clueDuration, setClueDuration] = useState(15);
  const [voteDuration, setVoteDuration] = useState(25);
  const [finaleEnabled, setFinaleEnabled] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState<IntrusPairCategory[]>(() => [
    "food",
    "internet",
    "gaming",
    "brands",
    "movies_tv",
    "social",
  ]);

  const myVote = useMemo<Vote | undefined>(() => {
    if (!hostPlayer || !intrusState) return undefined;
    return votes.find(
      (vote) =>
        vote.game_type === "intrus" &&
        vote.voter_player_id === hostPlayer.id &&
        vote.question_id === intrusState.pairId
    );
  }, [hostPlayer, intrusState, votes]);

  const intrusVotes = useMemo(() => {
    if (!intrusState) return [];
    return votes.filter((vote) => vote.game_type === "intrus" && vote.question_id === intrusState.pairId);
  }, [intrusState, votes]);

  const votesByVoter = useMemo(() => new Map(intrusVotes.map((v) => [v.voter_player_id, v])), [intrusVotes]);
  const votesCount = votesByVoter.size;
  const totalVoters = participants.length;

  // Auto-advance: clues phase done → reveal_clues
  useEffect(() => {
    if (!intrusState || intrusState.phase !== "clues") return;
    if (!isCluePhaseDone(intrusState)) return;
    void advancePhase("reveal_clues");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intrusState?.phase, intrusState?.currentClueIndex, intrusState?.playerOrder.length]);

  // Auto-advance: vote phase done → reveal_final
  useEffect(() => {
    if (!intrusState || intrusState.phase !== "vote") return;
    if (votesCount < totalVoters) return;
    void revealFinal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intrusState?.phase, votesCount, totalVoters]);

  // Sound on phase transitions
  const lastPhase = useMemo(() => intrusState?.phase ?? null, [intrusState?.phase]);
  useEffect(() => {
    if (!lastPhase) return;
    if (lastPhase === "vote") playSfx("roundStart");
    else if (lastPhase === "reveal_final") playSfx("reveal");
  }, [lastPhase]);

  async function persistState(nextState: IntrusGameState) {
    const { error } = await getSupabase()
      .from("rooms")
      .update({ intrus_game_state: nextState })
      .eq("id", room.id);
    if (error) throw error;
    await refresh();
  }

  async function startGame() {
    if (participants.length < 3) return;
    const initial = buildInitialIntrusState({
      participants,
      selectedCategories,
      orderMode,
      clueDurationSec: clueDuration,
      voteDurationSec: voteDuration,
      mode,
      finaleEnabled,
    });
    if (!initial) return;
    await runTransition(async () => {
      const { error } = await getSupabase()
        .from("rooms")
        .update({
          status: "question_active",
          current_question_id: null,
          current_question_snapshot: null,
          round_question_ids: [initial.pairId],
          question_started_at: new Date().toISOString(),
          reveal_started_at: null,
          scoreboard_started_at: null,
          intrus_game_state: initial,
        })
        .eq("id", room.id);
      if (error) throw error;
    });
  }

  async function advancePhase(nextPhase: IntrusGameState["phase"]) {
    if (!intrusState) return;
    const patched: IntrusGameState = {
      ...intrusState,
      phase: nextPhase,
      votePhaseStartedAt: nextPhase === "vote" ? new Date().toISOString() : intrusState.votePhaseStartedAt,
    };
    await runTransition(() => persistState(patched));
  }

  async function forceNextClue() {
    if (!intrusState) return;
    const currentId = currentCluePlayerId(intrusState);
    if (!currentId) return;
    const patched = appendClue(intrusState, { playerId: currentId, text: null, ts: Date.now() });
    await runTransition(() => persistState(patched));
  }

  async function revealFinal() {
    if (!intrusState) return;
    if (intrusState.phase === "reveal_final") return;
    const result = computeIntrusRoundResultMemo(intrusState, intrusVotes, participants);
    const nextScores = applyRoundResultToScores(intrusState.scoresByPlayer, result);
    const record: IntrusRoundRecord = {
      roundNumber: intrusState.roundNumber,
      pairId: intrusState.pairId,
      intrusPlayerId: intrusState.intrusPlayerId,
      mainWord: intrusState.mainWord,
      intrusWord: intrusState.intrusWord,
      intrusFound: result.intrusFound,
      topVotedPlayerId: result.topVotedPlayerId,
      finaleCorrect: result.finaleCorrect,
      clues: intrusState.clues,
    };
    const patched: IntrusGameState = {
      ...intrusState,
      phase: "reveal_final",
      scoresByPlayer: nextScores,
      history: [...intrusState.history.filter((h) => h.roundNumber !== record.roundNumber), record],
    };
    await runTransition(() => persistState(patched));
  }

  async function nextRound() {
    if (!intrusState) return;
    if (intrusState.roundNumber >= totalQuestions) {
      const ended: IntrusGameState = { ...intrusState, phase: "ended" };
      await runTransition(() => persistState(ended));
      return;
    }
    const nextState = buildNextIntrusRound(intrusState, {
      participants,
      selectedCategories,
      orderMode,
    });
    if (!nextState) return;
    await runTransition(async () => {
      const { error } = await getSupabase()
        .from("rooms")
        .update({
          status: "question_active",
          intrus_game_state: nextState,
          question_started_at: new Date().toISOString(),
          reveal_started_at: null,
          scoreboard_started_at: null,
          round_question_ids: [...(room.round_question_ids ?? []), nextState.pairId],
        })
        .eq("id", room.id);
      if (error) throw error;
    });
  }

  const result = useMemo<IntrusRoundResult | null>(() => {
    if (!intrusState || (intrusState.phase !== "reveal_final" && intrusState.phase !== "ended")) return null;
    return computeIntrusRoundResultMemo(intrusState, intrusVotes, participants);
  }, [intrusState, intrusVotes, participants]);

  // ===== Lobby =====
  if (isLobby) {
    return (
      <section className="game-panel-enter flex flex-1 flex-col gap-4">
        <div className="card p-5">
          <div className="text-xs font-black uppercase tracking-[0.24em] text-neon-pink">L&apos;Intrus</div>
          <h2 className="mt-1 text-2xl font-black">Configure la partie</h2>
          <p className="mt-2 text-sm font-semibold text-white/60">
            Un joueur reçoit un mot différent. Les autres doivent le démasquer en {totalQuestions} manche(s).
          </p>
        </div>

        <div className="card p-5">
          <h3 className="mb-3 text-sm font-black uppercase tracking-wider text-white/55">Mode</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setMode("unconscious")}
              className={`rounded-2xl border p-3 text-left transition ${
                mode === "unconscious"
                  ? "border-neon-cyan bg-neon-cyan/10 shadow-glow-cyan"
                  : "border-white/10 bg-white/5"
              }`}
            >
              <div className="text-sm font-black">Intrus inconscient</div>
              <div className="text-xs font-semibold text-white/55">L&apos;intrus pense avoir le bon mot.</div>
            </button>
            <button
              type="button"
              onClick={() => setMode("conscious")}
              className={`rounded-2xl border p-3 text-left transition ${
                mode === "conscious"
                  ? "border-neon-pink bg-neon-pink/10 shadow-glow-pink"
                  : "border-white/10 bg-white/5"
              }`}
            >
              <div className="text-sm font-black">Intrus conscient</div>
              <div className="text-xs font-semibold text-white/55">Le joueur sait qu&apos;il est l&apos;intrus.</div>
            </button>
          </div>
        </div>

        <div className="card p-5">
          <h3 className="mb-3 text-sm font-black uppercase tracking-wider text-white/55">Catégories</h3>
          <div className="flex flex-wrap gap-2">
            {INTRUS_PAIR_CATEGORIES.map((cat) => {
              const active = selectedCategories.includes(cat.id);
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() =>
                    setSelectedCategories((prev) =>
                      active ? prev.filter((id) => id !== cat.id) : [...prev, cat.id]
                    )
                  }
                  className={`rounded-full border px-3 py-2 text-sm font-bold transition ${
                    active
                      ? "border-neon-pink bg-neon-pink/20 text-white"
                      : "border-white/10 bg-white/5 text-white/70 hover:border-white/20"
                  }`}
                >
                  {cat.emoji} {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="card p-5">
          <h3 className="mb-3 text-sm font-black uppercase tracking-wider text-white/55">Ordre de parole</h3>
          <div className="grid gap-2 sm:grid-cols-3">
            {(["random", "arrival", "custom"] as IntrusOrderMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setOrderMode(m)}
                className={`rounded-2xl border p-3 text-left transition ${
                  orderMode === m
                    ? "border-neon-cyan bg-neon-cyan/10"
                    : "border-white/10 bg-white/5"
                }`}
              >
                <div className="text-sm font-black">
                  {m === "random" ? "Aléatoire" : m === "arrival" ? "Ordre d'arrivée" : "Personnalisé"}
                </div>
                <div className="text-xs font-semibold text-white/55">
                  {m === "random" ? "Mélangé à chaque manche." : m === "arrival" ? "Selon l'entrée dans la room." : "Tu définis l'ordre (à la même que d'arrivée)."}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <h3 className="mb-3 text-sm font-black uppercase tracking-wider text-white/55">Timers</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-bold uppercase tracking-wider text-white/55">
              Temps par indice
              <select
                value={clueDuration}
                onChange={(event) => setClueDuration(Number(event.target.value))}
                className="input mt-2"
              >
                {[8, 12, 15, 20, 25, 30].map((s) => (
                  <option key={s} value={s}>{s} sec</option>
                ))}
              </select>
            </label>
            <label className="text-xs font-bold uppercase tracking-wider text-white/55">
              Temps de vote
              <select
                value={voteDuration}
                onChange={(event) => setVoteDuration(Number(event.target.value))}
                className="input mt-2"
              >
                {[15, 25, 35, 45, 60].map((s) => (
                  <option key={s} value={s}>{s} sec</option>
                ))}
              </select>
            </label>
          </div>
          <button
            type="button"
            onClick={() => setFinaleEnabled((v) => !v)}
            className={`mt-3 flex w-full items-center justify-between rounded-2xl border p-3 transition ${
              finaleEnabled ? "border-neon-yellow/50 bg-neon-yellow/10" : "border-white/10 bg-white/5 text-white/70"
            }`}
          >
            <span className="font-black">Dernière chance pour l&apos;intrus</span>
            <span className={finaleEnabled ? "text-neon-yellow" : "text-white/45"}>{finaleEnabled ? "ON" : "OFF"}</span>
          </button>
        </div>

        <div className="card p-5">
          <button
            type="button"
            disabled={busy || participants.length < 3 || selectedCategories.length === 0}
            onClick={() => void startGame()}
            className="btn-primary w-full text-xl"
          >
            Lancer la partie
          </button>
          {participants.length < 3 && (
            <p className="mt-3 text-center text-sm text-neon-yellow">Il faut au moins 3 joueurs pour lancer.</p>
          )}
          {selectedCategories.length === 0 && (
            <p className="mt-3 text-center text-sm text-neon-pink">Choisis au moins une catégorie.</p>
          )}
        </div>

        <IntrusScoreboardSection state={intrusState} participants={participants} />
      </section>
    );
  }

  if (!intrusState) {
    return (
      <section className="card p-5 text-center">
        <p className="font-semibold text-white/65">Partie Intrus en attente…</p>
      </section>
    );
  }

  const isFinal = intrusState.roundNumber >= totalQuestions;

  return (
    <>
      {intrusState.phase === "clues" && (
        <IntrusCluesScreen
          state={intrusState}
          participants={participants}
          me={hostPlayer}
          isTv={isTv}
          busy={busy}
          onForceNext={() => void forceNextClue()}
          isHostController
        />
      )}
      {intrusState.phase === "reveal_clues" && (
        <IntrusRevealCluesScreen
          state={intrusState}
          participants={participants}
          me={hostPlayer}
          isTv={isTv}
          onStartVote={() => void advancePhase("vote")}
          busy={busy}
          isHostController
        />
      )}
      {intrusState.phase === "vote" && (
        <IntrusVoteScreen
          state={intrusState}
          participants={participants}
          me={hostPlayer}
          isTv={isTv}
          myVoteTargetId={myVote?.selected_player_id ?? null}
          votesCount={votesCount}
          totalVoters={totalVoters}
          isHostController
          busy={busy}
          onForceReveal={() => void revealFinal()}
        />
      )}
      {(intrusState.phase === "reveal_final" || intrusState.phase === "ended") && result && (
        <IntrusRevealFinalScreen
          state={intrusState}
          participants={participants}
          me={hostPlayer}
          isTv={isTv}
          result={result}
          finaleAttempt={intrusState.finaleAttempt}
          isFinal={isFinal}
          busy={busy}
          isHostController
          onNextRound={() => void nextRound()}
          onEnd={onEndGame}
        />
      )}
      <IntrusScoreboardSection state={intrusState} participants={participants} />
    </>
  );
}
