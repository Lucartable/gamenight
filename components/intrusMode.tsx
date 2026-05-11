"use client";

import { memo, useEffect, useMemo, useState } from "react";
import { PlayerAvatar } from "./playerAvatar";
import {
  buildIntrusScoreboard,
  computeIntrusRoundResult,
  type IntrusRoundResult,
} from "@/lib/intrusScoring";
import {
  currentCluePlayerId,
  getWordForPlayer,
  isPlayerIntrus,
} from "@/lib/intrusGame";
import { useCountdown } from "@/lib/useCountdown";
import { Button, Input } from "@/components/ui";
import type {
  IntrusGameState,
  Player,
  Vote,
} from "@/types/database";

interface IntrusBoardProps {
  state: IntrusGameState;
  participants: Player[];
  me: Player | null;
  isTv: boolean;
}

/** Écran "phase clues" — affiche timer, current player, clues données so far. */
export const IntrusCluesScreen = memo(function IntrusCluesScreen({
  state,
  participants,
  me,
  isTv,
  onSubmitClue,
  submittingClue,
  onPass,
  onForceNext,
  busy,
  isHostController,
}: IntrusBoardProps & {
  onSubmitClue?: (text: string) => void;
  submittingClue?: boolean;
  onPass?: () => void;
  onForceNext?: () => void;
  busy?: boolean;
  isHostController?: boolean;
}) {
  const left = useCountdown(state.cluePhaseStartedAt, state.clueDurationSec);
  const currentId = currentCluePlayerId(state);
  const currentPlayer = participants.find((p) => p.id === currentId) ?? null;
  const myTurn = me?.id === currentId;
  const myWord = me ? getWordForPlayer(state, me.id) : null;
  const [draft, setDraft] = useState("");

  useEffect(() => {
    setDraft("");
  }, [currentId, state.roundNumber]);

  const cluesSoFar = state.clues;
  const remaining = Math.max(0, state.playerOrder.length - state.currentClueIndex);

  return (
    <section className="game-panel-enter flex flex-1 flex-col gap-3">
      <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <div className="text-xs font-black uppercase tracking-wider text-neon-cyan">Manche {state.roundNumber}</div>
          <div className="text-lg font-black">Tour de parole : {remaining}/{state.playerOrder.length}</div>
        </div>
        <div className={left <= 5 ? "timer-hot text-neon-pink" : ""}>
          <span className="text-3xl font-black tabular-nums">{left}</span>
          <span className="ml-2 text-white/55">sec</span>
        </div>
      </div>

      {!isTv && myWord && (
        <div className="card border border-neon-yellow/40 bg-neon-yellow/10 p-4 text-center">
          <div className="text-[10px] font-black uppercase tracking-widest text-neon-yellow">Ton mot secret</div>
          <div className="mt-1 text-3xl font-black">{myWord}</div>
          <p className="mt-1 text-xs font-semibold text-white/60">
            Garde-le pour toi. Donne un indice court : un mot ou une mini phrase.
          </p>
        </div>
      )}

      <div className="card flex flex-col items-center gap-3 p-5 text-center">
        <div className="text-[11px] font-black uppercase tracking-[0.24em] text-white/45">À toi de parler</div>
        {currentPlayer ? (
          <>
            <PlayerAvatar player={currentPlayer} size="xl" />
            <div className="text-3xl font-black">{currentPlayer.name}</div>
          </>
        ) : (
          <div className="text-xl font-black text-white/55">Plus personne dans l&apos;ordre.</div>
        )}
        {myTurn && !isTv && (
          <form
            className="mt-2 w-full max-w-md"
            onSubmit={(event) => {
              event.preventDefault();
              if (!onSubmitClue || !draft.trim()) return;
              onSubmitClue(draft.trim());
            }}
          >
            <Input
              value={draft}
              onChange={(event) => setDraft(event.target.value.slice(0, 60))}
              placeholder="Un mot ou une mini phrase…"
              maxLength={60}
              autoFocus
            />
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button type="submit" variant="primary" size="md" fullWidth disabled={submittingClue || !draft.trim()}>
                {submittingClue ? "Envoi…" : "Valider"}
              </Button>
              <Button type="button" variant="secondary" size="md" fullWidth disabled={submittingClue} onClick={() => onPass?.()}>
                Passer
              </Button>
            </div>
          </form>
        )}
        {!myTurn && !isTv && (
          <p className="text-sm font-semibold text-white/55">
            En attente de {currentPlayer?.name ?? "…"}. Reste discret sur ton mot.
          </p>
        )}
        {isTv && (
          <p className="text-sm font-semibold text-white/55">
            En attente d&apos;un indice depuis le téléphone de {currentPlayer?.name ?? "…"}.
          </p>
        )}
        {isHostController && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={onForceNext}
            className="mt-2 text-neon-cyan"
          >
            Forcer le passage
          </Button>
        )}
      </div>

      <CluesFeed clues={cluesSoFar} participants={participants} state={state} />
    </section>
  );
});

