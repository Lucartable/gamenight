"use client";

import type { ReactNode } from "react";
import { PlayerAvatar } from "@/components/playerAvatar";
import {
  getCategoryForGame,
  type WhoOfUsGameQuestion,
  type WhoWouldQuestion,
} from "@/lib/gameQuestions";
import { useCountUp } from "@/lib/useCountUp";
import { triggerHaptic } from "@/lib/utils";
import type {
  Choice,
  Player,
  Vote,
} from "@/types/database";

export function WhoWouldActiveView({
  question,
  voteLeft,
  votedCount,
  totalPlayers,
  selectedChoice,
  validatedChoice,
  submitting,
  busy,
  onSelect,
  onSubmit,
  onRevealNow,
}: {
  question: WhoWouldQuestion;
  voteLeft: number;
  votedCount: number;
  totalPlayers: number;
  selectedChoice: Choice | null;
  validatedChoice: Choice | null;
  submitting: boolean;
  busy: boolean;
  onSelect: (choice: Choice) => void;
  onSubmit: () => void;
  onRevealNow: () => void;
}) {
  const locked = Boolean(validatedChoice) || submitting || voteLeft === 0;
  const category = getCategoryForGame("who_would", question.category);

  return (
    <QuestionShell category={category} voteLeft={voteLeft} votedCount={votedCount} totalPlayers={totalPlayers}>
      {question.text && <h2 className="mt-4 text-center text-3xl font-black leading-tight">{question.text}</h2>}
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <ChoiceButton
          accent="pink"
          label="A"
          text={question.optionA}
          selected={(validatedChoice ?? selectedChoice) === "A"}
          disabled={locked}
          onClick={() => onSelect("A")}
        />
        <ChoiceButton
          accent="cyan"
          label="B"
          text={question.optionB}
          selected={(validatedChoice ?? selectedChoice) === "B"}
          disabled={locked}
          onClick={() => onSelect("B")}
        />
      </div>
      <VoteActions
        canSubmit={Boolean(selectedChoice) && !locked}
        validated={Boolean(validatedChoice)}
        submitting={submitting}
        busy={busy}
        onSubmit={onSubmit}
        onRevealNow={onRevealNow}
      />
    </QuestionShell>
  );
}

export function WhoOfUsActiveView({
  question,
  voteLeft,
  votedCount,
  totalPlayers,
  targetPlayers,
  selectedPlayerId,
  validatedPlayerId,
  submitting,
  busy,
  onSelect,
  onSubmit,
  onRevealNow,
}: {
  question: WhoOfUsGameQuestion;
  voteLeft: number;
  votedCount: number;
  totalPlayers: number;
  targetPlayers: Player[];
  selectedPlayerId: string | null;
  validatedPlayerId: string | null;
  submitting: boolean;
  busy: boolean;
  onSelect: (playerId: string) => void;
  onSubmit: () => void;
  onRevealNow: () => void;
}) {
  const locked = Boolean(validatedPlayerId) || submitting || voteLeft === 0;
  const category = getCategoryForGame("who_of_us", question.category);
  const activePlayerId = validatedPlayerId ?? selectedPlayerId;

  return (
    <QuestionShell category={category} voteLeft={voteLeft} votedCount={votedCount} totalPlayers={totalPlayers}>
      <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-left">
        <div className="text-xs font-bold uppercase tracking-wider text-white/50">Question</div>
        <h2 className="mt-2 text-2xl font-black leading-tight">{question.text}</h2>
      </div>
      <div className="mt-4 grid gap-2">
        {targetPlayers.map((player) => (
          <PlayerTargetButton
            key={player.id}
            player={player}
            selected={activePlayerId === player.id}
            disabled={locked}
            onClick={() => onSelect(player.id)}
          />
        ))}
      </div>
      <VoteActions
        canSubmit={Boolean(selectedPlayerId) && !locked}
        validated={Boolean(validatedPlayerId)}
        submitting={submitting}
        busy={busy}
        onSubmit={onSubmit}
        onRevealNow={onRevealNow}
      />
    </QuestionShell>
  );
}

