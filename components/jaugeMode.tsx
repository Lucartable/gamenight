"use client";

import { useMemo } from "react";
import type { ReactNode } from "react";
import { computeJaugeRoundResult, type JaugeRoundQuestion } from "@/lib/jaugeGame";
import { useCountdown } from "@/lib/useCountdown";
import { useCountUp } from "@/lib/useCountUp";
import { triggerHaptic } from "@/lib/utils";
import { PlayerAvatar } from "@/components/playerAvatar";
import type { JaugeAnonymityMode, Player, Rating } from "@/types/database";

const RATING_COLORS = [
  "from-neon-pink to-neon-purple",
  "from-neon-pink to-neon-purple",
  "from-neon-pink to-neon-yellow",
  "from-neon-yellow to-neon-pink",
  "from-neon-yellow to-neon-green",
  "from-neon-yellow to-neon-green",
  "from-neon-green to-neon-cyan",
  "from-neon-cyan to-neon-green",
  "from-neon-cyan to-neon-purple",
  "from-neon-yellow to-neon-cyan",
];

interface JaugeVoteScreenProps {
  question: JaugeRoundQuestion;
  targetPlayer: Player | null;
  currentPlayer: Player | null;
  startedAt: string | null;
  durationSec: number;
  selectedRating: number | null;
  validatedRating: number | null;
  submitting: boolean;
  brutalMode: boolean;
  canRate: boolean;
  votedCount: number;
  totalVoters: number;
  busy?: boolean;
  onSelect: (rating: number) => void;
  onSubmit: () => void;
  onRevealNow?: () => void;
}

