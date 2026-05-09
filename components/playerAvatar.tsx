"use client";

import { memo, useMemo, useState } from "react";
import {
  buildAvatarUrl,
  getPlayerAvatarConfig,
  getPlayerInitials,
  type AvatarConfig,
} from "@/lib/avatar";
import type { Player } from "@/types/database";

const SIZE_CLASS = {
  xs: "h-6 w-6 text-[10px] rounded-xl",
  sm: "h-8 w-8 text-xs rounded-2xl",
  md: "h-11 w-11 text-sm rounded-2xl",
  lg: "h-14 w-14 text-base rounded-[1.25rem]",
  xl: "h-24 w-24 text-3xl rounded-[2rem]",
} as const;

export type PlayerAvatarSize = keyof typeof SIZE_CLASS;

export const PlayerAvatar = memo(function PlayerAvatar({
  player,
  size = "md",
  className = "",
}: {
  player: Player | null;
  size?: PlayerAvatarSize;
  className?: string;
}) {
  const config = useMemo(() => getPlayerAvatarConfig(player), [player]);
  return (
    <AvatarImage
      config={config}
      name={player?.name ?? "Joueur"}
      legacyLabel={player?.avatar ?? null}
      size={size}
      className={className}
    />
  );
});

export const AvatarImage = memo(function AvatarImage({
  config,
  name,
  legacyLabel,
  size = "md",
  className = "",
}: {
  config: AvatarConfig;
  name: string;
  legacyLabel?: string | null;
  size?: PlayerAvatarSize;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const url = useMemo(() => buildAvatarUrl(config, size === "xl" ? 196 : size === "lg" ? 144 : 112), [config, size]);
  const label = legacyLabel || getPlayerInitials(name);
  const glow = `0 0 0 1px rgba(255,255,255,0.16), 0 16px 34px ${hexToRgba(config.avatarColor, 0.24)}`;

  return (
    <span
      className={`avatar-frame inline-flex shrink-0 items-center justify-center overflow-hidden bg-black/30 font-black text-white ${SIZE_CLASS[size]} ${className}`}
      style={{ boxShadow: glow, background: `linear-gradient(135deg, ${config.avatarColor}, rgba(34, 211, 238, 0.5))` }}
      aria-hidden="true"
    >
      {!failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="drop-shadow">{label.slice(0, 2)}</span>
      )}
    </span>
  );
});

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const value = Number.parseInt(clean, 16);
  if (!Number.isFinite(value)) return `rgba(255, 62, 165, ${alpha})`;
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}
