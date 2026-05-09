"use client";

import { memo, useEffect, useMemo, useState } from "react";
import {
  buildAvatarUrl,
  buildStableAvatarKey,
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

const PIXEL_SIZE = {
  xs: 96,
  sm: 96,
  md: 112,
  lg: 144,
  xl: 196,
} as const;

export type PlayerAvatarSize = keyof typeof SIZE_CLASS;
export type PlayerAvatarVariant = "default" | "anonymous";

export const PlayerAvatar = memo(function PlayerAvatar({
  player,
  size = "md",
  className = "",
  variant = "default",
}: {
  player: Player | null;
  size?: PlayerAvatarSize;
  className?: string;
  variant?: PlayerAvatarVariant;
}) {
  const config = useMemo(() => getPlayerAvatarConfig(player), [player]);
  if (variant === "anonymous" || !player) {
    return <AnonymousAvatar size={size} className={className} accent={config.avatarColor} />;
  }
  return (
    <AvatarImage
      config={config}
      name={player.name ?? "Joueur"}
      size={size}
      className={className}
    />
  );
});

export const AvatarImage = memo(function AvatarImage({
  config,
  name,
  size = "md",
  className = "",
}: {
  config: AvatarConfig;
  name: string;
  size?: PlayerAvatarSize;
  className?: string;
}) {
  const stableKey = buildStableAvatarKey(config);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [stableKey]);

  const url = useMemo(() => buildAvatarUrl(config, PIXEL_SIZE[size]), [config, size]);
  const initials = getPlayerInitials(name);
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
          key={stableKey}
          src={url}
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <FallbackInitials initials={initials} />
      )}
    </span>
  );
});

export const AnonymousAvatar = memo(function AnonymousAvatar({
  size = "md",
  className = "",
  accent = "#22d3ee",
}: {
  size?: PlayerAvatarSize;
  className?: string;
  accent?: string;
}) {
  return (
    <span
      className={`avatar-frame avatar-anonymous inline-flex shrink-0 items-center justify-center overflow-hidden text-white ${SIZE_CLASS[size]} ${className}`}
      style={{
        background: "linear-gradient(135deg, rgba(255,255,255,0.08), rgba(0,0,0,0.45))",
        boxShadow: `0 0 0 1px rgba(255,255,255,0.16), 0 14px 28px ${hexToRgba(accent, 0.2)}`,
      }}
      aria-hidden="true"
    >
      <AnonymousMask />
    </span>
  );
});

function FallbackInitials({ initials }: { initials: string }) {
  return <span className="drop-shadow text-center leading-none">{initials.slice(0, 2)}</span>;
}

function AnonymousMask() {
  return (
    <svg
      viewBox="0 0 64 64"
      className="h-[68%] w-[68%]"
      role="presentation"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="anonGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.95)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.55)" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="22" r="11" fill="url(#anonGrad)" />
      <path
        d="M10 56c2.5-12 11.5-19 22-19s19.5 7 22 19v2H10z"
        fill="url(#anonGrad)"
      />
    </svg>
  );
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const value = Number.parseInt(clean, 16);
  if (!Number.isFinite(value)) return `rgba(255, 62, 165, ${alpha})`;
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}
