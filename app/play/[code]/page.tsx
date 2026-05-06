"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import { useRoom } from "@/lib/useRoom";
import { useCountdown } from "@/lib/useCountdown";
import { Category, getCategory, getQuestion } from "@/lib/questions";
import {
  DEFAULT_REVEAL_DURATION_SEC,
  DEFAULT_VOTE_DURATION_SEC,
  getOrCreateClientId,
} from "@/lib/utils";
import type { Choice, Player, Vote } from "@/types/database";

export default function PlayerPage() {
  const params = useParams<{ code: string }>();
  const code = params.code?.toUpperCase() ?? "";
  const router = useRouter();
  const { room, players, votes, loading, error, refresh } = useRoom(code);
  const [selectedChoice, setSelectedChoice] = useState<Choice | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [voteError, setVoteError] = useState<string | null>(null);
  const [optimisticVote, setOptimisticVote] = useState<{ qid: number; choice: Choice } | null>(null);

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

  const currentQ = getQuestion(room?.current_question_id);

  useEffect(() => {
    setSelectedChoice(null);
    setSubmitting(false);
    setOptimisticVote(null);
  }, [currentQ?.id]);

  const myVote = useMemo<Vote | undefined>(() => {
    if (!me || !currentQ) return undefined;
    return votes.find((v) => v.player_id === me.id && v.question_id === currentQ.id);
  }, [me, votes, currentQ]);

  const effectiveVote: Choice | null =
    optimisticVote && currentQ && optimisticVote.qid === currentQ.id
      ? optimisticVote.choice
      : myVote?.choice ?? null;

  async function submitVote() {
    setVoteError(null);
    if (!room) { setVoteError("Salle non chargée. Rafraîchis la page."); return; }
    if (!currentQ) { setVoteError("Aucune question active."); return; }
    if (!me) {
      setVoteError(
        `Tu n'es pas dans la liste des joueurs (${players.length} chargé${players.length > 1 ? "s" : ""}). Reviens à l'accueil pour rejoindre à nouveau.`
      );
      return;
    }
    if (!selectedChoice || effectiveVote || submitting) return;

    setSubmitting(true);
    setOptimisticVote({ qid: currentQ.id, choice: selectedChoice });

    try {
      const { error } = await getSupabase().from("votes").upsert(
        {
          room_id: room.id,
          player_id: me.id,
          question_id: currentQ.id,
          choice: selectedChoice,
        },
        { onConflict: "room_id,player_id,question_id" }
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

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 py-6">
      <PlayerHeader code={room.code} me={me} totalPlayers={players.length} />

      {voteError && (
        <div className="card mb-3 border-neon-pink/60 bg-neon-pink/10 p-3 text-center text-neon-pink">
          {voteError}
        </div>
      )}

      {room.status === "lobby" && <Lobby players={players} />}

      {room.status === "question_active" && currentQ && (
        <VoteScreen
          question={currentQ}
          startedAt={room.question_started_at}
          durationSec={voteDuration}
          selectedChoice={selectedChoice}
          validatedChoice={effectiveVote}
          submitting={submitting}
          onSelect={setSelectedChoice}
          onSubmit={submitVote}
        />
      )}

      {room.status === "reveal_results" && currentQ && (
        <Reveal
          question={currentQ}
          players={players}
          votes={votes.filter((v) => v.question_id === currentQ.id)}
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
}: {
  code: string;
  me: Player;
  totalPlayers: number;
}) {
  return (
    <header className="card mb-4 flex items-center justify-between p-4">
      <div>
        <div className="text-xs uppercase tracking-wider text-white/50">Salle</div>
        <div className="text-xl font-black tracking-widest">{code}</div>
      </div>
      <div className="text-right">
        <div className="text-xs uppercase tracking-wider text-white/50">Toi</div>
        <div className="text-lg font-bold">{me.name}</div>
        <div className="text-xs text-white/50">{totalPlayers} joueurs</div>
      </div>
    </header>
  );
}

function Lobby({ players }: { players: Player[] }) {
  return (
    <section className="card flex flex-1 flex-col items-center justify-center p-8 text-center">
      <div className="animate-floaty text-6xl">🎉</div>
      <h2 className="mt-4 text-2xl font-bold">En attente de l'hôte</h2>
      <p className="mt-2 text-white/60">La question va arriver d'un moment à l'autre.</p>
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

function VoteScreen({
  question,
  startedAt,
  durationSec,
  selectedChoice,
  validatedChoice,
  submitting,
  onSelect,
  onSubmit,
}: {
  question: { id: number; optionA: string; optionB: string; category: Category };
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
  const cat = getCategory(question.category);

  return (
    <section className="flex flex-1 flex-col">
      <div className="card mb-3 flex items-center justify-between p-3 px-4">
        <span className="chip">{cat?.emoji} {cat?.label}</span>
        <div>
          <span className="text-3xl font-black tabular-nums">{left}</span>
          <span className="ml-2 text-white/60">sec</span>
        </div>
      </div>

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

      <button
        type="button"
        disabled={!selectedChoice || locked}
        onClick={onSubmit}
        className="btn-primary mt-4 w-full disabled:shadow-none"
      >
        {submitting ? "Envoi..." : validatedChoice ? "Vote envoyé" : "Valider mon choix"}
      </button>

      {validatedChoice && (
        <p className="mt-3 text-center text-sm font-semibold text-neon-green">Vote envoyé</p>
      )}
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

function Reveal({
  question,
  players,
  votes,
  revealStartedAt,
  revealDurationSec,
  autoplay,
}: {
  question: { id: number; optionA: string; optionB: string; category: Category };
  players: Player[];
  votes: Vote[];
  revealStartedAt: string | null;
  revealDurationSec: number;
  autoplay: boolean;
}) {
  const revealLeft = useCountdown(autoplay ? revealStartedAt : null, revealDurationSec);
  const cat = getCategory(question.category);
  const stats = getVoteStats(players, votes);
  const namesFor = (choice: Choice) =>
    votes
      .filter((v) => v.choice === choice)
      .map((v) => players.find((p) => p.id === v.player_id)?.name)
      .filter((name): name is string => Boolean(name));

  return (
    <section className="flex flex-1 flex-col">
      <div className="card mb-3 flex items-center justify-between p-3 px-4">
        <span className="chip">{cat?.emoji} {cat?.label}</span>
        <span className="text-xs uppercase tracking-wider text-white/50">Résultats</span>
      </div>

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

      <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
        <div className="text-xs uppercase tracking-wider text-white/50">
          {stats.total} vote{stats.total > 1 ? "s" : ""} validé{stats.total > 1 ? "s" : ""}
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

interface VoteStats {
  total: number;
  aCount: number;
  bCount: number;
  aPercent: number;
  bPercent: number;
}

function getVoteStats(players: Player[], votes: Vote[]): VoteStats {
  const playerIds = new Set(players.map((p) => p.id));
  const validVotes = votes.filter((vote) => playerIds.has(vote.player_id));
  const total = validVotes.length;
  const aCount = validVotes.filter((vote) => vote.choice === "A").length;
  const bCount = validVotes.filter((vote) => vote.choice === "B").length;
  return {
    total,
    aCount,
    bCount,
    aPercent: total === 0 ? 0 : Math.round((aCount / total) * 100),
    bPercent: total === 0 ? 0 : Math.round((bCount / total) * 100),
  };
}
