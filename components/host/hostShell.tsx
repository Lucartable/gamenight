"use client";

import { AudioToggle } from "@/components/audioToggle";
import { labelStatus } from "@/components/tvHostStage";
import { GAME_DEFINITIONS } from "@/lib/gameQuestions";
import type { GameType } from "@/types/database";

export function GameSelectionView({
  busy,
  onChoose,
}: {
  busy: boolean;
  onChoose: (gameType: GameType) => void;
}) {
  return (
    <section className="game-panel-enter flex flex-1 flex-col justify-center">
      <div className="mb-5 text-center">
        <h1 className="text-3xl font-black">Choisir un jeu</h1>
        <p className="mt-2 text-white/60">Deux ambiances rapides, un seul code de salle.</p>
      </div>
      <div className="grid gap-3">
        {GAME_DEFINITIONS.map((game) => (
          <button
            key={game.id}
            type="button"
            disabled={busy}
            onClick={() => onChoose(game.id)}
            className="card p-5 text-left transition duration-200 hover:-translate-y-0.5 hover:border-neon-cyan/50 hover:bg-bg-soft active:scale-[0.98] disabled:opacity-50"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-2xl font-black">{game.label}</div>
                <div className="mt-2 text-sm text-white/60">{game.description}</div>
              </div>
              <span className="text-2xl text-neon-cyan">→</span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

export function RoomHeader({
  code,
  status,
  gameLabel,
  playersCount,
  round,
  totalQuestions,
  onEnd,
  onToggleTransfer,
  canTransfer,
}: {
  code: string;
  status: string;
  gameLabel: string | undefined;
  playersCount: number;
  round: number;
  totalQuestions: number;
  onEnd: () => void;
  onToggleTransfer: () => void;
  canTransfer: boolean;
}) {
  return (
    <header className="card game-topbar mb-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wider text-white/50">Code de la salle</div>
          <div className="select-all bg-gradient-to-r from-neon-pink to-neon-cyan bg-clip-text text-4xl font-black tracking-widest text-transparent">
            {code}
          </div>
          <div className="mt-1 text-sm text-white/60">
            {playersCount} joueur{playersCount > 1 ? "s" : ""} · {labelStatus(status, gameLabel)}
            {gameLabel && ` · ${gameLabel}`}
            {round > 0 && ` · ${Math.min(round, totalQuestions)} / ${totalQuestions}`}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <AudioToggle compact />
          <div className="flex flex-col items-end gap-1">
            {canTransfer && (
              <button onClick={onToggleTransfer} className="btn-ghost text-neon-cyan">
                👑 Transférer
              </button>
            )}
            <button onClick={onEnd} className="btn-ghost text-neon-pink">Finir</button>
          </div>
        </div>
      </div>
    </header>
  );
}

export function CenteredMessage({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: { label: string; href: string };
}) {
  return (
    <main className="game-stage mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 text-center">
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
