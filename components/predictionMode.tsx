"use client";

import { useEffect, useMemo, useState } from "react";
import { getCategoryForGame, type PredictionGameQuestion } from "@/lib/gameQuestions";
import {
  computePredictionRound,
  computePredictionScores,
  type PredictionGameType,
  type PredictionOptionResult,
  type PredictionScoreRow,
} from "@/lib/scoring";
import { useCountUp } from "@/lib/useCountUp";
import { useCountdown } from "@/lib/useCountdown";
import { triggerHaptic } from "@/lib/utils";
import { PlayerAvatar as AvatarBubble } from "@/components/playerAvatar";
import { Button, Chip } from "@/components/ui";
import type { Player, Vote } from "@/types/database";

const OPTION_ACCENTS = [
  {
    border: "border-neon-pink/50",
    bg: "bg-neon-pink/10",
    text: "text-neon-pink",
    ring: "ring-neon-pink shadow-glow-pink",
    bar: "from-neon-pink to-neon-purple",
  },
  {
    border: "border-neon-cyan/50",
    bg: "bg-neon-cyan/10",
    text: "text-neon-cyan",
    ring: "ring-neon-cyan shadow-glow-cyan",
    bar: "from-neon-cyan to-neon-green",
  },
  {
    border: "border-neon-yellow/50",
    bg: "bg-neon-yellow/10",
    text: "text-neon-yellow",
    ring: "ring-neon-yellow shadow-glow",
    bar: "from-neon-yellow to-neon-pink",
  },
  {
    border: "border-neon-green/50",
    bg: "bg-neon-green/10",
    text: "text-neon-green",
    ring: "ring-neon-green shadow-glow-cyan",
    bar: "from-neon-green to-neon-cyan",
  },
];

interface PredictionVoteScreenProps {
  mode: PredictionGameType;
  question: PredictionGameQuestion;
  startedAt: string | null;
  durationSec: number;
  selectedOption: string | null;
  validatedOption: string | null;
  submitting: boolean;
  onSelect: (option: string) => void;
  onSubmit: () => void;
  votedCount?: number;
  totalPlayers?: number;
  busy?: boolean;
  onRevealNow?: () => void;
}

