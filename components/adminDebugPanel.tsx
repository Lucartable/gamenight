"use client";

import type { QuestionPoolDiagnostics } from "@/lib/questionPoolTypes";
import type { Player, Rating, Room, Vote } from "@/types/database";

interface DebugQuestion {
  id: number;
  category?: string | null;
}

export function AdminDebugPanel({
  enabled,
  room,
  players,
  votes,
  ratings,
  currentQuestion,
  availableCount,
  diagnostics,
}: {
  enabled: boolean;
  room: Room;
  players: Player[];
  votes: Vote[];
  ratings: Rating[];
  currentQuestion: DebugQuestion | null | undefined;
  availableCount: number;
  diagnostics: QuestionPoolDiagnostics | null;
}) {
  if (!enabled) return null;

  const currentQuestionId = currentQuestion?.id ?? room.current_question_id;
  const currentVotes = currentQuestionId
    ? votes.filter((vote) => vote.game_type === room.game_type && vote.question_id === currentQuestionId)
    : [];
  const currentRatings = currentQuestionId
    ? ratings.filter((rating) => rating.question_id === currentQuestionId)
    : [];

  return (
    <details className="card mb-3 border-neon-cyan/30 bg-neon-cyan/5 p-4 text-sm">
      <summary className="cursor-pointer select-none text-xs font-black uppercase tracking-wider text-neon-cyan">
        Debug admin
      </summary>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <DebugMetric label="Room" value={room.code} detail={room.status} />
        <DebugMetric label="Jeu" value={room.game_type ?? "non choisi"} detail={`${players.length} joueur(s)`} />
        <DebugMetric label="Question" value={currentQuestionId?.toString() ?? "aucune"} detail={currentQuestion?.category ?? "sans categorie"} />
        <DebugMetric label="Pool restant" value={String(availableCount)} detail={diagnostics?.issue ?? "configuration OK"} />
        <DebugMetric label="Votes manche" value={String(currentVotes.length)} detail={`${votes.length} vote(s) total`} />
        <DebugMetric label="Notes manche" value={String(currentRatings.length)} detail={`${ratings.length} note(s) total`} />
      </div>

      {diagnostics && (
        <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-3">
          <div className="mb-2 text-xs font-black uppercase tracking-wider text-white/45">QuestionPoolEngine</div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs font-bold text-white/70">
            <DebugCount label="Systeme" value={`${diagnostics.sources.systemValid}/${diagnostics.sources.systemRaw}`} />
            <DebugCount label="Live" value={`${diagnostics.sources.liveValid}/${diagnostics.sources.liveRaw}`} />
            <DebugCount label="Saved" value={`${diagnostics.sources.savedValid}/${diagnostics.sources.savedRaw}`} />
            <DebugCount label="Rejets" value={String(diagnostics.sources.rejected)} />
            <DebugCount label="Final" value={String(diagnostics.sources.final)} />
            <DebugCount label="Mode" value={diagnostics.mode} />
          </div>
        </div>
      )}
    </details>
  );
}

function DebugMetric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
      <div className="text-[10px] font-black uppercase tracking-wider text-white/40">{label}</div>
      <div className="mt-1 truncate text-lg font-black text-white">{value}</div>
      <div className="mt-1 truncate text-xs font-semibold text-white/50">{detail}</div>
    </div>
  );
}

function DebugCount({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/5 p-2">
      <div className="truncate text-[10px] uppercase tracking-wider text-white/40">{label}</div>
      <div className="mt-1 truncate text-white">{value}</div>
    </div>
  );
}
