"use client";

import { useMemo } from "react";
import { PlayerAvatar } from "./playerAvatar";
import type { GameType, Player, Room } from "@/types/database";

export interface TvHostStageProps {
  room: Room;
  players: Player[];
  gameLabel: string | undefined;
  gameType: GameType | null;
  currentQuestionText: string | null;
  voteLeft: number;
  submittedVotesCount: number;
  submittedJaugeCount: number;
  totalParticipants: number;
  totalJaugeVoters: number;
  isJauge: boolean;
  onRevealNow: () => void;
  onNext: () => Promise<void> | void;
  onEnd: () => void;
  busy: boolean;
}

export function labelStatus(status: string, gameLabel?: string): string {
  switch (status) {
    case "lobby":
      return "Lobby";
    case "question_active":
      return gameLabel === "Mime" ? "Mime en cours" : "Vote en cours";
    case "reveal_results":
      return "Révélation";
    case "scoreboard":
      return "Scoreboard";
    case "end_game_summary":
      return "Bilan";
    case "ended":
      return "Terminée";
    default:
      return status;
  }
}

export function TvHostStage({
  room,
  players,
  gameLabel,
  gameType,
  currentQuestionText,
  voteLeft,
  submittedVotesCount,
  submittedJaugeCount,
  totalParticipants,
  totalJaugeVoters,
  isJauge,
  onRevealNow,
  onNext,
  onEnd,
  busy,
}: TvHostStageProps) {
  const isLobby = room.status === "lobby";
  const isQuestionActive = room.status === "question_active";
  const showLobbyHero = isLobby;
  const denominator = isJauge ? totalJaugeVoters : totalParticipants;
  const submittedNow = isJauge ? submittedJaugeCount : submittedVotesCount;
  const progress = denominator > 0 ? Math.min(100, (submittedNow / denominator) * 100) : 0;
  const timerHot = voteLeft > 0 && voteLeft <= 5;

  const joinHost = useMemo(() => {
    if (typeof window === "undefined") return "badaboum.app";
    return window.location.host || "badaboum.app";
  }, []);
  const joinUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/play/${room.code}`;
  }, [room.code]);
  const qrUrl = useMemo(() => {
    if (!joinUrl) return null;
    const params = new URLSearchParams({
      size: "320x320",
      margin: "10",
      qzone: "2",
      data: joinUrl,
      color: "0a0410",
      bgcolor: "ffffff",
      format: "svg",
    });
    return `https://api.qrserver.com/v1/create-qr-code/?${params.toString()}`;
  }, [joinUrl]);

  return (
    <section className="tv-stage mb-4" aria-label="Mode TV">
      <div className="tv-topbar">
        <div className="tv-topbar-brand">
          <span className="app-navbar-brand-mark" aria-hidden="true">B</span>
          <div>
            <div className="tv-topbar-eyebrow">Mode TV · Badaboum</div>
            <div className="tv-topbar-title">{gameLabel ?? "Sélection du jeu"}</div>
          </div>
        </div>
        <div className="tv-topbar-meta">
          <span>Code : {room.code}</span>
          <span>
            {players.length} joueur{players.length > 1 ? "s" : ""}
          </span>
          <span>{labelStatus(room.status, gameLabel)}</span>
        </div>
      </div>

      {showLobbyHero && (
        <div className="tv-lobby-hero">
          <div className="tv-code-card">
            <div className="tv-code-card-header">
              <span className="tv-code-eyebrow">Rejoins la partie</span>
              <span className="tv-code-host">{joinHost}</span>
            </div>
            <div className="tv-code-value-wrap">
              <span className="tv-code-value">{room.code}</span>
            </div>
            {qrUrl && (
              <figure className="tv-code-qr">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrUrl}
                  alt={`QR code pour rejoindre la salle ${room.code}`}
                  loading="lazy"
                  decoding="async"
                  width={240}
                  height={240}
                />
                <figcaption>Scanne pour rejoindre direct</figcaption>
              </figure>
            )}
            <div className="tv-code-instructions">
              <p className="tv-code-instructions-primary">
                <span aria-hidden="true">📱</span>
                <span>
                  <strong>Scanne le QR code</strong> pour rejoindre directement la salle.
                </span>
              </p>
              <p className="tv-code-instructions-secondary">
                Pas de QR ? Ouvre <strong>{joinHost}</strong> et entre <span className="tv-code-inline">{room.code}</span>.
              </p>
            </div>
          </div>

          <div className="tv-players-panel">
            <div className="tv-players-panel-header">
              <span className="tv-players-panel-title">Joueurs en attente</span>
              <span className="tv-players-panel-count">{players.length}</span>
            </div>
            {players.length === 0 ? (
              <div className="lobby-grid-empty">
                <span className="lobby-grid-empty-pulse" aria-hidden="true" />
                <p>En attente du premier joueur. Partage le code !</p>
              </div>
            ) : (
              <div className="tv-players-grid">
                {players.map((player, index) => (
                  <article
                    key={player.id}
                    className="tv-player-card"
                    style={{ animationDelay: `${Math.min(index, 18) * 60}ms` }}
                  >
                    <PlayerAvatar player={player} size="lg" />
                    <span className="tv-player-name">{player.name}</span>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {isQuestionActive && currentQuestionText && (
        <div className="tv-vote-progress-card">
          <div className="flex items-start justify-between gap-4">
            <div className="tv-vote-progress-label">Question en cours · {gameLabel}</div>
            <div className={`tv-timer-pill ${timerHot ? "is-hot" : ""}`}>{voteLeft}s</div>
          </div>
          <p className="tv-vote-progress-question">{currentQuestionText}</p>
          <div className="tv-vote-progress-counter">
            {submittedNow} / {denominator || "?"}
          </div>
          <div className="tv-vote-progress-bar">
            <div className="tv-vote-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="tv-section-eyebrow">
            Les votes apparaissent en direct. Reveal automatique quand tout le monde a répondu.
          </div>
        </div>
      )}

      {(isQuestionActive || room.status === "reveal_results") && (
        <div className="tv-host-toolbar">
          {isQuestionActive && (
            <button
              type="button"
              disabled={busy}
              onClick={onRevealNow}
              className="tv-host-toolbar-button is-primary"
            >
              Révéler maintenant
            </button>
          )}
          {room.status === "reveal_results" && gameType !== "mime_expressions" && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void onNext()}
              className="tv-host-toolbar-button is-primary"
            >
              Question suivante
            </button>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={onEnd}
            className="tv-host-toolbar-button is-danger"
          >
            Finir la partie
          </button>
        </div>
      )}
    </section>
  );
}
