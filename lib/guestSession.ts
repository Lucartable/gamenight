import {
  AVATAR_COLORS,
  createRandomAvatarConfig,
  getPlayerInitials,
  normalizeAvatarConfig,
  sanitizeHex,
  type AvatarConfig,
} from "./avatar";

export interface GuestSession {
  guestId: string;
  name: string;
  avatar: string;
  color: string;
  avatarStyle: AvatarConfig["avatarStyle"];
  avatarSeed: string;
  avatarOptions: AvatarConfig["avatarOptions"];
  avatarColor: string;
  createdAt: string;
}

const GUEST_SESSION_KEY = "badaboum_guest_session";
const LEGACY_CLIENT_ID_KEY = "gn_client_id";

export const GUEST_COLORS = AVATAR_COLORS;

const RANDOM_NAMES = [
  "Badaboom",
  "Popcorn",
  "Combo",
  "Buzzer",
  "Flash",
  "Disco",
  "Turbo",
  "Confetti",
];

export function getOrCreateGuestSession(): GuestSession {
  if (typeof window === "undefined") {
    return createGuestSession();
  }
  const stored = readStoredGuestSession();
  if (stored) {
    writeGuestSession(stored);
    return stored;
  }

  const legacyId = window.localStorage.getItem(LEGACY_CLIENT_ID_KEY);
  const session = createGuestSession(legacyId || undefined);
  writeGuestSession(session);
  window.localStorage.setItem(LEGACY_CLIENT_ID_KEY, session.guestId);
  return session;
}

export function saveGuestSession(patch: Partial<Omit<GuestSession, "guestId" | "createdAt">>): GuestSession {
  const current = getOrCreateGuestSession();
  const avatarConfig = normalizeAvatarConfig(
    {
      avatarStyle: patch.avatarStyle ?? current.avatarStyle,
      avatarSeed: patch.avatarSeed ?? current.avatarSeed,
      avatarOptions: patch.avatarOptions ?? current.avatarOptions,
      avatarColor: patch.avatarColor ?? patch.color ?? current.avatarColor,
    },
    patch.name ?? current.name
  );
  const next: GuestSession = {
    ...current,
    name: sanitizeGuestName(patch.name ?? current.name),
    avatar: sanitizeAvatar(patch.avatar ?? current.avatar, patch.name ?? current.name),
    color: sanitizeColor(patch.color ?? avatarConfig.avatarColor),
    avatarStyle: avatarConfig.avatarStyle,
    avatarSeed: avatarConfig.avatarSeed,
    avatarOptions: avatarConfig.avatarOptions,
    avatarColor: avatarConfig.avatarColor,
  };
  writeGuestSession(next);
  if (typeof window !== "undefined") window.localStorage.setItem(LEGACY_CLIENT_ID_KEY, next.guestId);
  return next;
}

export function getOrCreateGuestId(): string {
  return getOrCreateGuestSession().guestId;
}

export function createRandomGuestName(): string {
  const base = RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
  const suffix = Math.floor(10 + Math.random() * 90);
  return `${base}${suffix}`;
}

export function getNextGuestColor(current: string): string {
  const index = GUEST_COLORS.findIndex((color) => color === current);
  return GUEST_COLORS[(index + 1) % GUEST_COLORS.length];
}

export function sanitizeGuestName(name: string): string {
  const clean = name.trim().replace(/\s+/g, " ").slice(0, 24);
  return clean || createRandomGuestName();
}

function readStoredGuestSession(): GuestSession | null {
  try {
    const raw = window.localStorage.getItem(GUEST_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<GuestSession>;
    if (!parsed.guestId || typeof parsed.guestId !== "string") return null;
    return {
      guestId: parsed.guestId,
      name: sanitizeGuestName(parsed.name ?? ""),
      avatar: sanitizeAvatar(parsed.avatar, parsed.name),
      color: sanitizeColor(parsed.color),
      ...normalizeAvatarConfig(
        {
          avatarStyle: parsed.avatarStyle,
          avatarSeed: parsed.avatarSeed,
          avatarOptions: parsed.avatarOptions,
          avatarColor: parsed.avatarColor ?? parsed.color,
        },
        parsed.name ?? "badaboum"
      ),
      createdAt: typeof parsed.createdAt === "string" ? parsed.createdAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function createGuestSession(guestId = makeId()): GuestSession {
  const avatarConfig = createRandomAvatarConfig(guestId);
  return {
    guestId,
    name: createRandomGuestName(),
    avatar: "B",
    color: avatarConfig.avatarColor,
    avatarStyle: avatarConfig.avatarStyle,
    avatarSeed: avatarConfig.avatarSeed,
    avatarOptions: avatarConfig.avatarOptions,
    avatarColor: avatarConfig.avatarColor,
    createdAt: new Date().toISOString(),
  };
}

function writeGuestSession(session: GuestSession): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(GUEST_SESSION_KEY, JSON.stringify(session));
}

function sanitizeAvatar(value: unknown, fallbackName?: unknown): string {
  if (typeof value === "string" && value.trim().length > 0) return value.trim().slice(0, 8);
  return getPlayerInitials(typeof fallbackName === "string" ? fallbackName : "Badaboum").slice(0, 2);
}

function sanitizeColor(value: unknown): string {
  return sanitizeHex(value, "#ff3ea5");
}

function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `guest_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}
