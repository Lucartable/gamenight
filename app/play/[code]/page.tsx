"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import { useRoom } from "@/lib/useRoom";
import { useCountdown } from "@/lib/useCountdown";
import { Category, getCategory, getQuestion } from "@/lib/questions";
import {
  DEBATE_DURATION_SEC,
  VOTE_DURATION_SEC,
  getOrCreateClientId,
} from "@/lib/utils";
import type { Choice, Player, Vote } from "@/types/database";

export default function PlayerPage() {
  const params = useParams<{ code: string }>();
  const code = params.code?.toUpperCase() ?? "";
  const router = useRouter();
  const { room, players, votes, loading, error, refresh } = useRoom(code);
  const [submitting, setSubmitting] = useState<Choice | null>(null);
  const [voteError, setVoteError] = useState<string | null>(null);
  // Vote optimiste : si la realtime ne propage pas tout de suite,
  // on affiche quand même le retour visuel.
  const [optimisticVote, setOptimisticVote] = useState<{ qid: number; choice: Choice } | null>(null);

  const me = useMemo<Player | undefined>(() => {
    if (!players.length) return undefined;
    const id = getOrCreateClientId();
    return players.find((p) => p.client_id === id);
  }, [players]);

  // Auto-redirect : si l'hôte t'a transmis le rôle, basculer en /host.
  useEffect(() => {
    if (!room) return;
    const id = getOrCreateClientId();
    if (id === room.host_client_id) router.replace(`/host/${code}`);
  }, [room?.host_client_id, code, room, router]);

  const currentQ = getQuestion(room?.current_question_id);

  // Reset des états transitoires quand on change de question.
  useEffect(() => {
    if (!currentQ || (optimisticVote && optimisticVote.qid !== currentQ.id)) {
      setOptimisticVote(null);
    }
    setSubmitting(null);
  }, [currentQ?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Filet de sécurité : si pour une raison quelconque `submitting` reste bloqué,
  // on le libère après 5s pour que les boutons ne soient jamais figés.
  useEffect(() => {
    if (!submitting) return;
    const t = setTimeout(() => setSubmitting(null), 5000);
    return () => clearTimeout(t);
  }, [submitting]);

  const myVote = useMemo<Vote | undefined>(() => {
    if (!me || !currentQ) return undefined;
    return votes.find((v) => v.player_id === me.id && v.question_id === currentQ.id);
  }, [me, votes, currentQ]);

  const effectiveVote: Choice | null =
    myVote?.choice ??
    (optimisticVote && currentQ && optimisticVote.qid === currentQ.id
      ? optimisticVote.choice
      : null);

  async function vote(choice: Choice) {
    console.log("[GameNight] vote()", choice, {
      hasRoom: !!room,
      hasCurrentQ: !!currentQ,
      hasMe: !!me,
      submitting,
      playersCount: players.length,
    });
    setVoteError(null);
    if (!room) { setVoteError("Salle non chargée. Rafraîchis la page."); return; }
    if (!currentQ) { setVoteError("Aucune question active."); return; }
    if (!me) {
      setVoteError(
        `Tu n'es pas dans la liste des joueurs (${players.length} chargé${players.length > 1 ? "s" : ""}). Reviens à l'accueil pour rejoindre à nouveau.`
      );
      return;
    }
    // Note : on n'early-return PAS sur `submitting`. L'upsert est idempotent
    // (replace même row) — on laisse l'utilisateur re-cliquer librement.

    // Optimiste : feedback visuel immédiat, rollback si échec.
    setSubmitting(choice);
    setOptimisticVote({ qid: currentQ.id, choice });

    try {
      const { error } = await getSupabase().from("votes").upsert(
        {
          room_id: room.id,
          player_id: me.id,
          question_id: currentQ.id,
          choice,
        },
        { onConflict: "room_id,player_id,question_id" }
      );
      if (error) throw error;
      await refresh();
    } catch (err) {
      console.error("[GameNight] vote failed:", err);
      setVoteError(err instanceof Error ? err.message : "Erreur d'enregistrement du vote.");
      setOptimisticVote(null);
    } finally {
      setSubmitting(null);
    }
  }

  if (loading) return <CenteredMessage title="Chargement..." />;
  if (error || !room)
    return <CenteredMessage title="Salle introuvable" subtitle={error ?? undefined} action={{ label: "Retour", href: "/" }} />;
  if (!me)
    return <CenteredMessage title="Tu n'as pas encore rejoint cette salle" action={{ label: "Rejoindre", href: "/" }} />;
  if (room.status === "ended")
    return <CenteredMessage title="Partie terminée" subtitle="Merci d'avoir joué !" action={{ label: "Retour", href: "/" }} />;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 py-6">
      <PlayerHeader code={room.code} me={me} totalPlayers={players.length} />

      {voteError && (
        <div className="card mb-3 border-neon-pink/60 bg-neon-pink/10 p-3 text-center text-neon-pink">
          {voteError}
        </div>
      )}

      {room.status === "lobby" && <Lobby players={players} />}

      {room.status === "voting" && currentQ && (
        <VoteScreen
          question={currentQ}
          startedAt={room.question_started_at}
          onVote={vote}
          myVote={effectiveVote}
          submitting={submitting}
        />
      )}

      {(room.status === "reveal" || room.status === "debate") && currentQ && (
        <Reveal
          question={currentQ}
          players={players}
          votes={votes.filter((v) => v.question_id === currentQ.id)}
          isDebate={room.status === "debate"}
          debateStartedAt={room.debate_started_at}
        />
      )}
    </main>
  );
}

// ---------- Sous-vues ------------------------------------------------------

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
  onVote,
  myVote,
  submitting,
}: {
  question: { id: number; optionA: string; optionB: string; category: Category };
  startedAt: string | null;
  onVote: (c: Choice) => void;
  myVote: Choice | null;
  submitting: Choice | null;
}) {
  const left = useCountdown(startedAt, VOTE_DURATION_SEC);
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
          selected={myVote === "A"}
          loading={submitting === "A"}
          onClick={() => onVote("A")}
        />
        <ChoiceButton
          accent="cyan"
          label="B"
          text={question.optionB}
          selected={myVote === "B"}
          loading={submitting === "B"}
          onClick={() => onVote("B")}
        />
      </div>

      {myVote && (
        <p className="mt-4 text-center text-white/70">
          Vote enregistré ✓ — tu peux changer tant que le timer tourne.
        </p>
      )}
    </section>
  );
}

