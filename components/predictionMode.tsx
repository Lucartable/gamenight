"use client";

import { useEffect, useMemo, useState } from "react";
import { getCategoryForGame, type PredictionGameQuestion } from "@/lib/gameQuestions";
import {
  buildFunStats,
  computePredictionRound,
  computePredictionScores,
  type PredictionGameType,
  type PredictionOptionResult,
  type PredictionScoreRow,
} from "@/lib/scoring";
import { useCountdown } from "@/lib/useCountdown";
import { triggerHaptic } from "@/lib/utils";
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
    <section className="flex flex-1 flex-col">
      <div className="card mb-3 overflow-hidden p-4">
        <div className="flex items-center justify-between gap-3">
          {category && <span className="chip">{category.emoji} {category.label}</span>}
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-right">
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

      <button
        type="button"
        disabled={!selectedOption || locked}
        onClick={handleSubmit}
        className="btn-primary mt-4 w-full disabled:shadow-none"
      >
        {submitting ? "Envoi..." : validatedOption ? "Vote envoyé" : "Valider mon choix"}
      </button>
      {validatedOption && (
        <div className="mt-3 rounded-2xl border border-neon-green/30 bg-neon-green/10 p-3 text-center text-sm font-bold text-neon-green animate-reveal-in">
          Vote envoyé
        </div>
      )}
      {onRevealNow && (
        <button
          type="button"
          onClick={onRevealNow}
          disabled={busy}
          className="btn-secondary mt-3"
        >
          Révéler maintenant
        </button>
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
    <section className="card relative flex flex-1 flex-col overflow-hidden p-5">
      {ready && result.winners.length > 0 && <MiniConfetti />}

      <div className="mb-4 flex items-center justify-between gap-3">
        {category && <span className="chip">{category.emoji} {category.label}</span>}
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white/50">
          Résultats
        </span>
      </div>

      <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
        <div className="text-xs font-bold uppercase tracking-wider text-white/50">
          {ready ? result.headline : "Analyse du chaos collectif..."}
        </div>
        <h2 className="mt-2 text-2xl font-black leading-tight">{question.text}</h2>
        <p className="mt-2 text-sm text-white/60">{result.subline}</p>
      </div>

      <div className="grid gap-3">
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
        <div className="mt-4 rounded-2xl border border-neon-green/30 bg-neon-green/10 p-4 animate-reveal-in">
          <div className="text-xs font-bold uppercase tracking-wider text-neon-green">
            {mode === "majority" ? "Gagnants de la manche" : "Minorité valide"}
          </div>
          <ul className="mt-3 flex flex-wrap gap-2">
            {result.winners.map((player) => (
              <li key={player.id} className="chip">
                <AvatarBubble player={player} size="sm" />
                {player.name}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
        <div className="text-xs uppercase tracking-wider text-white/50">
          {result.totalVotes} vote{result.totalVotes > 1 ? "s" : ""} validé{result.totalVotes > 1 ? "s" : ""}
        </div>
        {autoplay && <div className="mt-1 text-3xl font-black tabular-nums">{effectiveRevealLeft}s</div>}
      </div>

      {autoplay && showControls && (
        <p className="mt-4 text-center text-sm font-semibold text-neon-cyan">
          Préparation de la suite...
        </p>
      )}

      {!autoplay && showControls && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <button type="button" disabled={busy} onClick={onPrimary} className="btn-primary">
            {primaryLabel ?? "Continuer"}
          </button>
          {onBackToLobby && (
            <button type="button" disabled={busy} onClick={onBackToLobby} className="btn-secondary">
              Retour au lobby
            </button>
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
      className={`rounded-2xl border p-4 transition duration-500 animate-reveal-in ${
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
          <span key={player.id} className="chip">
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
    <section className="card flex flex-1 flex-col p-5">
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

      <div className="grid gap-3">
        {rows.map((row, index) => (
          <ScoreRowCard key={row.player.id} row={row} rank={index + 1} leader={index === 0} />
        ))}
      </div>

      {autoplay && showControls && (
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
          <div className="text-xs uppercase tracking-wider text-white/50">
            {final ? "Fin automatique" : "Prochaine manche"}
          </div>
          <div className="mt-1 text-3xl font-black tabular-nums">{scoreboardLeft}s</div>
        </div>
      )}

      {!autoplay && showControls && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <button type="button" disabled={busy} onClick={onPrimary} className="btn-primary">
            {primaryLabel ?? "Continuer"}
          </button>
          {onBackToLobby && (
            <button type="button" disabled={busy} onClick={onBackToLobby} className="btn-secondary">
              Retour au lobby
            </button>
          )}
        </div>
      )}
    </section>
  );
}

function ScoreRowCard({ row, rank, leader }: { row: PredictionScoreRow; rank: number; leader: boolean }) {
  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border p-4 transition animate-reveal-in ${
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

export function PredictionEndGamePanel({
  mode,
  players,
  votes,
}: {
  mode: PredictionGameType;
  players: Player[];
  votes: Vote[];
}) {
  const rows = useMemo(() => computePredictionScores(mode, players, votes, null), [mode, players, votes]);
  const stats = useMemo(() => buildFunStats(mode, rows), [mode, rows]);
  const podium = rows.slice(0, 3);

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col px-5 py-6">
      <section className="card flex flex-1 flex-col p-5 text-center">
        <div className="text-xs font-bold uppercase tracking-wider text-white/50">Fin de partie</div>
        <h1 className="mt-2 bg-gradient-to-r from-neon-yellow via-neon-pink to-neon-cyan bg-clip-text text-5xl font-black text-transparent">
          {podium[0]?.player.name ?? "Partie terminée"}
        </h1>
        <p className="mt-2 text-white/60">
          {podium[0] ? `${podium[0].points} point${podium[0].points > 1 ? "s" : ""} et une victoire bien propre.` : "Aucun vote enregistré."}
        </p>

        {podium.length > 0 && (
          <div className="mt-6 grid grid-cols-3 items-end gap-2">
            <PodiumBlock row={podium[1]} rank={2} height="h-28" />
            <PodiumBlock row={podium[0]} rank={1} height="h-36" leader />
            <PodiumBlock row={podium[2]} rank={3} height="h-24" />
          </div>
        )}

        <div className="mt-6 grid gap-3 text-left">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs font-bold uppercase tracking-wider text-neon-cyan">{stat.label}</div>
              <div className="mt-1 text-2xl font-black">{stat.value}</div>
              <div className="mt-1 text-sm text-white/60">{stat.detail}</div>
            </div>
          ))}
        </div>

        <a href="/" className="btn-primary mt-6">
          Retour à l'accueil
        </a>
      </section>
    </main>
  );
}

function PodiumBlock({
  row,
  rank,
  height,
  leader = false,
}: {
  row: PredictionScoreRow | undefined;
  rank: number;
  height: string;
  leader?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col items-center justify-end gap-2">
      {row ? <AvatarBubble player={row.player} /> : <div className="h-12 w-12 rounded-full bg-white/10" />}
      <div className="min-h-10 text-center">
        <div className="truncate text-sm font-black">{row?.player.name ?? "-"}</div>
        <div className="text-xs text-white/50">{row ? `${row.points} pts` : ""}</div>
      </div>
      <div
        className={`flex w-full items-center justify-center rounded-t-2xl border border-white/10 ${
          leader ? "bg-neon-yellow/20 text-neon-yellow" : "bg-white/10 text-white/70"
        } ${height}`}
      >
        <span className="text-3xl font-black">#{rank}</span>
      </div>
    </div>
  );
}

function AvatarBubble({ player, size = "md" }: { player: Player; size?: "sm" | "md" }) {
  const color = getPlayerGradient(player.id);
  const dimension = size === "sm" ? "h-5 w-5 text-[10px]" : "h-12 w-12 text-lg";
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-black text-white shadow-lg ${dimension}`}
      style={{ background: color }}
      aria-hidden="true"
    >
      {player.name.slice(0, 1).toUpperCase()}
    </span>
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

function useCountUp(target: number, durationMs: number): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let frame = 0;
    const start = performance.now();
    const from = value;

    function tick(now: number) {
      const progress = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    }

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, durationMs]);

  return value;
}

function getPlayerGradient(id: string): string {
  const palettes = [
    "linear-gradient(135deg, #ff3ea5, #a855f7)",
    "linear-gradient(135deg, #22d3ee, #4ade80)",
    "linear-gradient(135deg, #facc15, #ff3ea5)",
    "linear-gradient(135deg, #4ade80, #a855f7)",
    "linear-gradient(135deg, #fb7185, #22d3ee)",
    "linear-gradient(135deg, #a855f7, #facc15)",
  ];
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) % 997;
  }
  return palettes[hash % palettes.length];
}