export function JaugeVoteScreen({
  question,
  targetPlayer,
  currentPlayer,
  startedAt,
  durationSec,
  selectedRating,
  validatedRating,
  submitting,
  brutalMode,
  canRate,
  votedCount,
  totalVoters,
  busy = false,
  onSelect,
  onSubmit,
  onRevealNow,
}: JaugeVoteScreenProps) {
  const left = useCountdown(startedAt, durationSec);
  const activeRating = validatedRating ?? selectedRating ?? 5;
  const locked = Boolean(validatedRating) || submitting || left === 0 || !canRate;
  const progress = totalVoters ? Math.min(100, (votedCount / totalVoters) * 100) : 0;
  const isTarget = currentPlayer?.id === targetPlayer?.id;

  function pickRating(nextRating: number) {
    if (locked || (brutalMode && (nextRating === 5 || nextRating === 6))) return;
    triggerHaptic(10);
    onSelect(nextRating);
  }

  function submitRating() {
    triggerHaptic([12, 28, 16]);
    onSubmit();
  }

  return (
    <section className="game-panel-enter flex flex-1 flex-col gap-3">
      <div className="jauge-shell overflow-hidden rounded-[2rem] border border-white/10 bg-black/35 p-4 shadow-2xl backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-black uppercase tracking-wider text-neon-cyan">Jauge en direct</div>
            <div className="mt-1 truncate text-sm font-bold text-white/55">
              {totalVoters ? `${votedCount}/${totalVoters} notes verrouillées` : "En attente des joueurs"}
            </div>
          </div>
          <div className={`rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-right ${left <= 5 ? "timer-hot text-neon-pink" : ""}`}>
            <div className="text-3xl font-black tabular-nums">{left}</div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-white/50">sec</div>
          </div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-neon-cyan via-neon-purple to-neon-pink transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="jauge-target-card relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.06] p-5 text-center shadow-2xl">
        <div className="jauge-orbit" aria-hidden="true" />
        <div className="relative z-10">
          <PlayerAvatar player={targetPlayer} size="xl" />
          <div className="mt-3 text-xs font-black uppercase tracking-wider text-white/45">Joueur cible</div>
          <h2 className="mt-1 truncate text-4xl font-black">{targetPlayer?.name ?? "Joueur absent"}</h2>
          <p className="mx-auto mt-4 max-w-xl text-2xl font-black leading-tight sm:text-4xl">{question.text}</p>
        </div>
      </div>

      {!canRate ? (
        <div className="rounded-[1.5rem] border border-neon-yellow/30 bg-neon-yellow/10 p-4 text-center font-bold text-neon-yellow">
          {isTarget ? "Tu es la cible de cette manche. Regarde le groupe te juger." : "Note déjà envoyée."}
        </div>
      ) : (
        <div className="rounded-[2rem] border border-white/10 bg-black/35 p-4 shadow-2xl backdrop-blur">
          <div className="mb-3 flex items-end justify-between gap-4">
            <div>
              <div className="text-xs font-black uppercase tracking-wider text-white/45">Ta note</div>
              <div className="text-sm font-bold text-white/60">
                {brutalMode ? "Mode brutal : pas de 5 ni 6." : "Choisis, ajuste, puis valide."}
              </div>
            </div>
            <div className="text-6xl font-black tabular-nums text-neon-yellow">{activeRating}</div>
          </div>

          <div className="relative py-4">
            <div className="absolute left-0 right-0 top-1/2 h-5 -translate-y-1/2 rounded-full bg-white/10" />
            <div
              className={`absolute left-0 top-1/2 h-5 -translate-y-1/2 rounded-full bg-gradient-to-r ${RATING_COLORS[activeRating - 1]} shadow-glow transition-all duration-300`}
              style={{ width: `${((activeRating - 1) / 9) * 100}%` }}
            />
            <input
              type="range"
              min={1}
              max={10}
              step={1}
              value={activeRating}
              disabled={locked}
              onChange={(event) => pickRating(Number(event.target.value))}
              className="jauge-range relative z-10 w-full"
              aria-label="Note de 1 à 10"
            />
          </div>

          <div className="mt-2 grid grid-cols-5 gap-2">
            {Array.from({ length: 10 }, (_, index) => {
              const rating = index + 1;
              const disabled = locked || (brutalMode && (rating === 5 || rating === 6));
              return (
                <button
                  type="button"
                  key={rating}
                  disabled={disabled}
                  onClick={() => pickRating(rating)}
                  className={`jauge-number aspect-square rounded-2xl border text-2xl font-black transition ${
                    activeRating === rating
                      ? "border-neon-yellow bg-neon-yellow text-night shadow-glow"
                      : "border-white/10 bg-white/5 text-white/70"
                  } disabled:opacity-35`}
                >
                  {rating}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            disabled={!selectedRating || locked}
            onClick={submitRating}
            className="btn-primary mt-4 w-full disabled:shadow-none"
          >
            {submitting ? "Envoi..." : validatedRating ? "Note envoyée" : "Valider ma note"}
          </button>
        </div>
      )}

      {onRevealNow && (
        <button type="button" onClick={onRevealNow} disabled={busy} className="btn-secondary">
          Révéler maintenant
        </button>
      )}
    </section>
  );
}

interface JaugeRevealPanelProps {
  question: JaugeRoundQuestion;
  targetPlayerId: string;
  players: Player[];
  ratings: Rating[];
  anonymityMode: JaugeAnonymityMode;
  finalReveal?: boolean;
  controls?: ReactNode;
}

export function JaugeRevealPanel({
  question,
  targetPlayerId,
  players,
  ratings,
  anonymityMode,
  finalReveal = false,
  controls,
}: JaugeRevealPanelProps) {
  const result = useMemo(
    () => computeJaugeRoundResult({ players, ratings, targetPlayerId, anonymityMode, finalReveal }),
    [anonymityMode, finalReveal, players, ratings, targetPlayerId]
  );
  const averageCount = useCountUp(Math.round(result.average * 10), 950);
  const averageDisplay = (averageCount / 10).toFixed(1);

  return (
    <section className="game-panel-enter flex flex-1 flex-col gap-4">
      <div className="jauge-reveal-hero relative overflow-hidden rounded-[2rem] border border-white/10 bg-black/40 p-5 text-center shadow-2xl">
        <div className="jauge-reveal-wave" aria-hidden="true" />
        <div className="relative z-10">
          <div className="mx-auto mb-4 w-fit rounded-full border border-neon-pink/40 bg-neon-pink/10 px-4 py-1 text-xs font-black uppercase tracking-wider text-neon-pink">
            Reveal Jauge
          </div>
          <PlayerAvatar player={result.target} size="xl" />
          <h1 className="mt-3 text-4xl font-black">{result.target?.name ?? "Joueur absent"}</h1>
          <p className="mx-auto mt-3 max-w-xl text-xl font-black leading-tight text-white/90 sm:text-3xl">{question.text}</p>
          <div className="mx-auto mt-6 w-fit rounded-[2rem] border border-neon-yellow/40 bg-neon-yellow/10 px-7 py-4 shadow-glow">
            <div className="text-xs font-black uppercase tracking-wider text-neon-yellow">Moyenne</div>
            <div className="text-7xl font-black tabular-nums text-neon-yellow">{averageDisplay}</div>
            <div className="text-sm font-black uppercase tracking-wider text-white/45">sur 10</div>
          </div>
          <p className="mx-auto mt-4 max-w-lg text-sm font-bold text-white/65">{result.comment}</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-4">
          <div className="mb-3 text-xs font-black uppercase tracking-wider text-white/45">Notes révélées</div>
          <div className="grid gap-2">
            {result.rows.length ? result.rows.map((row, index) => (
              <div
                key={`${row.voter?.id ?? "anonymous"}-${index}`}
                className="jauge-reveal-row flex items-center gap-3 rounded-2xl border border-white/10 bg-black/25 p-3"
                style={{ animationDelay: `${index * 120}ms` }}
              >
                <PlayerAvatar player={row.visible ? row.voter : null} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-lg font-black">{row.visible ? row.voter?.name ?? "Joueur" : row.anonymousLabel}</div>
                  <div className="text-xs font-bold uppercase tracking-wider text-white/40">{row.visible ? "Auteur révélé" : "Auteur masqué"}</div>
                </div>
                <div className={`rounded-2xl bg-gradient-to-br ${RATING_COLORS[row.rating - 1]} px-4 py-2 text-3xl font-black text-night shadow-glow`}>
                  {row.rating}
                </div>
              </div>
            )) : (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-center text-white/55">
                Aucune note envoyée.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-4">
          <div className="mb-3 text-xs font-black uppercase tracking-wider text-white/45">Distribution</div>
          <div className="grid gap-2">
            {result.distribution.map((bucket) => (
              <div key={bucket.rating} className="grid grid-cols-[2rem_1fr_2rem] items-center gap-2">
                <div className="text-right text-sm font-black text-white/65">{bucket.rating}</div>
                <div className="h-3 overflow-hidden rounded-full bg-white/10">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${RATING_COLORS[bucket.rating - 1]} transition-all duration-700`}
                    style={{ width: `${bucket.percent}%` }}
                  />
                </div>
                <div className="text-sm font-bold text-white/45">{bucket.count}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <MiniStat label="Min" value={result.min || "-"} />
            <MiniStat label="Max" value={result.max || "-"} />
            <MiniStat label="Écart" value={result.spread || "-"} hot={result.isDivided} />
          </div>
        </div>
      </div>

      {controls}
    </section>
  );
}

function MiniStat({ label, value, hot = false }: { label: string; value: number | string; hot?: boolean }) {
  return (
    <div className={`rounded-2xl border p-3 ${hot ? "border-neon-pink/40 bg-neon-pink/10 text-neon-pink" : "border-white/10 bg-white/5"}`}>
      <div className="text-2xl font-black">{value}</div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-white/45">{label}</div>
    </div>
  );
}