/** Écran reveal des clues — bouton "Lancer le vote" pour le host. */
export const IntrusRevealCluesScreen = memo(function IntrusRevealCluesScreen({
  state,
  participants,
  me,
  isTv,
  onStartVote,
  busy,
  isHostController,
}: IntrusBoardProps & {
  onStartVote?: () => void;
  busy?: boolean;
  isHostController?: boolean;
}) {
  const myWord = me ? getWordForPlayer(state, me.id) : null;

  return (
    <section className="game-panel-enter flex flex-1 flex-col gap-3">
      <div className="card p-5 text-center">
        <div className="text-xs font-black uppercase tracking-[0.24em] text-neon-cyan">Indices révélés</div>
        <h2 className="mt-1 text-3xl font-black">Que disent les autres ?</h2>
        {!isTv && myWord && (
          <p className="mt-2 text-sm font-semibold text-white/60">Ton mot : <strong className="text-white">{myWord}</strong></p>
        )}
      </div>

      <CluesFeed clues={state.clues} participants={participants} state={state} expanded />

      {isHostController && (
        <Button type="button" variant="primary" size="lg" fullWidth disabled={busy} onClick={onStartVote} className="mt-2">
          Lancer le vote
        </Button>
      )}
    </section>
  );
});

interface IntrusVoteScreenProps extends IntrusBoardProps {
  myVoteTargetId: string | null;
  onPickVote?: (targetId: string) => void;
  submittingVote?: boolean;
  onForceReveal?: () => void;
  busy?: boolean;
  isHostController?: boolean;
  votesCount: number;
  totalVoters: number;
}

export const IntrusVoteScreen = memo(function IntrusVoteScreen({
  state,
  participants,
  me,
  isTv,
  myVoteTargetId,
  onPickVote,
  submittingVote,
  onForceReveal,
  busy,
  isHostController,
  votesCount,
  totalVoters,
}: IntrusVoteScreenProps) {
  const left = useCountdown(state.votePhaseStartedAt, state.voteDurationSec);
  const myWord = me ? getWordForPlayer(state, me.id) : null;
  const progress = totalVoters > 0 ? Math.min(100, Math.round((votesCount / totalVoters) * 100)) : 0;

  return (
    <section className="game-panel-enter flex flex-1 flex-col gap-3">
      <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <div className="text-xs font-black uppercase tracking-wider text-neon-pink">Vote en cours</div>
          <div className="text-lg font-black">{votesCount}/{totalVoters} votes envoyés</div>
        </div>
        <div className={left <= 5 ? "timer-hot text-neon-pink" : ""}>
          <span className="text-3xl font-black tabular-nums">{left}</span>
          <span className="ml-2 text-white/55">sec</span>
        </div>
      </div>

      {!isTv && myWord && (
        <div className="card border border-neon-yellow/40 bg-neon-yellow/10 p-3 text-center">
          <div className="text-[10px] font-black uppercase tracking-widest text-neon-yellow">Ton mot</div>
          <div className="text-2xl font-black">{myWord}</div>
        </div>
      )}

      <div className="card p-4">
        <div className="text-xs font-black uppercase tracking-wider text-white/55">Qui est l&apos;intrus ?</div>
        <div className="mt-3 grid gap-2">
          {participants.map((player) => {
            const selected = myVoteTargetId === player.id;
            const isSelf = me?.id === player.id;
            return (
              <button
                key={player.id}
                type="button"
                disabled={isTv || !onPickVote || submittingVote || isSelf}
                onClick={() => onPickVote?.(player.id)}
                className={`flex items-center justify-between gap-3 rounded-2xl border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${
                  selected
                    ? "border-neon-pink bg-neon-pink/10 shadow-glow-pink"
                    : "border-white/10 bg-white/5 hover:-translate-y-0.5 hover:border-neon-pink/40"
                }`}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <PlayerAvatar player={player} size="md" />
                  <span className="truncate text-base font-black">{player.name}</span>
                </span>
                {selected && <span className="text-xs font-black uppercase tracking-wider text-neon-pink">Sélectionné</span>}
                {isSelf && <span className="text-xs font-black text-white/40">toi</span>}
              </button>
            );
          })}
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-gradient-to-r from-neon-pink via-neon-purple to-neon-cyan transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {isHostController && (
        <Button type="button" variant="secondary" size="md" fullWidth disabled={busy} onClick={onForceReveal}>
          Forcer le reveal
        </Button>
      )}
    </section>
  );
});

