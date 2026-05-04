"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import { useRoom } from "@/lib/useRoom";
import { useCountdown } from "@/lib/useCountdown";
import { getQuestion, QUESTIONS } from "@/lib/questions";
import { getOrCreateClientId, DEBATE_DURATION_SEC, VOTE_DURATION_SEC } from "@/lib/utils";
import type { Player, Vote } from "@/types/database";

export default function HostPage() {
  const params = useParams<{ code: string }>();
  const code = params.code?.toUpperCase() ?? "";
  const router = useRouter();
  const { room, players, votes, loading, error } = useRoom(code);
  const [askedIds, setAskedIds] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [unauthorized, setUnauthorized] = useState(false);

  // Vérifie qu'on est bien l'hôte de cette salle.
  useEffect(() => {
    if (!room) return;
    const me = getOrCreateClientId();
    if (me !== room.host_client_id) setUnauthorized(true);
  }, [room]);

  // Charge la liste des questions déjà posées dans cette salle.
  useEffect(() => {
    if (!room) return;
    const supabase = getSupabase();
    supabase
      .from("asked_questions")
      .select("question_id")
      .eq("room_id", room.id)
      .then(({ data }) => {
        if (data) setAskedIds(data.map((d) => d.question_id as number));
      });
  }, [room, room?.current_question_id]);

  const remainingQuestions = useMemo(
    () => QUESTIONS.filter((q) => !askedIds.includes(q.id)),
    [askedIds]
  );

  const currentQ = getQuestion(room?.current_question_id);

  // Bascule auto vers la révélation quand le timer atteint 0.
  const voteLeft = useCountdown(
    room?.status === "voting" ? room?.question_started_at ?? null : null,
    VOTE_DURATION_SEC
  );
  useEffect(() => {
    if (room?.status === "voting" && voteLeft === 0 && !busy) {
      void revealNow();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voteLeft, room?.status]);

  async function askQuestion(questionId: number) {
    if (!room || busy) return;
    setBusy(true);
    const supabase = getSupabase();
    await supabase.from("asked_questions").upsert(
      { room_id: room.id, question_id: questionId },
      { onConflict: "room_id,question_id" }
    );
    await supabase
      .from("rooms")
      .update({
        status: "voting",
        current_question_id: questionId,
        question_started_at: new Date().toISOString(),
        debate_started_at: null,
        debate_mode: false,
      })
      .eq("id", room.id);
    setBusy(false);
  }

  async function revealNow() {
    if (!room) return;
    setBusy(true);
    await getSupabase().from("rooms").update({ status: "reveal" }).eq("id", room.id);
    setBusy(false);
  }

  async function startDebate() {
    if (!room) return;
    setBusy(true);
    await getSupabase()
      .from("rooms")
      .update({
        status: "debate",
        debate_mode: true,
        debate_started_at: new Date().toISOString(),
      })
      .eq("id", room.id);
    setBusy(false);
  }

  async function nextStep() {
    if (!room) return;
    setBusy(true);
    await getSupabase()
      .from("rooms")
      .update({
        status: "lobby",
        current_question_id: null,
        question_started_at: null,
        debate_started_at: null,
        debate_mode: false,
      })
      .eq("id", room.id);
    setBusy(false);
  }

  async function endGame() {
    if (!room) return;
    if (!confirm("Terminer la partie pour tout le monde ?")) return;
    await getSupabase().from("rooms").update({ status: "ended" }).eq("id", room.id);
    router.push("/");
  }

  if (loading) return <CenteredMessage title="Chargement..." />;
  if (error || !room) return <CenteredMessage title="Salle introuvable" subtitle={error ?? undefined} />;
  if (unauthorized)
    return (
      <CenteredMessage
        title="Tu n'es pas l'hôte"
        subtitle="Cette salle a été créée depuis un autre appareil."
        action={{ label: "Rejoindre comme joueur", href: `/play/${code}` }}
      />
    );
  if (room.status === "ended") return <CenteredMessage title="Partie terminée" action={{ label: "Retour", href: "/" }} />;

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col px-5 py-6">
      <RoomHeader code={room.code} status={room.status} players={players} onEnd={endGame} />

      {room.status === "lobby" && (
        <LobbyView
          players={players}
          remaining={remainingQuestions}
          onPick={askQuestion}
          busy={busy}
        />
      )}

      {room.status === "voting" && currentQ && (
        <VotingView
          question={currentQ}
          voteLeft={voteLeft}
          votedCount={votes.filter((v) => v.question_id === currentQ.id).length}
          totalPlayers={players.length}
          onRevealNow={revealNow}
          busy={busy}
        />
      )}

      {(room.status === "reveal" || room.status === "debate") && currentQ && (
        <RevealView
          question={currentQ}
          players={players}
          votes={votes.filter((v) => v.question_id === currentQ.id)}
          isDebate={room.status === "debate"}
          debateStartedAt={room.debate_started_at}
          onNext={nextStep}
          onDebate={startDebate}
          busy={busy}
        />
      )}
    </main>
  );
}

