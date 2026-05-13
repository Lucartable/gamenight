"use client";

import { useEffect, useMemo, useState } from "react";
import {
  buildEndGameSummary,
  type EndGameSummary,
  type SummaryHeatCell,
  type SummaryScoreRow,
  type SummarySpotlight,
  type SummaryTone,
} from "@/lib/endGameSummary";
import { useCountUp } from "@/lib/useCountUp";
import { triggerHaptic } from "@/lib/utils";
import { playSfx } from "@/lib/audio";
import { AnonymousAvatar, PlayerAvatar } from "@/components/playerAvatar";
import { Button } from "@/components/ui";
import type { AskedQuestion, GameType, IntrusGameState, JaugeGameState, MimeGameState, Player, Rating, Vote } from "@/types/database";

const TONE_STYLES: Record<SummaryTone, { border: string; bg: string; text: string; glow: string; bar: string }> = {
  gold: {
    border: "border-neon-yellow/60",
    bg: "bg-neon-yellow/10",
    text: "text-neon-yellow",
    glow: "shadow-glow",
    bar: "from-neon-yellow to-neon-pink",
  },
  cyan: {
    border: "border-neon-cyan/60",
    bg: "bg-neon-cyan/10",
    text: "text-neon-cyan",
    glow: "shadow-glow-cyan",
    bar: "from-neon-cyan to-neon-green",
  },
  pink: {
    border: "border-neon-pink/60",
    bg: "bg-neon-pink/10",
    text: "text-neon-pink",
    glow: "shadow-glow-pink",
    bar: "from-neon-pink to-neon-purple",
  },
  green: {
    border: "border-neon-green/60",
    bg: "bg-neon-green/10",
    text: "text-neon-green",
    glow: "shadow-glow-cyan",
    bar: "from-neon-green to-neon-cyan",
  },
  purple: {
    border: "border-neon-purple/60",
    bg: "bg-neon-purple/10",
    text: "text-neon-purple",
    glow: "shadow-glow",
    bar: "from-neon-purple to-neon-cyan",
  },
  ghost: {
    border: "border-white/15",
    bg: "bg-white/5",
    text: "text-white/55",
    glow: "",
    bar: "from-white/30 to-white/10",
  },
  danger: {
    border: "border-neon-pink/70",
    bg: "bg-neon-pink/15",
    text: "text-neon-pink",
    glow: "summary-shake shadow-glow-pink",
    bar: "from-neon-pink via-neon-yellow to-neon-pink",
  },
};

export function EndGameSummaryPanel({
  gameType,
  players,
  votes,
  ratings,
  askedQuestions,
  roundQuestionIds,
  mimeGameState,
  jaugeGameState,
  intrusGameState,
  isHost = false,
  busy = false,
  onReplay,
  onBackToLobby,
  onEnd,
}: {
  gameType: GameType | null | undefined;
  players: Player[];
  votes: Vote[];
  ratings?: Rating[];
  askedQuestions: AskedQuestion[];
  roundQuestionIds?: number[];
  mimeGameState: MimeGameState | null;
  jaugeGameState?: JaugeGameState | null;
  intrusGameState?: IntrusGameState | null;
  isHost?: boolean;
  busy?: boolean;
  onReplay?: () => void;
  onBackToLobby?: () => void;
  onEnd?: () => void;
}) {
  const summary = useMemo(
    () => buildEndGameSummary({ gameType, players, votes, ratings: ratings ?? [], askedQuestions, roundQuestionIds, mimeGameState, jaugeGameState, intrusGameState }),
    [askedQuestions, gameType, intrusGameState, jaugeGameState, mimeGameState, players, ratings, roundQuestionIds, votes]
  );
  const [stage, setStage] = useState(0);

  useEffect(() => {
    setStage(0);
    const timers = [350, 1050, 1750, 2450, 3150, 3850].map((delay, index) =>
      window.setTimeout(() => {
        setStage(index + 1);
        if (index === 0 || index === 3) triggerHaptic(index === 3 ? [10, 20, 10] : 16);
        if (index === 0) playSfx("reveal");
        else if (index === 1) playSfx("leaderboard");
        else if (index === 2) playSfx("scoreUp");
        else if (index === 3) playSfx("reveal");
        else if (index === 4) playSfx("scoreUp");
        else if (index === 5) playSfx("primary");
      }, delay)
    );
    return () => timers.forEach(window.clearTimeout);
  }, [summary.title]);

  return (
    <main className={`summary-stage summary-mode-${summary.profile} min-h-dvh overflow-hidden px-4 py-5 text-white`}>
      <div className="summary-scanlines" aria-hidden="true" />
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <SummaryHero summary={summary} visible={stage >= 1} />
        <LiveScoreboard summary={summary} visible={stage >= 2} />
        <SpotlightGrid summary={summary} visible={stage >= 3} />
        <RelationHeatmap summary={summary} visible={stage >= 4} />
        <RareMoments summary={summary} visible={stage >= 5} />
        <FinalRecap
          summary={summary}
          visible={stage >= 6}
          isHost={isHost}
          busy={busy}
          onReplay={onReplay}
          onBackToLobby={onBackToLobby}
          onEnd={onEnd}
        />
      </div>
    </main>
  );
}

