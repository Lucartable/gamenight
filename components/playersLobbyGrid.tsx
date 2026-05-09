"use client";

import { memo, useMemo } from "react";
import type { Player } from "@/types/database";
import { PlayerAvatar } from "./playerAvatar";

interface PlayersLobbyGridProps {
  players: Player[];
  currentPlayerId?: string | null;
  hostClientId?: string | null;
  emptyHint?: string;
  layout?: "grid" | "compact";
  className?: string;
}

export const PlayersLobbyGrid = memo(function PlayersLobbyGrid({
  players,
  currentPlayerId = null,
  hostClientId = null,
  emptyHint = "En attente des joueurs...",
  layout = "grid",
  className = "",
}: PlayersLobbyGridProps) {
  const ordered = useMemo(() => {
    return [...players].sort((a, b) => {
      const aHost = isHost(a, hostClientId) ? 0 : 1;
      const bHost = isHost(b, hostClientId) ? 0 : 1;
      if (aHost !== bHost) return aHost - bHost;
      return new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime();
    });
  }, [players, hostClientId]);

  if (ordered.length === 0) {
    return (
      <div className="lobby-grid-empty">
        <span className="lobby-grid-empty-pulse" aria-hidden="true" />
        <p>{emptyHint}</p>
      </div>
    );
  }

  return (
    <div className={`lobby-grid lobby-grid-${layout} ${className}`}>
      {ordered.map((player, index) => {
        const isMe = player.id === currentPlayerId;
        const host = isHost(player, hostClientId);
        return (
          <article
            key={player.id}
            className={`lobby-player-card ${isMe ? "is-me" : ""} ${host ? "is-host" : ""}`}
            style={{ animationDelay: `${Math.min(index, 12) * 60}ms` }}
          >
            <span className="lobby-player-glow" aria-hidden="true" />
            <PlayerAvatar player={player} size="lg" className="lobby-player-avatar" />
            <div className="lobby-player-meta">
              <span className="lobby-player-name" title={player.name}>{player.name}</span>
              <span className="lobby-player-tags">
                {host && <span className="lobby-player-tag is-host">Hôte</span>}
                {isMe && <span className="lobby-player-tag is-me">Moi</span>}
              </span>
            </div>
          </article>
        );
      })}
    </div>
  );
});

function isHost(player: Player, hostClientId: string | null): boolean {
  return Boolean(player.is_host) || (hostClientId !== null && player.client_id === hostClientId);
}