interface IntrusRevealFinalProps extends IntrusBoardProps {
  result: IntrusRoundResult;
  onNextRound?: () => void;
  onEnd?: () => void;
  finaleAttempt: string | null;
  onSubmitFinale?: (guess: string) => void;
  submittingFinale?: boolean;
  busy?: boolean;
  isHostController?: boolean;
  isFinal: boolean;
}

export const IntrusRevealFinalScreen = memo(function IntrusRevealFinalScreen({
  state,
  participants,
  me,
  isTv,
  result,
  onNextRound,
  onEnd,
  finaleAttempt,
  onSubmitFinale,
  submittingFinale,
  busy,
  isHostController,
  isFinal,
}: IntrusRevealFinalProps) {
  const intrusPlayer = participants.find((p) => p.id === result.intrusPlayerId) ?? null;
  const topVotedPlayer = participants.find((p) => p.id === result.topVotedPlayerId) ?? null;
  const finaleAvailable =
    state.finaleEnabled &&
    result.intrusFound &&
    state.finaleCorrect === null;
  const meIsIntrus = isPlayerIntrus(state, me?.id ?? null);
  const [finaleDraft, setFinaleDraft] = useState("");

  return (
    <section className="game-panel-enter flex flex-1 flex-col gap-3">
      <div className="card p-5 text-center">
        <div className="text-xs font-black uppercase tracking-[0.24em] text-neon-pink">Manche {state.roundNumber} · Reveal</div>
        <h2 className="mt-1 text-3xl font-black">
          {result.intrusFound ? "Intrus démasqué !" : "L'intrus survit !"}
        </h2>
        <div className="mt-4 flex flex-col items-center gap-2">
          {intrusPlayer ? (
            <>
              <PlayerAvatar player={intrusPlayer} size="xl" />
              <div className="text-2xl font-black">{intrusPlayer.name}</div>
            </>
          ) : (
            <div className="text-xl text-white/55">Intrus introuvable</div>
          )}
          <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl border border-neon-cyan/40 bg-neon-cyan/10 px-4 py-2">
              <div className="text-[10px] font-black uppercase tracking-widest text-neon-cyan">Mot principal</div>
              <div className="text-lg font-black">{state.mainWord}</div>
            </div>
            <div className="rounded-2xl border border-neon-pink/40 bg-neon-pink/10 px-4 py-2">
              <div className="text-[10px] font-black uppercase tracking-widest text-neon-pink">Mot intrus</div>
              <div className="text-lg font-black">{state.intrusWord}</div>
            </div>
          </div>
        </div>
      </div>

      {result.topVotedPlayerId && topVotedPlayer && (
        <div className="card border border-white/10 bg-white/5 p-4 text-center">
          <div className="text-xs font-black uppercase tracking-widest text-white/55">Joueur le plus voté</div>
          <div className="mt-1 text-lg font-black">{topVotedPlayer.name}</div>
        </div>
      )}

      <div className="card p-4">
        <div className="mb-2 text-xs font-black uppercase tracking-wider text-white/55">Distribution des votes</div>
        <ul className="space-y-2">
          {participants.map((player) => {
            const vote = result.voteByVoter[player.id];
            const target = vote ? participants.find((p) => p.id === vote) : null;
            return (
              <li key={player.id} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                <PlayerAvatar player={player} size="sm" />
                <span className="flex-1 truncate font-bold">{player.name}</span>
                <span className="text-xs text-white/60">→</span>
                <span className="truncate font-bold text-white/85">{target?.name ?? "pas voté"}</span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="card p-4">
        <div className="mb-2 text-xs font-black uppercase tracking-wider text-white/55">Points cette manche</div>
        <ul className="grid gap-2">
          {participants.map((player) => {
            const points = result.awards[player.id] ?? 0;
            return (
              <li key={player.id} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                <PlayerAvatar player={player} size="sm" />
                <span className="flex-1 truncate font-bold">{player.name}</span>
                <span className={`font-black ${points > 0 ? "text-neon-green" : "text-white/45"}`}>+{points}</span>
              </li>
            );
          })}
        </ul>
      </div>

      {finaleAvailable && meIsIntrus && !isTv && (
        <form
          className="card border border-neon-yellow/40 bg-neon-yellow/10 p-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!onSubmitFinale || !finaleDraft.trim()) return;
            onSubmitFinale(finaleDraft.trim());
          }}
        >
          <div className="text-xs font-black uppercase tracking-widest text-neon-yellow">Dernière chance</div>
          <p className="mt-1 text-sm font-semibold text-white/85">
            Tu as été démasqué. Devine le mot principal pour rattraper des points.
          </p>
          <Input
            className="mt-3"
            value={finaleDraft}
            onChange={(event) => setFinaleDraft(event.target.value.slice(0, 60))}
            placeholder="Mot principal…"
            maxLength={60}
          />
          <Button type="submit" variant="primary" size="md" fullWidth disabled={submittingFinale || !finaleDraft.trim()} className="mt-3">
            {submittingFinale ? "Envoi…" : "Tenter le mot"}
          </Button>
        </form>
      )}

      {finaleAttempt && (
        <div className="card border border-white/10 bg-white/5 p-3 text-center">
          <div className="text-[10px] font-black uppercase tracking-widest text-white/55">Pari de l&apos;intrus</div>
          <div className="text-lg font-black">{finaleAttempt}</div>
          <div className="text-sm font-bold">
            {state.finaleCorrect === true ? (
              <span className="text-neon-green">Bingo, mot trouvé !</span>
            ) : state.finaleCorrect === false ? (
              <span className="text-neon-pink">Raté.</span>
            ) : (
              <span className="text-white/45">En attente…</span>
            )}
          </div>
        </div>
      )}

      {isHostController && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Button variant="primary" size="md" disabled={busy} onClick={onNextRound}>
            {isFinal ? "Bilan final" : "Manche suivante"}
          </Button>
          <Button variant="secondary" size="md" disabled={busy} onClick={onEnd}>
            Finir la partie
          </Button>
        </div>
      )}
    </section>
  );
});

export const IntrusScoreboardSection = memo(function IntrusScoreboardSection({
  state,
  participants,
}: {
  state: IntrusGameState | null;
  participants: Player[];
}) {
  const rows = useMemo(() => buildIntrusScoreboard(participants, state), [participants, state]);
  return (
    <section className="card p-5">
      <div className="mb-3 text-xs font-black uppercase tracking-wider text-white/55">Classement</div>
      <ul className="grid gap-2">
        {rows.map((row, index) => (
          <li
            key={row.player.id}
            className={`flex items-center gap-3 rounded-2xl border p-3 ${
              index === 0 ? "border-neon-yellow/50 bg-neon-yellow/10" : "border-white/10 bg-white/5"
            }`}
          >
            <span className="w-6 shrink-0 text-center text-lg font-black text-white/70">#{index + 1}</span>
            <PlayerAvatar player={row.player} />
            <div className="flex-1 truncate">
              <div className="truncate font-black">{row.player.name}</div>
              <div className="text-xs text-white/55">
                intrus ×{row.intrusRoles} · détective ×{row.detectiveCount}
              </div>
            </div>
            <div className="text-2xl font-black tabular-nums">{row.score}</div>
          </li>
        ))}
      </ul>
    </section>
  );
});

function CluesFeed({
  clues,
  participants,
  state,
  expanded,
}: {
  clues: IntrusGameState["clues"];
  participants: Player[];
  state: IntrusGameState;
  expanded?: boolean;
}) {
  const playerById = useMemo(() => new Map(participants.map((p) => [p.id, p])), [participants]);
  if (!clues.length) {
    return (
      <div className="card border border-white/10 bg-white/5 p-4 text-center text-sm font-semibold text-white/55">
        Aucun indice pour l&apos;instant.
      </div>
    );
  }
  return (
    <ul className="card grid gap-2 p-3">
      {clues.map((clue, index) => {
        const player = playerById.get(clue.playerId);
        return (
          <li
            key={`${clue.playerId}-${index}`}
            className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3"
          >
            <span className="w-5 text-center text-xs font-black text-white/45">#{index + 1}</span>
            <PlayerAvatar player={player ?? null} size="sm" />
            <span className="min-w-0 flex-1 truncate font-black">{player?.name ?? "…"}</span>
            <span className={`max-w-[60%] truncate text-right text-sm ${clue.text ? "font-black text-white" : "italic text-white/45"}`}>
              {clue.text ?? "pas de réponse"}
            </span>
          </li>
        );
      })}
      {expanded && state.clues.length < state.playerOrder.length && (
        <li className="rounded-xl border border-dashed border-white/20 bg-white/[0.02] p-2 text-center text-xs font-semibold text-white/45">
          {state.playerOrder.length - state.clues.length} joueur(s) sans indice
        </li>
      )}
    </ul>
  );
}

export function computeIntrusRoundResultMemo(
  state: IntrusGameState,
  votes: Vote[],
  players: Player[]
): IntrusRoundResult {
  return computeIntrusRoundResult({ state, votes, players });
}
