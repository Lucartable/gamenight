"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import { useRoom } from "@/lib/useRoom";
import { useCountdown } from "@/lib/useCountdown";
import {
  type WhoOfUsGameQuestion,
  type WhoWouldQuestion,
  getCategoryForGame,
  getGameDefinition,
  getQuestionForGame,
} from "@/lib/gameQuestions";
import {
  DEFAULT_REVEAL_DURATION_SEC,
  DEFAULT_VOTE_DURATION_SEC,
  getOrCreateClientId,
} from "@/lib/utils";
import type { Choice, GameType, Player, Vote } from "@/types/database";

interface LocalVote {
  qid: number;
  selected_option: Choice | null;
  selected_player_id: string | null;
}

export default function PlayerPage() {
  const params = useParams<{ code: string }>();
  const code = params.code?.toUpperCase() ?? "";
  const router = useRouter();
  const { room, players, votes, loading, error, refresh } = useRoom(code);
  const [selectedOption, setSelectedOption] = useState<Choice | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [voteError, setVoteError] = useState<string | null>(null);
  const [optimisticVote, setOptimisticVote] = useState<LocalVote | null>(null);

  const me = useMemo<Player | undefined>(() => {
    if (!players.length) return undefined;
    const id = getOrCreateClientId();
    return players.find((p) => p.client_id === id);
  }, [players]);

  useEffect(() => {
    if (!room) return;
    const id = getOrCreateClientId();
    if (id === room.host_client_id) router.replace(`/host/${code}`);
  }, [room?.host_client_id, code, room, router]);

  const gameType = room?.game_type ?? null;
  const gameDefinition = getGameDefinition(gameType);
  const currentQ = getQuestionForGame(gameType, room?.current_question_id);

  useEffect(() => {
    setSelectedOption(null);
    setSelectedPlayerId(null);
    setSubmitting(false);
    setOptimisticVote(null);
  }, [currentQ?.id]);

  const currentVotes = useMemo(
    () =>
      currentQ && gameType
        ? votes.filter((vote) => vote.game_type === gameType && vote.question_id === currentQ.id)
        : [],
    [votes, currentQ, gameType]
  );
  const myVote = useMemo<Vote | undefined>(() => {
    if (!me) return undefined;
    return currentVotes.find((vote) => vote.voter_player_id === me.id);
  }, [me, currentVotes]);

  const effectiveVote =
    optimisticVote && currentQ && optimisticVote.qid === currentQ.id
      ? optimisticVote
      : voteToLocalVote(myVote);

  async function submitVote() {
    setVoteError(null);
    if (!room || !gameType) { setVoteError("Partie non configurée."); return; }
    if (!currentQ) { setVoteError("Aucune question active."); return; }
    if (!me) {
      setVoteError(
        `Tu n'es pas dans la liste des joueurs (${players.length} chargé${players.length > 1 ? "s" : ""}). Reviens à l'accueil pour rejoindre à nouveau.`
      );
      return;
    }
    if (effectiveVote || submitting) return;

    const selected_option = gameType === "who_would" ? selectedOption : null;
    const selected_player_id = gameType === "who_of_us" ? selectedPlayerId : null;
    if (gameType === "who_would" && !selected_option) return;
    if (gameType === "who_of_us" && (!selected_player_id || selected_player_id === me.id)) return;

    setSubmitting(true);
    setOptimisticVote({ qid: currentQ.id, selected_option, selected_player_id });

    try {
      const { error } = await getSupabase().from("votes").upsert(
        {
          room_id: room.id,
          game_type: gameType,
          voter_player_id: me.id,
          question_id: currentQ.id,
          selected_option,
          selected_player_id,
        },
        { onConflict: "room_id,game_type,question_id,voter_player_id" }
      );
      if (error) throw error;
      await refresh();
    } catch (err) {
      setVoteError(err instanceof Error ? err.message : "Erreur d'enregistrement du vote.");
      setOptimisticVote(null);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <CenteredMessage title="Chargement..." />;
  if (error || !room)
    return <CenteredMessage title="Salle introuvable" subtitle={error ?? undefined} action={{ label: "Retour", href: "/" }} />;
  if (!me)
    return <CenteredMessage title="Tu n'as pas encore rejoint cette salle" action={{ label: "Rejoindre", href: "/" }} />;
  if (room.status === "ended")
    return <CenteredMessage title="Partie terminée" subtitle="Merci d'avoir joué !" action={{ label: "Retour", href: "/" }} />;

  const voteDuration = room.vote_duration_sec ?? DEFAULT_VOTE_DURATION_SEC;
  const revealDuration = room.reveal_duration_sec ?? DEFAULT_REVEAL_DURATION_SEC;
  const targetPlayers = players.filter((player) => player.id !== me.id);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 py-6">
      <PlayerHeader
        code={room.code}
        me={me}
        totalPlayers={players.length}
        gameLabel={gameDefinition?.shortLabel}
      />

      {voteError && (
        <div className="card mb-3 border-neon-pink/60 bg-neon-pink/10 p-3 text-center text-neon-pink">
          {voteError}
        </div>
      )}

      {room.status === "lobby" && <Lobby players={players} gameLabel={gameDefinition?.label} />}

      {room.status === "question_active" && currentQ && gameType === "who_would" && (
        <WhoWouldVoteScreen
          question={currentQ as WhoWouldQuestion}
          startedAt={room.question_started_at}
          durationSec={voteDuration}
          selectedChoice={selectedOption}
          validatedChoice={effectiveVote?.selected_option ?? null}
          submitting={submitting}
          onSelect={setSelectedOption}
          onSubmit={submitVote}
        />
      )}

      {room.status === "question_active" && currentQ && gameType === "who_of_us" && (
        <WhoOfUsVoteScreen
          question={currentQ as WhoOfUsGameQuestion}
          startedAt={room.question_started_at}
          durationSec={voteDuration}
          players={targetPlayers}
          selectedPlayerId={selectedPlayerId}
          validatedPlayerId={effectiveVote?.selected_player_id ?? null}
          submitting={submitting}
          onSelect={setSelectedPlayerId}
          onSubmit={submitVote}
        />
      )}

      {room.status === "reveal_results" && currentQ && gameType === "who_would" && (
        <WhoWouldReveal
          question={currentQ as WhoWouldQuestion}
          players={players}
          votes={currentVotes}
          revealStartedAt={room.reveal_started_at}
          revealDurationSec={revealDuration}
          autoplay={room.autoplay}
        />
      )}

      {room.status === "reveal_results" && currentQ && gameType === "who_of_us" && (
        <WhoOfUsReveal
          question={currentQ as WhoOfUsGameQuestion}
          players={players}
          votes={currentVotes}
          revealStartedAt={room.reveal_started_at}
          revealDurationSec={revealDuration}
          autoplay={room.autoplay}
        />
      )}
    </main>
  );
}

function PlayerHeader({
  code,
  me,
  totalPlayers,
  gameLabel,
}: {
  code: string;
  me: Player;
  totalPlayers: number;
  gameLabel: string | undefined;
}) {
  return (
    <header className="card mb-4 flex items-center justify-between p-4">
      <div>
        <div className="text-xs uppercase tracking-wider text-white/50">Salle</div>
        <div className="text-xl font-black tracking-widest">{code}</div>
        {gameLabel && <div className="mt-1 text-xs text-neon-cyan">{gameLabel}</div>}
      </div>
      <div className="text-right">
        <div className="text-xs uppercase tracking-wider text-white/50">Toi</div>
        <div className="text-lg font-bold">{me.name}</div>
        <div className="text-xs text-white/50">{totalPlayers} joueurs</div>
      </div>
    </header>
  );
}

function Lobby({ players, gameLabel }: { players: Player[]; gameLabel: string | undefined }) {
  return (
    <section className="card flex flex-1 flex-col items-center justify-center p-8 text-center">
      <div className="animate-floaty text-6xl">🎉</div>
      <h2 className="mt-4 text-2xl font-bold">
        {gameLabel ? "En attente de la question" : "Choix du jeu en cours"}
      </h2>
      <p className="mt-2 text-white/60">
        {gameLabel ? `${gameLabel} va commencer.` : "L'hôte prépare la partie."}
      </p>
      <div className="mt-6 w-full">
        <div className="text-xs uppercase tracking-wider text-white/50">Joueurs</div>
        <ul className="mt-2 flex flex-wrap justify-center gap-2">
          {players.map((p) => (
            <li key={p.id} className="chip">
              {p.is_host ? "👑 " : ""}{p.name}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function VoteShell({
  category,
  startedAt,
  durationSec,
  children,
}: {
  category: ReturnType<typeof getCategoryForGame>;
  startedAt: string | null;
  durationSec: number;
  children: ReactNode;
}) {
  const left = useCountdown(startedAt, durationSec);

  return (
    <section className="flex flex-1 flex-col">
      <div className="card mb-3 flex items-center justify-between p-3 px-4">
        {category && <span className="chip">{category.emoji} {category.label}</span>}
        <div>
          <span className="text-3xl font-black tabular-nums">{left}</span>
          <span className="ml-2 text-white/60">sec</span>
        </div>
      </div>
      {children}
    </section>
  );
}

function WhoWouldVoteScreen({
  question,
  startedAt,
  durationSec,
  selectedChoice,
  validatedChoice,
  submitting,
  onSelect,
  onSubmit,
}: {
  question: WhoWouldQuestion;
  startedAt: string | null;
  durationSec: number;
  selectedChoice: Choice | null;
  validatedChoice: Choice | null;
  submitting: boolean;
  onSelect: (c: Choice) => void;
  onSubmit: () => void;
}) {
  const left = useCountdown(startedAt, durationSec);
  const locked = Boolean(validatedChoice) || submitting || left === 0;
  const category = getCategoryForGame("who_would", question.category);

  return (
    <VoteShell category={category} startedAt={startedAt} durationSec={durationSec}>
      <div className="grid flex-1 gap-3">
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
      <SubmitButton
        canSubmit={Boolean(selectedChoice) && !locked}
        validated={Boolean(validatedChoice)}
        submitting={submitting}
        onSubmit={onSubmit}
      />
    </VoteShell>
  );
}

function WhoOfUsVoteScreen({
  question,
  startedAt,
  durationSec,
  players,
  selectedPlayerId,
  validatedPlayerId,
  submitting,
  onSelect,
  onSubmit,
}: {
  question: WhoOfUsGameQuestion;
  startedAt: string | null;
  durationSec: number;
  players: Player[];
  selectedPlayerId: string | null;
  validatedPlayerId: string | null;
  submitting: boolean;
  onSelect: (playerId: string) => void;
  onSubmit: () => void;
}) {
  const left = useCountdown(startedAt, durationSec);
  const locked = Boolean(validatedPlayerId) || submitting || left === 0;
  const category = getCategoryForGame("who_of_us", question.category);
  const activePlayerId = validatedPlayerId ?? selectedPlayerId;

  return (
    <VoteShell category={category} startedAt={startedAt} durationSec={durationSec}>
      <div className="card mb-3 p-4">
        <div className="text-xs font-bold uppercase tracking-wider text-white/50">Question</div>
        <h2 className="mt-2 text-2xl font-black leading-tight">{question.text}</h2>
      </div>
      <div className="grid flex-1 gap-2">
        {players.map((player) => (
          <PlayerTargetButton
            key={player.id}
            player={player}
            selected={activePlayerId === player.id}
            disabled={locked}
            onClick={() => onSelect(player.id)}
          />
        ))}
      </div>
      <SubmitButton
        canSubmit={Boolean(selectedPlayerId) && !locked}
        validated={Boolean(validatedPlayerId)}
        submitting={submitting}
        onSubmit={onSubmit}
      />
    </VoteShell>
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
      onClick={onClick}
      className={`flex w-full flex-col items-center justify-center rounded-3xl border-2 p-6 text-center transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 ${base} ${selected ? selectedClass : ""}`}
    >
      <span className={`text-sm font-bold uppercase tracking-widest ${labelColor}`}>
        Option {label}
      </span>
      <span className="mt-3 text-2xl font-bold leading-tight">{text}</span>
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
      onClick={onClick}
      className={`flex items-center justify-between rounded-2xl border p-4 text-left transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 ${
        selected
          ? "border-neon-cyan bg-neon-cyan/10 shadow-glow-cyan"
          : "border-white/10 bg-white/5 hover:border-neon-cyan/50"
      }`}
    >
      <span className="text-xl font-black">{player.name}</span>
      {selected && <span className="text-sm font-bold text-neon-cyan">Sélectionné</span>}
    </button>
  );
}

function SubmitButton({
  canSubmit,
  validated,
  submitting,
  onSubmit,
}: {
  canSubmit: boolean;
  validated: boolean;
  submitting: boolean;
  onSubmit: () => void;
}) {
  return (
    <>
      <button
        type="button"
        disabled={!canSubmit}
        onClick={onSubmit}
        className="btn-primary mt-4 w-full disabled:shadow-none"
      >
        {submitting ? "Envoi..." : validated ? "Vote envoyé" : "Valider mon choix"}
      </button>
      {validated && (
        <p className="mt-3 text-center text-sm font-semibold text-neon-green">Vote envoyé</p>
      )}
    </>
  );
}

function WhoWouldReveal({
  question,
  players,
  votes,
  revealStartedAt,
  revealDurationSec,
  autoplay,
}: {
  question: WhoWouldQuestion;
  players: Player[];
  votes: Vote[];
  revealStartedAt: string | null;
  revealDurationSec: number;
  autoplay: boolean;
}) {
  const revealLeft = useCountdown(autoplay ? revealStartedAt : null, revealDurationSec);
  const category = getCategoryForGame("who_would", question.category);
  const stats = getWhoWouldStats(players, votes);
  const namesFor = (choice: Choice) =>
    votes
      .filter((vote) => vote.selected_option === choice)
      .map((vote) => players.find((player) => player.id === vote.voter_player_id)?.name)
      .filter((name): name is string => Boolean(name));

  return (
    <RevealShell category={category} totalVotes={stats.total} revealLeft={revealLeft} autoplay={autoplay}>
      <div className="grid flex-1 gap-3">
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

function WhoOfUsReveal({
  question,
  players,
  votes,
  revealStartedAt,
  revealDurationSec,
  autoplay,
}: {
  question: WhoOfUsGameQuestion;
  players: Player[];
  votes: Vote[];
  revealStartedAt: string | null;
  revealDurationSec: number;
  autoplay: boolean;
}) {
  const revealLeft = useCountdown(autoplay ? revealStartedAt : null, revealDurationSec);
  const category = getCategoryForGame("who_of_us", question.category);
  const stats = getWhoOfUsStats(players, votes);

  return (
    <RevealShell category={category} totalVotes={stats.total} revealLeft={revealLeft} autoplay={autoplay}>
      <div className="card mb-3 p-4">
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

function RevealShell({
  category,
  totalVotes,
  revealLeft,
  autoplay,
  children,
}: {
  category: ReturnType<typeof getCategoryForGame>;
  totalVotes: number;
  revealLeft: number;
  autoplay: boolean;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-1 flex-col">
      <div className="card mb-3 flex items-center justify-between p-3 px-4">
        {category && <span className="chip">{category.emoji} {category.label}</span>}
        <span className="text-xs uppercase tracking-wider text-white/50">Résultats</span>
      </div>
      {children}
      <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
        <div className="text-xs uppercase tracking-wider text-white/50">
          {totalVotes} vote{totalVotes > 1 ? "s" : ""} validé{totalVotes > 1 ? "s" : ""}
        </div>
        {autoplay && <div className="mt-1 text-3xl font-black tabular-nums">{revealLeft}s</div>}
      </div>
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

  return (
    <div className="flex flex-col rounded-3xl border border-white/10 bg-white/5 p-4">
      <div className={`text-sm font-bold uppercase tracking-widest ${labelColor}`}>{label}</div>
      <div className="mt-2 text-lg font-semibold text-white/90">{text}</div>
      <div className="mt-4 flex items-end justify-between gap-3">
        <div className="text-4xl font-black tabular-nums">{percent}%</div>
        <div className="pb-1 text-sm text-white/60">
          {count} vote{count > 1 ? "s" : ""}
        </div>
      </div>
      <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/10">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${percent}%` }} />
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
    <div className={`rounded-2xl border p-4 ${isTop ? "border-neon-yellow/60 bg-neon-yellow/10" : "border-white/10 bg-white/5"}`}>
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

function CenteredMessage({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: { label: string; href: string };
}) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 text-center">
      <h1 className="text-3xl font-black">{title}</h1>
      {subtitle && <p className="mt-2 text-white/60">{subtitle}</p>}
      {action && (
        <a href={action.href} className="btn-primary mt-6">
          {action.label}
        </a>
      )}
    </main>
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

function voteToLocalVote(vote: Vote | undefined): LocalVote | null {
  if (!vote) return null;
  return {
    qid: vote.question_id,
    selected_option: vote.selected_option,
    selected_player_id: vote.selected_player_id,
  };
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
    const voterName = playerById.get(vote.voter_player_id)?.name ?? "Joueur parti";
    const row = ranking.get(vote.selected_player_id) ?? {
      targetId: vote.selected_player_id,
      targetName: target?.name ?? "Joueur parti",
      count: 0,
      voters: [],
    };
    row.count += 1;
    row.voters.push(voterName);
    ranking.set(vote.selected_player_id, row);
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