export function WhoWouldRevealView({
  question,
  players,
  votes,
  revealLeft,
  autoplay,
  isFinal,
  busy,
  onNext,
  onEnd,
  onBackToLobby,
}: {
  question: WhoWouldQuestion;
  players: Player[];
  votes: Vote[];
  revealLeft: number;
  autoplay: boolean;
  isFinal: boolean;
  busy: boolean;
  onNext: () => void;
  onEnd: () => void;
  onBackToLobby: () => void;
}) {
  const category = getCategoryForGame("who_would", question.category);
  const stats = getWhoWouldStats(players, votes);
  const namesFor = (choice: Choice) =>
    votes
      .filter((vote) => vote.selected_option === choice)
      .map((vote) => players.find((player) => player.id === vote.voter_player_id)?.name)
      .filter((name): name is string => Boolean(name));

  return (
    <RevealShell
      category={category}
      totalVotes={stats.total}
      revealLeft={revealLeft}
      autoplay={autoplay}
      isFinal={isFinal}
      busy={busy}
      onNext={onNext}
      onEnd={onEnd}
      onBackToLobby={onBackToLobby}
    >
      {question.text && <h2 className="mb-3 text-center text-3xl font-black leading-tight">{question.text}</h2>}
      <div className="grid flex-1 gap-3 sm:grid-cols-2">
        <ResultCard
          accent="pink"
          label="Option A"
          text={question.optionA}
          count={stats.aCount}
          percent={stats.aPercent}
          names={namesFor("A")}
        />
        <ResultCard
          accent="cyan"
          label="Option B"
          text={question.optionB}
          count={stats.bCount}
          percent={stats.bPercent}
          names={namesFor("B")}
        />
      </div>
    </RevealShell>
  );
}

export function WhoOfUsRevealView({
  question,
  players,
  votes,
  revealLeft,
  autoplay,
  isFinal,
  busy,
  onNext,
  onEnd,
  onBackToLobby,
}: {
  question: WhoOfUsGameQuestion;
  players: Player[];
  votes: Vote[];
  revealLeft: number;
  autoplay: boolean;
  isFinal: boolean;
  busy: boolean;
  onNext: () => void;
  onEnd: () => void;
  onBackToLobby: () => void;
}) {
  const category = getCategoryForGame("who_of_us", question.category);
  const stats = getWhoOfUsStats(players, votes);

  return (
    <RevealShell
      category={category}
      totalVotes={stats.total}
      revealLeft={revealLeft}
      autoplay={autoplay}
      isFinal={isFinal}
      busy={busy}
      onNext={onNext}
      onEnd={onEnd}
      onBackToLobby={onBackToLobby}
    >
      <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="text-xs font-bold uppercase tracking-wider text-white/50">Question</div>
        <h2 className="mt-2 text-2xl font-black leading-tight">{question.text}</h2>
      </div>

      <div className="grid gap-3">
        {stats.ranking.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-center text-white/60">
            Aucun vote reçu.
          </div>
        ) : (
          stats.ranking.map((row) => (
            <RankingCard key={row.targetId} row={row} topCount={stats.topCount} />
          ))
        )}
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="mb-3 text-xs font-bold uppercase tracking-wider text-white/50">Détail des votes</div>
        <ul className="space-y-2">
          {stats.details.map((detail) => (
            <li key={detail.voterId} className="flex items-center justify-between gap-3 rounded-xl bg-bg-soft p-3">
              <span className="font-bold">{detail.voterName}</span>
              <span className="text-right text-sm text-white/70">{detail.targetName ?? "n'a pas voté"}</span>
            </li>
          ))}
        </ul>
      </div>
    </RevealShell>
  );
}

function QuestionShell({
  category,
  voteLeft,
  votedCount,
  totalPlayers,
  children,
}: {
  category: ReturnType<typeof getCategoryForGame>;
  voteLeft: number;
  votedCount: number;
  totalPlayers: number;
  children: ReactNode;
}) {
  return (
    <section className="card game-panel-enter flex flex-1 flex-col p-5 text-center animate-reveal-in">
      <div className="flex items-center justify-center gap-2">
        {category && <span className="chip">{category.emoji} {category.label}</span>}
        <span className="rounded-full bg-neon-pink/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-neon-pink animate-pulseSoft">
          Vote ouvert
        </span>
      </div>
      <div className={`mt-4 text-7xl font-black tabular-nums ${voteLeft <= 5 ? "timer-hot text-neon-pink" : "text-white"}`}>{voteLeft}</div>
      <div className="text-sm text-white/50">{votedCount} / {totalPlayers} vote{totalPlayers > 1 ? "s" : ""} envoyés</div>
      {children}
    </section>
  );
}