function ChoiceButton({
  accent,
  label,
  text,
  selected,
  loading,
  onClick,
}: {
  accent: "pink" | "cyan";
  label: string;
  text: string;
  selected: boolean;
  loading: boolean;
  onClick: () => void;
}) {
  const base = accent === "pink" ? "border-neon-pink/40 bg-neon-pink/10" : "border-neon-cyan/40 bg-neon-cyan/10";
  const sel  = accent === "pink" ? "ring-4 ring-neon-pink shadow-glow-pink" : "ring-4 ring-neon-cyan shadow-glow-cyan";
  const labelColor = accent === "pink" ? "text-neon-pink" : "text-neon-cyan";

  return (
    <button
      type="button"
      onClick={() => {
        console.log("[GameNight] ChoiceButton click", label);
        try { onClick(); } catch (e) { console.error("[GameNight] click handler threw", e); }
      }}
      style={{ touchAction: "manipulation" }}
      className={`flex w-full cursor-pointer flex-col items-center justify-center rounded-3xl border-2 p-6 text-center transition active:scale-[0.98] ${base} ${selected ? sel : ""}`}
    >
      <span className={`pointer-events-none text-sm font-bold uppercase tracking-widest ${labelColor}`}>
        Option {label}
      </span>
      <span className="pointer-events-none mt-3 text-2xl font-bold leading-tight">{text}</span>
      {loading && <span className="pointer-events-none mt-3 text-sm text-white/60">Envoi...</span>}
    </button>
  );
}

function Reveal({
  question,
  players,
  votes,
  isDebate,
  debateStartedAt,
}: {
  question: { id: number; optionA: string; optionB: string; category: Category };
  players: Player[];
  votes: Vote[];
  isDebate: boolean;
  debateStartedAt: string | null;
}) {
  const debateLeft = useCountdown(isDebate ? debateStartedAt : null, DEBATE_DURATION_SEC);
  const cat = getCategory(question.category);
  const namesFor = (c: Choice) =>
    votes
      .filter((v) => v.choice === c)
      .map((v) => players.find((p) => p.id === v.player_id)?.name ?? "?");

  const a = namesFor("A");
  const b = namesFor("B");

  return (
    <section className="flex flex-1 flex-col">
      <div className="card mb-3 flex items-center justify-between p-3 px-4">
        <span className="chip">{cat?.emoji} {cat?.label}</span>
        <span className="text-xs uppercase tracking-wider text-white/50">Résultats</span>
      </div>

      <div className="grid flex-1 gap-3">
        <RevealCard accent="pink" label="A" text={question.optionA} names={a} />
        <RevealCard accent="cyan" label="B" text={question.optionB} names={b} />
      </div>

      {isDebate && (
        <div className="mt-4 rounded-2xl border border-neon-yellow/50 bg-neon-yellow/10 p-4 text-center">
          <div className="text-xs uppercase text-neon-yellow">Débat en cours</div>
          <div className="mt-1 text-3xl font-black tabular-nums">{formatMMSS(debateLeft)}</div>
        </div>
      )}
    </section>
  );
}

function RevealCard({
  accent,
  label,
  text,
  names,
}: {
  accent: "pink" | "cyan";
  label: string;
  text: string;
  names: string[];
}) {
  const border = accent === "pink" ? "border-neon-pink/40" : "border-neon-cyan/40";
  const bg = accent === "pink" ? "bg-neon-pink/10" : "bg-neon-cyan/10";
  const labelColor = accent === "pink" ? "text-neon-pink" : "text-neon-cyan";
  return (
    <div className={`flex flex-col rounded-3xl border-2 p-4 ${border} ${bg}`}>
      <div className={`text-sm font-bold uppercase tracking-widest ${labelColor}`}>
        Option {label}
      </div>
      <div className="mt-1 text-xl font-bold">{text}</div>
      <div className="mt-2 text-sm text-white/60">{names.length} vote{names.length > 1 ? "s" : ""}</div>
      {names.length > 0 ? (
        <ul className="mt-2 flex flex-wrap gap-2">
          {names.map((n, i) => (
            <li key={i} className="chip">{n}</li>
          ))}
        </ul>
      ) : (
        <div className="mt-2 text-white/40">Personne</div>
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

function formatMMSS(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
