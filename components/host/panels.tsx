"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { PlayerAvatar } from "@/components/playerAvatar";
import { Button } from "@/components/ui";
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
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  return (
    <section className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 px-4 py-5 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true" aria-labelledby="transfer-host-title">
      <div className="surface-card-elev w-full max-w-lg rounded-[2rem] border border-neon-cyan/25 p-5 shadow-glow-cyan">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.22em] text-neon-cyan">Transfert hôte</div>
            <h2 id="transfer-host-title" className="mt-1 text-2xl font-black">Donner les commandes</h2>
            <p className="mt-1 text-sm font-semibold text-white/55">
              Choisis un joueur, puis confirme. Le changement est synchronisé en realtime.
            </p>
          </div>
          <Button type="button" variant="icon" size="sm" onClick={onClose} aria-label="Fermer le transfert">
            ×
          </Button>
        </div>

        {!selectedPlayer ? (
          <ul className="grid gap-2">
            {players.map((player) => (
              <li key={player.id}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setSelectedPlayer(player)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 text-left transition hover:-translate-y-0.5 hover:border-neon-cyan/60 hover:bg-neon-cyan/10 disabled:opacity-50"
                >
                  <PlayerAvatar player={player} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-base font-black">{player.name}</span>
                    <span className="block text-xs font-bold uppercase tracking-wider text-white/40">Peut devenir hôte</span>
                  </span>
                  <span className="text-neon-cyan">→</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-[1.5rem] border border-neon-cyan/25 bg-neon-cyan/10 p-4 text-center">
            <PlayerAvatar player={selectedPlayer} size="lg" />
            <h3 className="mt-3 text-xl font-black">Transférer à {selectedPlayer.name} ?</h3>
            <p className="mx-auto mt-2 max-w-sm text-sm font-semibold text-white/60">
              Tu perdras les contrôles hôte sur cet écran. {selectedPlayer.name} pourra lancer, révéler et terminer la soirée.
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <Button type="button" variant="secondary" disabled={busy} onClick={() => setSelectedPlayer(null)}>
                Retour
              </Button>
              <Button type="button" variant="primary" disabled={busy} onClick={() => onPick(selectedPlayer)} leading="👑">
                Confirmer
              </Button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export function EndSessionModal({
  busy,
  onShowSummary,
  onEndWithoutSummary,
  onClose,
}: {
  busy: boolean;
  onShowSummary: () => void;
  onEndWithoutSummary: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <section
      className="fixed inset-0 z-[999] flex min-h-dvh items-center justify-center overflow-y-auto bg-black/75 px-4 py-6 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="end-session-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="surface-card-elev max-h-[calc(100dvh-3rem)] w-full max-w-lg overflow-y-auto rounded-[2rem] border border-neon-pink/25 p-5 shadow-glow-pink animate-pop">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-xs font-black uppercase tracking-[0.22em] text-neon-pink">Fin de soirée</div>
            <h2 id="end-session-title" className="mt-1 text-2xl font-black">Terminer la soirée</h2>
            <p className="mt-1 text-sm font-semibold text-white/55">
              Voulez-vous afficher le bilan de la soirée avant de quitter ?
            </p>
          </div>
          <Button type="button" variant="icon" size="sm" onClick={onClose} aria-label="Annuler la fin de soirée">
            ×
          </Button>
        </div>

        <div className="grid gap-3">
          <Button type="button" variant="primary" size="lg" disabled={busy} onClick={onShowSummary} leading="🏆">
            Afficher le bilan
          </Button>
          <Button type="button" variant="danger" size="lg" disabled={busy} onClick={onEndWithoutSummary} leading="⏻">
            Terminer sans bilan
          </Button>
          <Button type="button" variant="secondary" size="lg" disabled={busy} onClick={onClose}>
            Annuler
          </Button>
        </div>
      </div>
    </section>,
    document.body,
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

      <Button
        type="button"
        disabled={submitting || myQuestionCount >= maxQuestionsPerPlayer}
        onClick={onSubmit}
        variant="secondary"
        size="lg"
        fullWidth
        className="mt-3"
      >
        {submitting ? "Ajout..." : myQuestionCount >= maxQuestionsPerPlayer ? "Limite atteinte" : "Ajouter ma question"}
      </Button>
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
            <Button
              type="button"
              disabled={clearingQuestions || playedLiveQuestionCount === 0}
              onClick={onClearPlayedQuestions}
              variant="ghost"
              size="sm"
              className="text-neon-yellow"
            >
              Supprimer jouées
            </Button>
            <Button
              type="button"
              disabled={clearingQuestions || roomLiveQuestionCount === 0}
              onClick={onClearAllQuestions}
              variant="danger"
              size="sm"
            >
              Tout vider
            </Button>
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