function ChoiceButton({
  accent,
  label,
  text,
  selected,
  disabled,
  onClick,
}: {
  accent: "pink" | "cyan";
  label: string;
  text: string;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const base = accent === "pink" ? "border-neon-pink/40 bg-neon-pink/10" : "border-neon-cyan/40 bg-neon-cyan/10";
  const selectedClass = accent === "pink" ? "ring-4 ring-neon-pink shadow-glow-pink" : "ring-4 ring-neon-cyan shadow-glow-cyan";
  const labelColor = accent === "pink" ? "text-neon-pink" : "text-neon-cyan";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        triggerHaptic(10);
        onClick();
      }}
      className={`prediction-card flex min-h-40 flex-col items-center justify-center rounded-2xl border-2 p-4 text-center transition duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 ${base} ${selected ? selectedClass : "hover:-translate-y-0.5 hover:bg-white/10"}`}
    >
      <span className={`text-xs font-bold uppercase tracking-widest ${labelColor}`}>Option {label}</span>
      <span className="mt-2 text-base font-bold leading-tight">{text}</span>
    </button>
  );
}

function PlayerTargetButton({
  player,
  selected,
  disabled,
  onClick,
}: {
  player: Player;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        triggerHaptic(10);
        onClick();
      }}
      className={`prediction-card flex items-center justify-between rounded-2xl border p-4 text-left transition duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 ${
        selected
          ? "border-neon-cyan bg-neon-cyan/10 shadow-glow-cyan"
          : "border-white/10 bg-white/5 hover:-translate-y-0.5 hover:border-neon-cyan/50"
      }`}
    >
      <span className="flex min-w-0 items-center gap-3">
        <PlayerAvatar player={player} size="md" />
        <span className="truncate text-xl font-black">{player.name}</span>
      </span>
      {selected && <span className="text-sm font-bold text-neon-cyan">Sélectionné</span>}
    </button>
  );
}

function VoteActions({
  canSubmit,
  validated,
  submitting,
  busy,
  onSubmit,
  onRevealNow,
}: {
  canSubmit: boolean;
  validated: boolean;
  submitting: boolean;
  busy: boolean;
  onSubmit: () => void;
  onRevealNow: () => void;
}) {
  return (
    <>
      <button
        type="button"
        disabled={!canSubmit}
        onClick={() => {
          triggerHaptic([12, 30, 18]);
          onSubmit();
        }}
        className="btn-primary mt-4 w-full disabled:shadow-none"
      >
        {submitting ? "Envoi..." : validated ? "Vote envoyé" : "Valider mon choix"}
      </button>
      {validated && (
        <p className="mt-3 text-sm font-semibold text-neon-green">Vote envoyé</p>
      )}
      <button
        type="button"
        onClick={onRevealNow}
        disabled={busy}
        className="btn-secondary mt-4"
      >
        Révéler maintenant
      </button>
    </>
  );
}

function RevealShell({
  category,
  totalVotes,
  revealLeft,
  autoplay,
  isFinal,
  busy,
  onNext,
  onEnd,
  onBackToLobby,
  children,
}: {
  category: ReturnType<typeof getCategoryForGame>;
  totalVotes: number;
  revealLeft: number;
  autoplay: boolean;
  isFinal: boolean;
  busy: boolean;
  onNext: () => void;
  onEnd: () => void;
  onBackToLobby: () => void;
  children: ReactNode;
}) {
  return (
    <section className="card game-panel-enter flex flex-1 flex-col p-5">
      <div className="mb-4 flex items-center justify-center gap-2">
        {category && <span className="chip">{category.emoji} {category.label}</span>}
        <span className="text-xs uppercase tracking-wider text-white/50">Résultats</span>
      </div>

      {children}

      <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
        <div className="text-xs uppercase tracking-wider text-white/50">
          {totalVotes} vote{totalVotes > 1 ? "s" : ""} validé{totalVotes > 1 ? "s" : ""}
        </div>
        {autoplay && (
          <div className="mt-1 text-3xl font-black tabular-nums">
            {revealLeft}s
          </div>
        )}
      </div>

      {autoplay ? (
        <p className="mt-4 text-center text-sm font-semibold text-neon-cyan">
          {isFinal ? "Fin automatique en cours" : "Question suivante automatique"}
        </p>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            disabled={busy}
            onClick={isFinal ? onEnd : onNext}
            className="btn-primary"
          >
            {isFinal ? "Résultats finaux" : "Question suivante"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onBackToLobby}
            className="btn-secondary"
          >
            Retour au lobby
          </button>
        </div>
      )}
    </section>
  );
}