// ---------- Sous-vues ------------------------------------------------------

function RoomHeader({
  code,
  status,
  players,
  onEnd,
}: {
  code: string;
  status: string;
  players: Player[];
  onEnd: () => void;
}) {
  return (
    <header className="card mb-5 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wider text-white/50">Code de la salle</div>
          <div className="select-all bg-gradient-to-r from-neon-pink to-neon-cyan bg-clip-text text-4xl font-black tracking-widest text-transparent">
            {code}
          </div>
          <div className="mt-1 text-sm text-white/60">
            {players.length} joueur{players.length > 1 ? "s" : ""} · {labelStatus(status)}
          </div>
        </div>
        <button onClick={onEnd} className="btn-ghost text-neon-pink">Terminer</button>
      </div>
    </header>
  );
}

function LobbyView({
  players,
  remaining,
  onPick,
  busy,
}: {
  players: Player[];
  remaining: { id: number; optionA: string; optionB: string }[];
  onPick: (id: number) => void;
  busy: boolean;
}) {
  return (
    <>
      <section className="card mb-5 p-5">
        <h2 className="mb-3 text-lg font-bold">Joueurs connectés</h2>
        {players.length === 0 ? (
          <p className="text-white/60">En attente des joueurs...</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {players.map((p) => (
              <li key={p.id} className="chip">
                {p.is_host ? "👑 " : ""}{p.name}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-sm text-white/50">
          Partage le code <b className="text-white">en haut</b> pour qu'ils rejoignent.
        </p>
      </section>

      <section className="card p-5">
        <h2 className="mb-3 text-lg font-bold">Choisis une question</h2>
        {remaining.length === 0 ? (
          <p className="text-white/60">Toutes les questions ont été posées 🎉</p>
        ) : (
          <ul className="space-y-3">
            {remaining.map((q) => (
              <li key={q.id}>
                <button
                  disabled={busy || players.length < 2}
                  onClick={() => onPick(q.id)}
                  className="w-full rounded-2xl border border-white/10 bg-bg-soft p-4 text-left transition hover:border-neon-pink/60 hover:bg-bg-soft/80 disabled:opacity-50"
                >
                  <div className="text-sm text-white/50">Question #{q.id}</div>
                  <div className="mt-1 font-semibold">
                    <span className="text-neon-pink">{q.optionA}</span>
                    <span className="text-white/40"> / </span>
                    <span className="text-neon-cyan">{q.optionB}</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
        {players.length < 2 && (
          <p className="mt-3 text-sm text-neon-yellow">
            Il faut au moins 2 joueurs pour lancer une question.
          </p>
        )}
      </section>
    </>
  );
}

function VotingView({
  question,
  voteLeft,
  votedCount,
  totalPlayers,
  onRevealNow,
  busy,
}: {
  question: { id: number; optionA: string; optionB: string };
  voteLeft: number;
  votedCount: number;
  totalPlayers: number;
  onRevealNow: () => void;
  busy: boolean;
}) {
  return (
    <section className="card flex flex-1 flex-col p-5 text-center">
      <div className="text-sm uppercase tracking-wider text-white/50">Vote en cours</div>
      <div className="mt-4 text-7xl font-black tabular-nums text-white">{voteLeft}</div>
      <div className="text-sm text-white/50">secondes</div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-neon-pink/40 bg-neon-pink/10 p-4">
          <div className="text-xs uppercase text-neon-pink">Option A</div>
          <div className="mt-1 text-lg font-bold">{question.optionA}</div>
        </div>
        <div className="rounded-2xl border border-neon-cyan/40 bg-neon-cyan/10 p-4">
          <div className="text-xs uppercase text-neon-cyan">Option B</div>
          <div className="mt-1 text-lg font-bold">{question.optionB}</div>
        </div>
      </div>

      <div className="mt-6 text-white/70">
        {votedCount} / {totalPlayers} joueur{totalPlayers > 1 ? "s ont voté" : " a voté"}
      </div>

      <button onClick={onRevealNow} disabled={busy} className="btn-secondary mt-6">
        Révéler tout de suite
      </button>
    </section>
  );
}

function RevealView({
  question,
  players,
  votes,
  isDebate,
  debateStartedAt,
  onNext,
  onDebate,
  busy,
}: {
  question: { id: number; optionA: string; optionB: string };
  players: Player[];
  votes: Vote[];
  isDebate: boolean;
  debateStartedAt: string | null;
  onNext: () => void;
  onDebate: () => void;
  busy: boolean;
}) {
  const debateLeft = useCountdown(isDebate ? debateStartedAt : null, DEBATE_DURATION_SEC);
  const byChoice = (c: "A" | "B") =>
    votes
      .filter((v) => v.choice === c)
      .map((v) => players.find((p) => p.id === v.player_id)?.name ?? "?")
      .filter(Boolean);
  const a = byChoice("A");
  const b = byChoice("B");
  const noVote = players.filter((p) => !votes.some((v) => v.player_id === p.id));

  return (
    <section className="card flex flex-1 flex-col p-5">
      <div className="mb-4 text-center text-sm uppercase tracking-wider text-white/50">
        Résultats
      </div>

      <div className="grid flex-1 gap-3 sm:grid-cols-2">
        <ColumnReveal
          label="Option A"
          accent="pink"
          text={question.optionA}
          names={a}
        />
        <ColumnReveal
          label="Option B"
          accent="cyan"
          text={question.optionB}
          names={b}
        />
      </div>

      {noVote.length > 0 && (
        <div className="mt-4 text-center text-sm text-white/50">
          N'ont pas voté : {noVote.map((p) => p.name).join(", ")}
        </div>
      )}

      {isDebate ? (
        <div className="mt-6 rounded-2xl border border-neon-yellow/50 bg-neon-yellow/10 p-4 text-center">
          <div className="text-xs uppercase text-neon-yellow">Mode débat</div>
          <div className="mt-1 text-4xl font-black tabular-nums">{formatMMSS(debateLeft)}</div>
          <button onClick={onNext} disabled={busy} className="btn-primary mt-4 w-full">
            Passer à la suite
          </button>
        </div>
      ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button onClick={onDebate} disabled={busy} className="btn-secondary">
            🔥 Débat (2 min)
          </button>
          <button onClick={onNext} disabled={busy} className="btn-primary">
            Question suivante →
          </button>
        </div>
      )}
    </section>
  );
}

function ColumnReveal({
  label,
  accent,
  text,
  names,
}: {
  label: string;
  accent: "pink" | "cyan";
  text: string;
  names: string[];
}) {
  const border = accent === "pink" ? "border-neon-pink/40" : "border-neon-cyan/40";
  const bg = accent === "pink" ? "bg-neon-pink/10" : "bg-neon-cyan/10";
  const labelColor = accent === "pink" ? "text-neon-pink" : "text-neon-cyan";
  return (
    <div className={`rounded-2xl border ${border} ${bg} p-4`}>
      <div className={`text-xs uppercase ${labelColor}`}>{label}</div>
      <div className="mt-1 text-lg font-bold">{text}</div>
      <div className="mt-3 text-sm text-white/60">
        {names.length} vote{names.length > 1 ? "s" : ""}
      </div>
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

function labelStatus(s: string) {
  switch (s) {
    case "lobby": return "Lobby";
    case "voting": return "Vote en cours";
    case "reveal": return "Révélation";
    case "debate": return "Débat";
    case "ended": return "Terminée";
    default: return s;
  }
}

function formatMMSS(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
