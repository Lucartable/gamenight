import type { Player } from "@/types/database";

export type AvatarStyle = "adventurer" | "bottts-neutral" | "lorelei" | "micah" | "fun-emoji" | "personas";

export interface AvatarOptions {
  backgroundColor?: string;
  radius?: number;
  flip?: boolean;
  rotate?: number;
  scale?: number;
}

export interface AvatarConfig {
  avatarStyle: AvatarStyle;
  avatarSeed: string;
  avatarColor: string;
  avatarOptions: AvatarOptions;
}

interface AvatarConfigInput {
  avatarStyle?: unknown;
  avatarSeed?: unknown;
  avatarColor?: unknown;
  avatarOptions?: unknown;
}

export const AVATAR_STYLES: Array<{ id: AvatarStyle; label: string; vibe: string }> = [
  { id: "adventurer", label: "Aventurier", vibe: "personnage" },
  { id: "bottts-neutral", label: "Robot", vibe: "futuriste" },
  { id: "lorelei", label: "Lorelei", vibe: "premium" },
  { id: "micah", label: "Micah", vibe: "clean" },
  { id: "fun-emoji", label: "Emoji", vibe: "party" },
  { id: "personas", label: "Persona", vibe: "social" },
];

export const AVATAR_COLORS = ["#ff3ea5", "#22d3ee", "#facc15", "#4ade80", "#a855f7", "#fb7185", "#38bdf8", "#f97316"] as const;
export const AVATAR_BACKGROUNDS = ["#18091f", "#082f49", "#312e81", "#3b0764", "#052e16", "#431407", "#111827", "#fef3c7"] as const;

const DEFAULT_STYLE: AvatarStyle = "adventurer";
const DEFAULT_COLOR = "#ff3ea5";

export function createRandomAvatarConfig(name = "badaboum"): AvatarConfig {
  const style = AVATAR_STYLES[Math.floor(Math.random() * AVATAR_STYLES.length)]?.id ?? DEFAULT_STYLE;
  const color = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)] ?? DEFAULT_COLOR;
  const backgroundColor = AVATAR_BACKGROUNDS[Math.floor(Math.random() * AVATAR_BACKGROUNDS.length)] ?? "#18091f";
  return {
    avatarStyle: style,
    avatarSeed: makeAvatarSeed(name),
    avatarColor: color,
    avatarOptions: {
      backgroundColor,
      radius: 18,
      scale: 96,
      rotate: 0,
      flip: Math.random() > 0.5,
    },
  };
}

export function buildAvatarUrl(config: AvatarConfig, size = 128): string {
  const style = sanitizeAvatarStyle(config.avatarStyle);
  const options = normalizeAvatarOptions(config.avatarOptions);
  const params = new URLSearchParams({
    seed: config.avatarSeed || "badaboum",
    size: String(size),
    radius: String(options.radius ?? 18),
    scale: String(options.scale ?? 96),
    rotate: String(options.rotate ?? 0),
    flip: options.flip ? "true" : "false",
    backgroundColor: stripHash(options.backgroundColor ?? config.avatarColor),
  });
  return `https://api.dicebear.com/9.x/${style}/svg?${params.toString()}`;
}

export function normalizeAvatarConfig(value: AvatarConfigInput | null | undefined, fallbackName = "badaboum"): AvatarConfig {
  const fallback = createRandomAvatarConfig(fallbackName);
  const avatarColor = sanitizeHex(value?.avatarColor, fallback.avatarColor);
  return {
    avatarStyle: sanitizeAvatarStyle(value?.avatarStyle),
    avatarSeed: sanitizeSeed(value?.avatarSeed, fallback.avatarSeed),
    avatarColor,
    avatarOptions: normalizeAvatarOptions(value?.avatarOptions, avatarColor),
  };
}

export function getPlayerAvatarConfig(player: Player | null | undefined): AvatarConfig {
  return normalizeAvatarConfig(
    {
      avatarStyle: player?.avatar_style ?? undefined,
      avatarSeed: player?.avatar_seed ?? player?.guest_id ?? player?.client_id ?? player?.id,
      avatarColor: player?.avatar_color ?? player?.color ?? undefined,
      avatarOptions: player?.avatar_options ?? undefined,
    },
    player?.name ?? "badaboum"
  );
}

export function makeAvatarSeed(name: string): string {
  const base = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "badaboum";
  return `${base}-${Math.random().toString(36).slice(2, 8)}`;
}

export function getPlayerInitials(name: string | null | undefined): string {
  const clean = name?.trim();
  if (!clean) return "?";
  return clean
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "?";
}

export function sanitizeHex(value: unknown, fallback = DEFAULT_COLOR): string {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
}

function sanitizeAvatarStyle(value: unknown): AvatarStyle {
  return AVATAR_STYLES.some((style) => style.id === value) ? value as AvatarStyle : DEFAULT_STYLE;
}

function sanitizeSeed(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const clean = value.trim().slice(0, 96);
  return clean || fallback;
}

function normalizeAvatarOptions(value: unknown, fallbackColor = DEFAULT_COLOR): AvatarOptions {
  const raw = value && typeof value === "object" && !Array.isArray(value) ? value as AvatarOptions : {};
  return {
    backgroundColor: sanitizeHex(raw.backgroundColor, fallbackColor),
    radius: clampNumber(raw.radius, 0, 50, 18),
    flip: Boolean(raw.flip),
    rotate: clampNumber(raw.rotate, -12, 12, 0),
    scale: clampNumber(raw.scale, 82, 110, 96),
  };
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const numeric = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  return Math.min(max, Math.max(min, Math.round(numeric)));
}

function stripHash(value: string): string {
  return value.replace("#", "");
}