function ResultCard({
  accent,
  label,
  text,
  count,
  percent,
  names,
}: {
  accent: "pink" | "cyan";
  label: string;
  text: string;
  count: number;
  percent: number;
  names: string[];
}) {
  const labelColor = accent === "pink" ? "text-neon-pink" : "text-neon-cyan";
  const barColor = accent === "pink" ? "bg-neon-pink" : "bg-neon-cyan";
  const shownPercent = useCountUp(percent);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 animate-reveal-in">
      <div className={`text-xs font-bold uppercase tracking-widest ${labelColor}`}>{label}</div>
      <div className="mt-2 text-base font-semibold text-white/90">{text}</div>
      <div className="mt-4 flex items-end justify-between gap-3">
        <div className="text-4xl font-black tabular-nums">{shownPercent}%</div>
        <div className="pb-1 text-sm text-white/60">
          {count} vote{count > 1 ? "s" : ""}
        </div>
      </div>
      <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/10">
        <div className={`result-fill h-full rounded-full ${barColor}`} style={{ width: `${percent}%` }} />
      </div>
      {names.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {names.map((name) => (
            <li key={name} className="chip">{name}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RankingCard({ row, topCount }: { row: WhoOfUsRankingRow; topCount: number }) {
  const isTop = topCount > 0 && row.count === topCount;
  return (
    <div className={`rounded-2xl border p-4 animate-reveal-in ${isTop ? "border-neon-yellow/60 bg-neon-yellow/10 shadow-glow" : "border-white/10 bg-white/5"}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-2xl font-black">{row.targetName}</div>
          {isTop && <div className="mt-1 text-xs font-bold uppercase tracking-wider text-neon-yellow">Meilleur suspect</div>}
        </div>
        <div className="text-right">
          <div className="text-3xl font-black tabular-nums">{row.count}</div>
          <div className="text-xs text-white/50">vote{row.count > 1 ? "s" : ""}</div>
        </div>
      </div>
      <div className="mt-3 text-sm text-white/60">Voté par</div>
      <ul className="mt-2 flex flex-wrap gap-2">
        {row.voters.map((name) => (
          <li key={name} className="chip">{name}</li>
        ))}
      </ul>
    </div>
  );
}

interface WhoWouldStats {
  total: number;
  aCount: number;
  bCount: number;
  aPercent: number;
  bPercent: number;
}

interface WhoOfUsRankingRow {
  targetId: string;
  targetName: string;
  count: number;
  voters: string[];
}

interface WhoOfUsDetailRow {
  voterId: string;
  voterName: string;
  targetName: string | null;
}

function getWhoWouldStats(players: Player[], votes: Vote[]): WhoWouldStats {
  const playerIds = new Set(players.map((player) => player.id));
  const validVotes = votes.filter(
    (vote) => playerIds.has(vote.voter_player_id) && (vote.selected_option === "A" || vote.selected_option === "B")
  );
  const total = validVotes.length;
  const aCount = validVotes.filter((vote) => vote.selected_option === "A").length;
  const bCount = validVotes.filter((vote) => vote.selected_option === "B").length;
  return {
    total,
    aCount,
    bCount,
    aPercent: total === 0 ? 0 : Math.round((aCount / total) * 100),
    bPercent: total === 0 ? 0 : Math.round((bCount / total) * 100),
  };
}

function getWhoOfUsStats(players: Player[], votes: Vote[]) {
  const playerById = new Map(players.map((player) => [player.id, player]));
  const ranking = new Map<string, WhoOfUsRankingRow>();
  const voteByVoter = new Map<string, Vote>();

  for (const vote of votes) {
    if (!playerById.has(vote.voter_player_id)) continue;
    voteByVoter.set(vote.voter_player_id, vote);
    if (!vote.selected_player_id) continue;
    const target = playerById.get(vote.selected_player_id);
    const targetId = vote.selected_player_id;
    const voterName = playerById.get(vote.voter_player_id)?.name ?? "Joueur parti";
    const row = ranking.get(targetId) ?? {
      targetId,
      targetName: target?.name ?? "Joueur parti",
      count: 0,
      voters: [],
    };
    row.count += 1;
    row.voters.push(voterName);
    ranking.set(targetId, row);
  }

  const sortedRanking = [...ranking.values()].sort(
    (a, b) => b.count - a.count || a.targetName.localeCompare(b.targetName)
  );
  const details: WhoOfUsDetailRow[] = players.map((player) => {
    const vote = voteByVoter.get(player.id);
    const target = vote?.selected_player_id ? playerById.get(vote.selected_player_id) : null;
    return {
      voterId: player.id,
      voterName: player.name,
      targetName: vote?.selected_player_id ? target?.name ?? "Joueur parti" : null,
    };
  });

  return {
    total: voteByVoter.size,
    ranking: sortedRanking,
    details,
    topCount: sortedRanking[0]?.count ?? 0,
  };
}
