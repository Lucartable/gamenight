export interface GuestSession {
  guestId: string;
  name: string;
  avatar: string;
  color: string;
  createdAt: string;
}

const GUEST_SESSION_KEY = "badaboum_guest_session";
const LEGACY_CLIENT_ID_KEY = "gn_client_id";

export const GUEST_AVATARS = ["B", "BOOM", "WOW", "HEY", "GO", "10", "GG", "??"] as const;
export const GUEST_COLORS = ["#ff3ea5", "#22d3ee", "#facc15", "#4ade80", "#a855f7", "#fb7185", "#38bdf8", "#f97316"] as const;

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
  if (stored) return stored;

  const legacyId = window.localStorage.getItem(LEGACY_CLIENT_ID_KEY);
  const session = createGuestSession(legacyId || undefined);
  writeGuestSession(session);
  window.localStorage.setItem(LEGACY_CLIENT_ID_KEY, session.guestId);
  return session;
}

export function saveGuestSession(patch: Partial<Omit<GuestSession, "guestId" | "createdAt">>): GuestSession {
  const current = getOrCreateGuestSession();
  const next: GuestSession = {
    ...current,
    name: sanitizeGuestName(patch.name ?? current.name),
    avatar: sanitizeAvatar(patch.avatar ?? current.avatar),
    color: sanitizeColor(patch.color ?? current.color),
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

export function getNextGuestAvatar(current: string): string {
  const index = GUEST_AVATARS.findIndex((avatar) => avatar === current);
  return GUEST_AVATARS[(index + 1) % GUEST_AVATARS.length];
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
      avatar: sanitizeAvatar(parsed.avatar),
      color: sanitizeColor(parsed.color),
      createdAt: typeof parsed.createdAt === "string" ? parsed.createdAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function createGuestSession(guestId = makeId()): GuestSession {
  return {
    guestId,
    name: createRandomGuestName(),
    avatar: GUEST_AVATARS[Math.floor(Math.random() * GUEST_AVATARS.length)],
    color: GUEST_COLORS[Math.floor(Math.random() * GUEST_COLORS.length)],
    createdAt: new Date().toISOString(),
  };
}

function writeGuestSession(session: GuestSession): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(GUEST_SESSION_KEY, JSON.stringify(session));
}

function sanitizeAvatar(value: unknown): string {
  return typeof value === "string" && value.trim().length > 0 ? value.trim().slice(0, 8) : "B";
}

function sanitizeColor(value: unknown): string {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value) ? value : "#ff3ea5";
}

function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `guest_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}
