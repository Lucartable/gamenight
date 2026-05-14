"use client";

import {
  MimeHostActions,
  MimeOrderPanel,
} from "@/components/host/panels";
import {
  getCategoryForGame,
  type MimeExpressionQuestion,
} from "@/lib/gameQuestions";
import { getMimeModeMeta } from "@/lib/mimeModes";
import type {
  Player,
  Room,
} from "@/types/database";

export function MimeActiveHostView({
  expression,
  state,
  currentMimePlayer,
  isHostMime,
  isTv = false,
  orderedPlayers,
  playersOutsideOrder,
  roundLeft,
  totalRounds,
  busy,
  onReveal,
  onRestart,
  onNext,
  onEnd,
  onAddPlayer,
}: {
  expression: MimeExpressionQuestion;
  state: NonNullable<Room["mime_game_state"]>;
  currentMimePlayer: Player | undefined;
  isHostMime: boolean;
  isTv?: boolean;
  orderedPlayers: Player[];
  playersOutsideOrder: Player[];
  roundLeft: number;
  totalRounds: number;
  busy: boolean;
  onReveal: () => void;
  onRestart: () => void;
  onNext: () => void;
  onEnd: () => void;
  onAddPlayer: (player: Player) => void;
}) {
  const category = getCategoryForGame("mime_expressions", expression.category);
  const isFinal = state.roundNumber >= totalRounds;
  const timeIsHot = roundLeft <= 5;
  const ended = state.roundStatus === "ended" || roundLeft === 0;
  const showExpression = !state.hostPlayMode || isHostMime;
  const modeMeta = getMimeModeMeta(state.mimeMode);

  return (
    <section key={state.currentMimePlayerId} className={`card game-panel-enter flex flex-1 flex-col p-5 animate-reveal-in ${isTv ? "tv-reveal-card tv-mime-active" : ""}`}>
      <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
        {category && <span className="chip">{category.emoji} {category.label}</span>}
        <span className="chip border-neon-pink/40 bg-neon-pink/10 text-neon-pink">
          {modeMeta.emoji} {modeMeta.label}
        </span>
        <span className="chip">Manche {state.roundNumber} / {totalRounds}</span>
        <span className={`chip ${ended ? "border-neon-yellow/50 text-neon-yellow" : "border-neon-cyan/40 text-neon-cyan"}`}>
          {ended ? "Temps écoulé" : "Mime en cours"}
        </span>
      </div>

      <div className="tv-mime-rule mb-4 rounded-2xl border border-neon-pink/30 bg-neon-pink/5 p-3 text-center text-xs font-semibold text-neon-pink">
        <strong className="font-black">Règle :</strong> {modeMeta.rule}
        {state.mimeRuleFlavor && (
          <div className="mt-1 text-white/80">{state.mimeRuleFlavor}</div>
        )}
      </div>

      <div className={`tv-mime-timer text-center text-7xl font-black tabular-nums ${timeIsHot ? "timer-hot text-neon-pink" : "text-white"}`}>
        {roundLeft}
      </div>
      <div className="text-center text-sm text-white/50">secondes</div>

      <div className="tv-mime-player mt-6 rounded-2xl border border-neon-cyan/40 bg-neon-cyan/10 p-5 text-center">
        <div className="text-xs font-bold uppercase tracking-wider text-neon-cyan">Mime actuel</div>
        <div className="mt-2 text-3xl font-black">{currentMimePlayer?.name ?? "Joueur absent"}</div>
      </div>

      {showExpression ? (
        <div className="tv-reveal-question mt-4 rounded-2xl border border-white/10 bg-white/5 p-5 text-center">
          <div className="text-xs font-bold uppercase tracking-wider text-white/50">Expression</div>
          <div className="mt-3 text-3xl font-black leading-tight">{expression.text}</div>
        </div>
      ) : (
        <div className="tv-reveal-question mt-4 rounded-2xl border border-white/10 bg-white/5 p-5 text-center">
          <div className="text-xs font-bold uppercase tracking-wider text-white/50">Expression masquée</div>
          <div className="mt-3 text-xl font-bold text-white/80">
            Tu peux deviner avec les autres joueurs.
          </div>
        </div>
      )}

      <MimeHostActions
        busy={busy}
        isFinal={isFinal}
        revealDisabled={state.roundStatus === "revealed"}
        onReveal={onReveal}
        onRestart={onRestart}
        onNext={onNext}
        onEnd={onEnd}
      />

      {!isTv && (
        <MimeOrderPanel
          currentMimePlayerId={state.currentMimePlayerId}
          orderedPlayers={orderedPlayers}
          playersOutsideOrder={playersOutsideOrder}
          busy={busy}
          onAddPlayer={onAddPlayer}
        />
      )}
    </section>
  );
}

export function MimeRevealHostView({
  expression,
  state,
  currentMimePlayer,
  isTv = false,
  orderedPlayers,
  playersOutsideOrder,
  totalRounds,
  busy,
  onRestart,
  onNext,
  onEnd,
  onAddPlayer,
}: {
  expression: MimeExpressionQuestion;
  state: NonNullable<Room["mime_game_state"]>;
  currentMimePlayer: Player | undefined;
  isTv?: boolean;
  orderedPlayers: Player[];
  playersOutsideOrder: Player[];
  totalRounds: number;
  busy: boolean;
  onRestart: () => void;
  onNext: () => void;
  onEnd: () => void;
  onAddPlayer: (player: Player) => void;
}) {
  const category = getCategoryForGame("mime_expressions", expression.category);
  const isFinal = state.roundNumber >= totalRounds;

  return (
    <section key={`revealed-${state.currentExpressionId}`} className={`card game-panel-enter flex flex-1 flex-col p-5 animate-reveal-in ${isTv ? "tv-reveal-card tv-mime-reveal" : ""}`}>
      <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
        {category && <span className="chip">{category.emoji} {category.label}</span>}
        <span className="chip">Manche {state.roundNumber} / {totalRounds}</span>
        <span className="chip border-neon-green/50 text-neon-green">Expression révélée</span>
      </div>

      <div className="tv-mime-expression rounded-2xl border border-neon-green/40 bg-neon-green/10 p-5 text-center">
        <div className="text-xs font-bold uppercase tracking-wider text-neon-green">Expression</div>
        <div className="mt-3 text-4xl font-black leading-tight">{expression.text}</div>
        <div className="mt-4 text-white/60">
          Mime : <span className="font-bold text-white">{currentMimePlayer?.name ?? "Joueur absent"}</span>
        </div>
      </div>

      <MimeHostActions
        busy={busy}
        isFinal={isFinal}
        revealDisabled
        onReveal={() => {}}
        onRestart={onRestart}
        onNext={onNext}
        onEnd={onEnd}
      />

      {!isTv && (
        <MimeOrderPanel
          currentMimePlayerId={state.currentMimePlayerId}
          orderedPlayers={orderedPlayers}
          playersOutsideOrder={playersOutsideOrder}
          busy={busy}
          onAddPlayer={onAddPlayer}
        />
      )}
    </section>
  );
}
