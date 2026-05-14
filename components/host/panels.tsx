"use client";

import type { GameType, Player } from "@/types/database";

export function TransferPanel({
  players,
  busy,
  onPick,
  onClose,
}: {
  players: Player[];
  busy: boolean;
  onPick: (p: Player) => void;
  onClose: () => void;
}) {
  return (
    <section className="card mb-4 border-neon-cyan/40 bg-neon-cyan/5 p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold">Passer le rôle d&apos;hôte</h2>
        <button onClick={onClose} className="btn-ghost">✕</button>
      </div>
      <ul className="space-y-2">
        {players.map((p) => (
          <li key={p.id}>
            <button
              disabled={busy}
              onClick={() => onPick(p)}
              className="w-full rounded-2xl border border-white/10 bg-bg-soft p-3 text-left transition hover:border-neon-cyan/60 disabled:opacity-50"
            >
              👑 Donner le rôle à <b className="text-neon-cyan">{p.name}</b>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function HostCustomQuestionPanel({
  gameType,
  playerName,
  draft,
  optionA,
  optionB,
  options,
  submitting,
  myQuestionCount,
  liveQuestionCount,
  roomLiveQuestionCount,
  playedLiveQuestionCount,
  maxQuestionsPerPlayer,
  expectedQuestionCount,
  clearingQuestions,
  onDraftChange,
  onOptionAChange,
  onOptionBChange,
  onOptionsChange,
  onSubmit,
  onClearPlayedQuestions,
  onClearAllQuestions,
}: {
  gameType: GameType;
  playerName: string;
  draft: string;
  optionA: string;
  optionB: string;
  options: string;
  submitting: boolean;
  myQuestionCount: number;
  liveQuestionCount: number;
  roomLiveQuestionCount: number;
  playedLiveQuestionCount: number;
  maxQuestionsPerPlayer: number;
  expectedQuestionCount: number;
  clearingQuestions: boolean;
  onDraftChange: (value: string) => void;
  onOptionAChange: (value: string) => void;
  onOptionBChange: (value: string) => void;
  onOptionsChange: (value: string) => void;
  onSubmit: () => void;
  onClearPlayedQuestions: () => void;
  onClearAllQuestions: () => void;
}) {
  return (
    <section className="card mb-4 border-neon-cyan/30 bg-neon-cyan/10 p-5 animate-reveal-in">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-black uppercase tracking-wider text-neon-cyan">Questions joueurs</div>
          <h2 className="mt-1 text-xl font-black">Ajouter mes questions</h2>
          <p className="mt-1 text-sm font-semibold text-white/60">
            Tu contribues comme joueur avec le profil de partie &quot;{playerName}&quot;.
          </p>
        </div>
        <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-black text-white/60">
          toi {myQuestionCount}/{maxQuestionsPerPlayer}
        </span>
      </div>

      <div className="mt-4 grid gap-2">
        {gameType === "who_would" ? (
          <>
            <input className="input rounded-2xl p-3" value={draft} onChange={(event) => onDraftChange(event.target.value)} placeholder="Question / contexte (optionnel)" />
            <input className="input rounded-2xl p-3" value={optionA} onChange={(event) => onOptionAChange(event.target.value)} placeholder="Option A" />
            <input className="input rounded-2xl p-3" value={optionB} onChange={(event) => onOptionBChange(event.target.value)} placeholder="Option B" />
          </>
        ) : (
          <textarea
            value={draft}
            onChange={(event) => onDraftChange(event.target.value)}
            maxLength={220}
            rows={3}
            className="input min-h-24 w-full resize-none rounded-2xl p-3"
            placeholder={gameType === "mime_expressions" ? "Expression à mimer..." : gameType === "jauge" ? "À quel point cette personne..." : "Écris ta question..."}
          />
        )}
        {(gameType === "majority" || gameType === "minority") && (
          <textarea
            value={options}
            onChange={(event) => onOptionsChange(event.target.value)}
            rows={3}
            className="input min-h-20 w-full resize-none rounded-2xl p-3"
            placeholder="Options, une par ligne"
          />
        )}
      </div>

      <button
        type="button"
        disabled={submitting || myQuestionCount >= maxQuestionsPerPlayer}
        onClick={onSubmit}
        className="btn-secondary mt-3 w-full"
      >
        {submitting ? "Ajout..." : myQuestionCount >= maxQuestionsPerPlayer ? "Limite atteinte" : "Ajouter ma question"}
      </button>
      <p className="mt-2 text-center text-xs font-semibold text-white/45">
        {liveQuestionCount}/{expectedQuestionCount} question{expectedQuestionCount > 1 ? "s" : ""} attendue{expectedQuestionCount > 1 ? "s" : ""} si tout le monde contribue.
      </p>

      <div className="mt-4 rounded-2xl border border-neon-pink/20 bg-black/20 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-black uppercase tracking-wider text-neon-pink/80">Nettoyage de la room</div>
            <p className="mt-1 text-sm font-semibold text-white/55">
              {roomLiveQuestionCount} question{roomLiveQuestionCount > 1 ? "s" : ""} joueur{roomLiveQuestionCount > 1 ? "s" : ""} dans la room · {playedLiveQuestionCount} déjà jouée{playedLiveQuestionCount > 1 ? "s" : ""} pour ce jeu.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={clearingQuestions || playedLiveQuestionCount === 0}
              onClick={onClearPlayedQuestions}
              className="btn-ghost text-neon-yellow disabled:opacity-40"
            >
              Supprimer jouées
            </button>
            <button
              type="button"
              disabled={clearingQuestions || roomLiveQuestionCount === 0}
              onClick={onClearAllQuestions}
              className="btn-ghost text-neon-pink disabled:opacity-40"
            >
              Tout vider
            </button>
          </div>
        </div>
        <p className="mt-2 text-xs font-semibold text-white/40">
          Les questions système, sauvegardées et les packs ne sont jamais supprimés par cette action.
        </p>
      </div>
    </section>
  );
}

export function MimeHostActions({
  busy,
  isFinal,
  revealDisabled,
  onReveal,
  onRestart,
  onNext,
  onEnd,
}: {
  busy: boolean;
  isFinal: boolean;
  revealDisabled: boolean;
  onReveal: () => void;
  onRestart: () => void;
  onNext: () => void;
  onEnd: () => void;
}) {
  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <button type="button" disabled={busy || revealDisabled} onClick={onReveal} className="btn-primary">
        Révéler l&apos;expression
      </button>
      <button type="button" disabled={busy} onClick={onRestart} className="btn-secondary">
        Relancer la manche
      </button>
      <button type="button" disabled={busy} onClick={isFinal ? onEnd : onNext} className="btn-secondary">
        {isFinal ? "Résultats finaux" : "Manche suivante"}
      </button>
      <button type="button" disabled={busy} onClick={onEnd} className="btn-ghost text-neon-pink">
        Terminer la partie
      </button>
    </div>
  );
}

export function MimeOrderPanel({
  currentMimePlayerId,
  orderedPlayers,
  playersOutsideOrder,
  busy,
  onAddPlayer,
}: {
  currentMimePlayerId: string;
  orderedPlayers: Player[];
  playersOutsideOrder: Player[];
  busy: boolean;
  onAddPlayer: (player: Player) => void;
}) {
  return (
    <div className="mt-5 rounded-2xl border border-white/10 bg-bg-soft p-4">
      <div className="mb-3 text-xs font-bold uppercase tracking-wider text-white/50">Ordre de passage</div>
      <ol className="space-y-2">
        {orderedPlayers.map((player, index) => (
          <li
            key={player.id}
            className={`flex items-center gap-3 rounded-xl p-3 ${
              player.id === currentMimePlayerId
                ? "border border-neon-cyan/50 bg-neon-cyan/10"
                : "border border-white/10 bg-white/5"
            }`}
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-xs font-black">
              {index + 1}
            </span>
            <span className="min-w-0 flex-1 truncate font-semibold">{player.name}</span>
            {player.id === currentMimePlayerId && <span className="text-xs font-bold text-neon-cyan">En cours</span>}
          </li>
        ))}
      </ol>

      {playersOutsideOrder.length > 0 && (
        <div className="mt-4">
          <div className="mb-2 text-xs font-bold uppercase tracking-wider text-white/50">Nouveaux joueurs</div>
          <div className="grid gap-2">
            {playersOutsideOrder.map((player) => (
              <button
                key={player.id}
                type="button"
                disabled={busy}
                onClick={() => onAddPlayer(player)}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left font-semibold transition hover:border-neon-cyan/50 disabled:opacity-50"
              >
                Ajouter {player.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