export function PredictionVoteScreen({
  mode,
  question,
  startedAt,
  durationSec,
  selectedOption,
  validatedOption,
  submitting,
  onSelect,
  onSubmit,
  votedCount,
  totalPlayers,
  busy = false,
  onRevealNow,
}: PredictionVoteScreenProps) {
  const left = useCountdown(startedAt, durationSec);
  const locked = Boolean(validatedOption) || submitting || left === 0;
  const category = getCategoryForGame(mode, question.category);
  const activeOption = validatedOption ?? selectedOption;

  function handleSelect(option: string) {
    if (locked) return;
    triggerHaptic(10);
    onSelect(option);
  }

  function handleSubmit() {
    triggerHaptic([12, 30, 18]);
    onSubmit();
  }

  return (
    <section className="game-panel-enter flex flex-1 flex-col">
      <div className="card mb-3 overflow-hidden p-4">
        <div className="flex items-center justify-between gap-3">
          {category && <Chip tone="cyan" leading={<span>{category.emoji}</span>}>{category.label}</Chip>}
          <div className={`rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-right ${left <= 5 ? "timer-hot text-neon-pink" : ""}`}>
            <div className="text-3xl font-black tabular-nums">{left}</div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-white/50">sec</div>
          </div>
        </div>
        {typeof votedCount === "number" && typeof totalPlayers === "number" && (
          <div className="mt-3">
            <div className="mb-1 flex justify-between text-xs font-bold uppercase tracking-wider text-white/50">
              <span>Votes envoyés</span>
              <span>{votedCount}/{totalPlayers}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-neon-cyan to-neon-pink transition-all duration-500"
                style={{ width: `${totalPlayers ? Math.min(100, (votedCount / totalPlayers) * 100) : 0}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="card mb-3 p-5 text-center animate-reveal-in">
        <div className="text-xs font-bold uppercase tracking-wider text-white/50">
          {mode === "majority" ? "Trouve le choix du groupe" : "Trouve le choix rare"}
        </div>
        <h2 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">{question.text}</h2>
      </div>

      <div className="grid flex-1 gap-3 sm:grid-cols-2">
        {question.options.map((option, index) => (
          <PredictionOptionCard
            key={option}
            option={option}
            index={index}
            selected={activeOption === option}
            locked={locked}
            onClick={() => handleSelect(option)}
          />
        ))}
      </div>

      <Button
        type="button"
        variant="primary"
        size="lg"
        fullWidth
        disabled={!selectedOption || locked}
        onClick={handleSubmit}
        className="mt-4 disabled:shadow-none"
      >
        {submitting ? "Envoi…" : validatedOption ? "Vote envoyé" : "Valider mon choix"}
      </Button>
      {validatedOption && (
        <div className="mt-3 rounded-2xl border border-neon-green/30 bg-neon-green/10 p-3 text-center text-sm font-bold text-neon-green animate-reveal-in">
          Vote envoyé
        </div>
      )}
      {onRevealNow && (
        <Button
          type="button"
          variant="secondary"
          size="md"
          fullWidth
          onClick={onRevealNow}
          disabled={busy}
          className="mt-3"
        >
          Révéler maintenant
        </Button>
      )}
    </section>
  );
}

function PredictionOptionCard({
  option,
  index,
  selected,
  locked,
  onClick,
}: {
  option: string;
  index: number;
  selected: boolean;
  locked: boolean;
  onClick: () => void;
}) {
  const accent = OPTION_ACCENTS[index % OPTION_ACCENTS.length];

  return (
    <button
      type="button"
      disabled={locked}
      onClick={onClick}
      className={`prediction-card flex min-h-28 flex-col justify-between rounded-2xl border-2 p-4 text-left transition duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-75 sm:min-h-36 ${accent.border} ${accent.bg} ${
        selected ? `ring-4 ${accent.ring}` : "hover:-translate-y-0.5 hover:bg-white/10"
      }`}
    >
      <span className={`text-xs font-black uppercase tracking-wider ${accent.text}`}>Choix {index + 1}</span>
      <span className="mt-3 text-2xl font-black leading-tight text-white">{option}</span>
      <span className={`mt-3 h-1.5 w-12 rounded-full bg-gradient-to-r ${accent.bar}`} />
    </button>
  );
}

interface PredictionRevealPanelProps {
  mode: PredictionGameType;
  question: PredictionGameQuestion;
  players: Player[];
  votes: Vote[];
  isTv?: boolean;
  revealLeft?: number;
  revealStartedAt?: string | null;
  revealDurationSec?: number;
  autoplay?: boolean;
  busy?: boolean;
  primaryLabel?: string;
  onPrimary?: () => void;
  onBackToLobby?: () => void;
}

export function PredictionRevealPanel({
  mode,
  question,
  players,
  votes,
  isTv = false,
  revealLeft = 0,
  revealStartedAt = null,
  revealDurationSec = 0,
  autoplay = false,
  busy = false,
  primaryLabel,
  onPrimary,
  onBackToLobby,
}: PredictionRevealPanelProps) {
  const [ready, setReady] = useState(false);
  const internalRevealLeft = useCountdown(autoplay ? revealStartedAt : null, revealDurationSec);
  const effectiveRevealLeft = revealLeft || internalRevealLeft;
  const category = getCategoryForGame(mode, question.category);
  const result = useMemo(() => computePredictionRound(mode, question, players, votes), [mode, players, question, votes]);
  const showControls = Boolean(onPrimary);

  useEffect(() => {
    setReady(false);
    const id = window.setTimeout(() => {
      setReady(true);
      triggerHaptic(mode === "majority" ? 18 : [10, 24, 10]);
    }, 450);
    return () => window.clearTimeout(id);
  }, [mode, question.id]);

  return (
    <section className={`card game-panel-enter relative flex flex-1 flex-col overflow-hidden p-5 ${isTv ? "tv-reveal-card tv-prediction-reveal" : ""}`}>
      {ready && result.winners.length > 0 && <MiniConfetti />}

      <div className="mb-4 flex items-center justify-between gap-3">
        {category && <Chip tone="cyan" leading={<span>{category.emoji}</span>}>{category.label}</Chip>}
        <Chip tone="neutral" size="sm">Résultats</Chip>
      </div>

      <div className="tv-reveal-question mb-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
        <div className="text-xs font-bold uppercase tracking-wider text-white/50">
          {ready ? result.headline : "Analyse du chaos collectif..."}
        </div>
        <h2 className="mt-2 text-2xl font-black leading-tight">{question.text}</h2>
        <p className="mt-2 text-sm text-white/60">{result.subline}</p>
      </div>

      <div className="tv-prediction-result-grid grid gap-3">
        {result.options.map((option, index) => (
          <PredictionResultBar
            key={option.option}
            option={option}
            index={index}
            mode={mode}
            ready={ready}
          />
        ))}
      </div>

      {ready && result.winners.length > 0 && (
        <div className="tv-winners-card mt-4 rounded-2xl border border-neon-green/30 bg-neon-green/10 p-4 animate-reveal-in">
          <div className="text-xs font-bold uppercase tracking-wider text-neon-green">
            {mode === "majority" ? "Gagnants de la manche" : "Minorité valide"}
          </div>
          <ul className="mt-3 flex flex-wrap gap-2">
            {result.winners.map((player) => (
              <li key={player.id} className="inline-flex items-center gap-2 rounded-full border border-neon-green/35 bg-neon-green/10 px-3 py-1 text-xs font-black text-neon-green">
                <AvatarBubble player={player} size="sm" />
                {player.name}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="tv-reveal-meta mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
        <div className="text-xs uppercase tracking-wider text-white/50">
          {result.totalVotes} vote{result.totalVotes > 1 ? "s" : ""} validé{result.totalVotes > 1 ? "s" : ""}
        </div>
        {autoplay && <div className="mt-1 text-3xl font-black tabular-nums">{effectiveRevealLeft}s</div>}
      </div>

      {autoplay && showControls && (
        <p className="mt-4 text-center text-sm font-semibold text-neon-cyan">
          Préparation de la suite…
        </p>
      )}

      {!autoplay && showControls && (
        <div className="tv-host-controls mt-4 grid gap-3 sm:grid-cols-2">
          <Button variant="primary" size="md" disabled={busy} onClick={onPrimary}>
            {primaryLabel ?? "Continuer"}
          </Button>
          {onBackToLobby && (
            <Button variant="secondary" size="md" disabled={busy} onClick={onBackToLobby}>
              Retour au lobby
            </Button>
          )}
        </div>
      )}
    </section>
  );
}

function PredictionResultBar({
  option,
  index,
  mode,
  ready,
}: {
  option: PredictionOptionResult;
  index: number;
  mode: PredictionGameType;
  ready: boolean;
}) {
  const accent = OPTION_ACCENTS[index % OPTION_ACCENTS.length];
  const shownPercent = useCountUp(ready ? option.percent : 0, 650 + index * 80);
  const statusClass =
    option.status === "majority" || option.status === "rare"
      ? "border-neon-green/60 bg-neon-green/15 text-neon-green"
      : option.status === "popular"
        ? "border-neon-pink/50 bg-neon-pink/10 text-neon-pink"
        : option.status === "empty"
          ? "border-white/10 bg-white/5 text-white/45"
          : "border-neon-cyan/30 bg-neon-cyan/10 text-neon-cyan";

  return (
    <div
      className={`tv-prediction-result-bar rounded-2xl border p-4 transition duration-500 animate-reveal-in ${
        option.isWinner ? "border-neon-green/60 bg-neon-green/10 shadow-glow-cyan" : "border-white/10 bg-white/5"
      }`}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className={`text-xs font-black uppercase tracking-wider ${accent.text}`}>
            {mode === "majority" ? "Réponse" : `${option.score} pt${option.score > 1 ? "s" : ""}`}
          </div>
          <div className="mt-1 text-xl font-black leading-tight">{option.option}</div>
        </div>
        <div className="text-right">
          <div className="text-4xl font-black tabular-nums">{shownPercent}%</div>
          <div className="text-xs text-white/50">{option.count} vote{option.count > 1 ? "s" : ""}</div>
        </div>
      </div>

      <div className="mt-3 h-4 overflow-hidden rounded-full bg-white/10">
        <div
          className={`result-fill h-full rounded-full bg-gradient-to-r ${accent.bar}`}
          style={{
            width: ready ? `${option.percent}%` : "0%",
            animationDelay: `${120 + index * 90}ms`,
          }}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${statusClass}`}>
          {option.statusLabel}
        </span>
        {option.voters.map((player) => (
          <span key={player.id} className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-3 py-1 text-xs font-black text-white/85">
            <AvatarBubble player={player} size="sm" />
            {player.name}
          </span>
        ))}
      </div>
    </div>
  );
}

interface PredictionScoreboardPanelProps {
  mode: PredictionGameType;
  players: Player[];
  votes: Vote[];
  isTv?: boolean;
  currentQuestionId?: number | null;
  scoreTarget?: number | null;
  autoplay?: boolean;
  scoreboardLeft?: number;
  busy?: boolean;
  final?: boolean;
  primaryLabel?: string;
  onPrimary?: () => void;
  onBackToLobby?: () => void;
}

export function PredictionScoreboardPanel({
  mode,
  players,
  votes,
  isTv = false,
  currentQuestionId,
  scoreTarget,
  autoplay = false,
  scoreboardLeft = 0,
  busy = false,
  final = false,
  primaryLabel,
  onPrimary,
  onBackToLobby,
}: PredictionScoreboardPanelProps) {
  const rows = useMemo(
    () => computePredictionScores(mode, players, votes, currentQuestionId),
    [currentQuestionId, mode, players, votes]
  );
  const showControls = Boolean(onPrimary);

  return (
    <section className={`card game-panel-enter flex flex-1 flex-col p-5 ${isTv ? "tv-reveal-card tv-scoreboard-panel" : ""}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-white/50">
            {final ? "Classement final" : "Scoreboard"}
          </div>
          <h2 className="text-3xl font-black">Le classement</h2>
        </div>
        {scoreTarget && (
          <div className="rounded-2xl border border-neon-yellow/30 bg-neon-yellow/10 px-3 py-2 text-right text-neon-yellow">
            <div className="text-xl font-black">{scoreTarget}</div>
            <div className="text-[10px] font-bold uppercase tracking-wider">cible</div>
          </div>
        )}
      </div>

      <div className="tv-scoreboard-grid grid gap-3">
        {rows.map((row, index) => (
          <ScoreRowCard key={row.player.id} row={row} rank={index + 1} leader={index === 0} />
        ))}
      </div>

      {autoplay && showControls && (
        <div className="tv-reveal-meta mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
          <div className="text-xs uppercase tracking-wider text-white/50">
            {final ? "Fin automatique" : "Prochaine manche"}
          </div>
          <div className="mt-1 text-3xl font-black tabular-nums">{scoreboardLeft}s</div>
        </div>
      )}

      {!autoplay && showControls && (
        <div className="tv-host-controls mt-4 grid gap-3 sm:grid-cols-2">
          <Button variant="primary" size="md" disabled={busy} onClick={onPrimary}>
            {primaryLabel ?? "Continuer"}
          </Button>
          {onBackToLobby && (
            <Button variant="secondary" size="md" disabled={busy} onClick={onBackToLobby}>
              Retour au lobby
            </Button>
          )}
        </div>
      )}
    </section>
  );
}

function ScoreRowCard({ row, rank, leader }: { row: PredictionScoreRow; rank: number; leader: boolean }) {
  return (
    <div
      className={`tv-score-row flex items-center gap-3 rounded-2xl border p-4 transition animate-reveal-in ${
        leader ? "border-neon-yellow/60 bg-neon-yellow/10 shadow-glow" : "border-white/10 bg-white/5"
      }`}
      style={{ animationDelay: `${rank * 70}ms` }}
    >
      <div className="w-8 shrink-0 text-center text-2xl font-black tabular-nums text-white/70">#{rank}</div>
      <AvatarBubble player={row.player} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-xl font-black">{row.player.name}</div>
        <div className="text-xs text-white/50">
          {row.votesCast} vote{row.votesCast > 1 ? "s" : ""} joué{row.votesCast > 1 ? "s" : ""}
        </div>
      </div>
      {row.roundGain > 0 && (
        <div className="rounded-full border border-neon-green/30 bg-neon-green/10 px-3 py-1 text-sm font-black text-neon-green animate-pop-in">
          +{row.roundGain}
        </div>
      )}
      <div className="w-16 text-right">
        <div className="text-3xl font-black tabular-nums">{row.points}</div>
        <div className="text-[10px] font-bold uppercase tracking-wider text-white/45">pts</div>
      </div>
    </div>
  );
}

function MiniConfetti() {
  return (
    <div className="confetti-field" aria-hidden="true">
      {Array.from({ length: 14 }).map((_, index) => (
        <span key={index} />
      ))}
    </div>
  );
}