function SummaryHero({ summary, visible }: { summary: EndGameSummary; visible: boolean }) {
  return (
    <section className={`summary-panel relative overflow-hidden p-5 text-center ${visible ? "summary-in" : "summary-out"}`}>
      {visible && <SummaryConfetti />}
      <div className="relative z-10">
        <div className="mx-auto mb-4 w-fit rounded-full border border-neon-cyan/40 bg-neon-cyan/10 px-4 py-1 text-xs font-black uppercase tracking-wider text-neon-cyan">
          Bilan de soirée
        </div>
        <h1 className="summary-title mx-auto max-w-2xl text-5xl font-black leading-none sm:text-7xl">
          {summary.title}
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm font-semibold text-white/65 sm:text-base">{summary.subtitle}</p>
        {summary.leader && (
          <div className="mx-auto mt-5 flex w-fit items-center gap-3 rounded-2xl border border-neon-yellow/40 bg-neon-yellow/10 px-4 py-3 shadow-glow">
            <PlayerAvatar player={summary.leader.player} size="lg" />
            <div className="text-left">
              <div className="text-xs font-bold uppercase tracking-wider text-neon-yellow">{summary.leaderLabel}</div>
              <div className="text-2xl font-black">{summary.leader.player.name}</div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function LiveScoreboard({ summary, visible }: { summary: EndGameSummary; visible: boolean }) {
  const rows = summary.scoreboard;
  const labels = summary.sectionLabels;
  return (
    <section className={`summary-panel p-4 ${visible ? "summary-in" : "summary-out"}`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-black uppercase tracking-wider text-white/45">{labels.scoreboardEyebrow}</div>
          <h2 className="text-2xl font-black">{labels.scoreboardTitle}</h2>
        </div>
        <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-white/60">
          {labels.scoreboardPill}
        </div>
      </div>

      <div className="grid gap-3">
        {rows.length ? rows.map((row, index) => (
          <ScoreRow key={row.player.id} row={row} index={index} />
        )) : (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-center text-white/60">
            {labels.scoreboardEmpty}
          </div>
        )}
      </div>
    </section>
  );
}

function ScoreRow({ row, index }: { row: SummaryScoreRow; index: number }) {
  const score = useCountUp(row.score, 650 + index * 90);
  const tone = TONE_STYLES[row.tone];
  const width = `${Math.max(8, Math.min(100, row.rank === 1 ? 100 : 86 - index * 9))}%`;

  return (
    <div
      className={`summary-score-row rounded-2xl border p-3 ${tone.border} ${tone.bg} ${row.rank === 1 ? tone.glow : ""}`}
      style={{ animationDelay: `${index * 90}ms` }}
    >
      <div className="flex items-center gap-3">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border font-black ${tone.border} ${tone.text}`}>
          #{row.rank}
        </div>
        <PlayerAvatar player={row.player} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-xl font-black">{row.player.name}</div>
          <div className="text-xs text-white/50">{row.detail}</div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-black tabular-nums">{score}</div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-white/45">{row.scoreLabel}</div>
        </div>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
        <div className={`summary-score-fill h-full rounded-full bg-gradient-to-r ${tone.bar}`} style={{ width }} />
      </div>
    </div>
  );
}

function SpotlightGrid({ summary, visible }: { summary: EndGameSummary; visible: boolean }) {
  return (
    <section className={`summary-panel p-4 ${visible ? "summary-in" : "summary-out"}`}>
      <div className="mb-4">
        <div className="text-xs font-black uppercase tracking-wider text-white/45">{summary.sectionLabels.spotlightsEyebrow}</div>
        <h2 className="text-2xl font-black">{summary.sectionLabels.spotlightsTitle}</h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {summary.spotlights.map((spotlight, index) => (
          <SpotlightCard key={spotlight.id} spotlight={spotlight} index={index} />
        ))}
      </div>
    </section>
  );
}

function SpotlightCard({ spotlight, index }: { spotlight: SummarySpotlight; index: number }) {
  const tone = TONE_STYLES[spotlight.tone];
  return (
    <article
      className={`summary-award-card rounded-2xl border p-4 ${tone.border} ${tone.bg} ${tone.glow}`}
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <div className="flex items-start gap-3">
        {spotlight.player ? <PlayerAvatar player={spotlight.player} size="lg" /> : <AnonymousAvatar size="lg" />}
        <div className="min-w-0 flex-1">
          <div className={`text-xs font-black uppercase tracking-wider ${tone.text}`}>{spotlight.label}</div>
          <h3 className="mt-1 text-xl font-black leading-tight">{spotlight.title}</h3>
        </div>
        <div className={`rounded-2xl border px-3 py-2 text-2xl font-black tabular-nums ${tone.border} ${tone.text}`}>
          {spotlight.value}
        </div>
      </div>
      <p className="mt-3 text-sm font-medium text-white/65">{spotlight.detail}</p>
    </article>
  );
}

function RelationHeatmap({ summary, visible }: { summary: EndGameSummary; visible: boolean }) {
  return (
    <section className={`summary-panel p-4 ${visible ? "summary-in" : "summary-out"}`}>
      <div className="mb-4">
        <div className="text-xs font-black uppercase tracking-wider text-white/45">{summary.sectionLabels.heatmapEyebrow}</div>
        <h2 className="text-2xl font-black">{summary.sectionLabels.heatmapTitle}</h2>
      </div>

      {summary.heatmap.length > 0 ? (
        <div className="grid gap-2">
          {summary.heatmap.slice(0, 10).map((cell, index) => (
            <HeatRow key={`${cell.from.id}-${cell.to.id}-${index}`} cell={cell} index={index} mode={summary.heatmapMode} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-center text-white/60">
          {summary.sectionLabels.heatmapEmpty}
        </div>
      )}

      <div className="mt-4 grid gap-2">
        {summary.relationInsights.map((line, index) => (
          <div key={line} className="summary-feed-item rounded-2xl border border-white/10 bg-white/5 p-3 text-sm font-semibold text-white/75" style={{ animationDelay: `${index * 80}ms` }}>
            {line}
          </div>
        ))}
      </div>
    </section>
  );
}

function HeatRow({ cell, index, mode }: { cell: SummaryHeatCell; index: number; mode: EndGameSummary["heatmapMode"] }) {
  const value = useCountUp(cell.percent, 560 + index * 40);
  const label = mode === "targets" ? "vise" : mode === "alliances" ? "sync" : "relais";
  const metric = cell.metricLabel ?? `${value}%`;
  const detail =
    cell.detail ??
    (mode === "alliances"
      ? `${cell.value} manche${cell.value > 1 ? "s" : ""} synchronisée${cell.value > 1 ? "s" : ""}`
      : `${cell.value} interaction${cell.value > 1 ? "s" : ""}`);
  return (
    <div className="summary-heat-row rounded-2xl border border-white/10 bg-white/5 p-3" style={{ animationDelay: `${index * 70}ms` }}>
      <div className="mb-2 flex items-center gap-2">
        <PlayerAvatar player={cell.from} size="sm" />
        <div className="min-w-0 flex-1 truncate text-sm font-black">{cell.from.name}</div>
        <div className="rounded-full border border-neon-cyan/30 bg-neon-cyan/10 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-neon-cyan">
          {label}
        </div>
        <PlayerAvatar player={cell.to} size="sm" />
        <div className="min-w-0 flex-1 truncate text-right text-sm font-black">{cell.to.name}</div>
      </div>
      <div className="flex items-center gap-3">
        <div className="h-3 flex-1 overflow-hidden rounded-full bg-white/10">
          <div className="summary-heat-fill h-full rounded-full bg-gradient-to-r from-neon-cyan via-neon-pink to-neon-yellow" style={{ width: `${Math.max(5, cell.percent)}%` }} />
        </div>
        <div className="w-14 text-right text-lg font-black tabular-nums">{metric}</div>
      </div>
      <div className="mt-1 text-xs text-white/45">{detail}</div>
    </div>
  );
}

function RareMoments({ summary, visible }: { summary: EndGameSummary; visible: boolean }) {
  return (
    <section className={`summary-panel p-4 ${visible ? "summary-in" : "summary-out"}`}>
      <div className="mb-4">
        <div className="text-xs font-black uppercase tracking-wider text-white/45">{summary.sectionLabels.rareEyebrow}</div>
        <h2 className="text-2xl font-black">{summary.sectionLabels.rareTitle}</h2>
      </div>
      <div className="grid gap-3">
        {(summary.rareMoments.length ? summary.rareMoments : [{ title: summary.sectionLabels.rareFallbackTitle, detail: summary.sectionLabels.rareFallbackDetail, tone: "cyan" as const }]).map((moment, index) => {
          const tone = TONE_STYLES[moment.tone];
          return (
            <div key={`${moment.title}-${index}`} className={`summary-moment rounded-2xl border p-4 ${tone.border} ${tone.bg} ${tone.glow}`} style={{ animationDelay: `${index * 90}ms` }}>
              <div className={`text-xs font-black uppercase tracking-wider ${tone.text}`}>Moment rare</div>
              <div className="mt-1 text-2xl font-black">{moment.title}</div>
              <p className="mt-2 text-sm text-white/65">{moment.detail}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function FinalRecap({
  summary,
  visible,
  isHost,
  busy,
  onReplay,
  onBackToLobby,
  onEnd,
}: {
  summary: EndGameSummary;
  visible: boolean;
  isHost: boolean;
  busy: boolean;
  onReplay?: () => void;
  onBackToLobby?: () => void;
  onEnd?: () => void;
}) {
  return (
    <section className={`summary-panel mb-8 p-4 ${visible ? "summary-in" : "summary-out"}`}>
      <div className="mb-4">
        <div className="text-xs font-black uppercase tracking-wider text-white/45">{summary.sectionLabels.recapEyebrow}</div>
        <h2 className="text-2xl font-black">{summary.sectionLabels.recapTitle}</h2>
      </div>
      <div className="grid gap-2">
        {summary.recapLines.map((line, index) => (
          <div key={line} className="summary-recap-line rounded-2xl border border-white/10 bg-white/5 p-3 text-sm font-bold text-white/75" style={{ animationDelay: `${index * 90}ms` }}>
            {line}
          </div>
        ))}
      </div>
      {isHost && (onBackToLobby || onReplay || onEnd) && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {(onBackToLobby || onReplay) && (
            <Button variant="primary" size="md" fullWidth disabled={busy} onClick={onBackToLobby ?? onReplay}>
              Retour au lobby
            </Button>
          )}
          {onEnd && (
            <Button variant="danger" size="md" fullWidth disabled={busy} onClick={onEnd}>
              Terminer la partie
            </Button>
          )}
        </div>
      )}
    </section>
  );
}

function SummaryConfetti() {
  return (
    <div className="confetti-field" aria-hidden="true">
      {Array.from({ length: 14 }).map((_, index) => (
        <span key={index} />
      ))}
    </div>
  );
}
