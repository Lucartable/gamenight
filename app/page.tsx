"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { AvatarCustomizer } from "@/components/avatarCustomizer";
import { AudioToggle } from "@/components/audioToggle";
import { Button, Card, Chip, Input, Section } from "@/components/ui";
import { createRandomAvatarConfig, normalizeAvatarConfig, type AvatarConfig } from "@/lib/avatar";
import { playSfx, primeAudio } from "@/lib/audio";
import { getSupabase } from "@/lib/supabase";
import { useProfile } from "@/lib/useProfile";
import {
  getOrCreateGuestSession,
  saveGuestSession,
} from "@/lib/guestSession";
import {
  generateRoomCode,
  normalizeRoomCode,
} from "@/lib/utils";
import type { HostMode } from "@/types/database";

type Mode = "menu" | "guest" | "admin";

const GAME_TEASERS = [
  { title: "Qui pourrait ?", detail: "Accusations sociales, débats immédiats.", tag: "Social", tone: "pink" as const },
  { title: "Qui de nous ?", detail: "Pointe celui qui colle à la question.", tag: "Mindgame", tone: "cyan" as const },
  { title: "Majorité", detail: "Lis le groupe, marque des points.", tag: "Mindgame", tone: "yellow" as const },
  { title: "Minorité", detail: "Sois rare mais pas seul dans le vide.", tag: "Chaos", tone: "pink" as const },
  { title: "Mime", detail: "9 modes, des indices, du n'importe quoi.", tag: "Show", tone: "cyan" as const },
  { title: "Jauge", detail: "Note un joueur de 1 à 10, anonyme possible.", tag: "Rate", tone: "yellow" as const },
  { title: "L'Intrus", detail: "Un mot diffère. Qui est l'imposteur ?", tag: "Bluff", tone: "purple" as const },
];

export default function HomePage() {
  const router = useRouter();
  const profile = useProfile();
  const [mode, setMode] = useState<Mode>("menu");
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("");
  const [color, setColor] = useState("#ff3ea5");
  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig>(() => createRandomAvatarConfig("badaboum"));
  const [code, setCode] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState<HostMode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [authMessage, setAuthMessage] = useState<string | null>(null);

  useEffect(() => {
    const guest = getOrCreateGuestSession();
    setName(guest.name);
    setAvatar(guest.avatar);
    setColor(guest.color);
    setAvatarConfig(normalizeAvatarConfig({
      avatarStyle: guest.avatarStyle,
      avatarSeed: guest.avatarSeed,
      avatarOptions: guest.avatarOptions,
      avatarColor: guest.avatarColor,
    }, guest.name));
  }, []);

  async function handleCreate(hostMode: HostMode) {
    setError(null);
    primeAudio();
    playSfx("primary");
    const guest = saveGuestSession({
      name,
      avatar,
      color,
      avatarStyle: avatarConfig.avatarStyle,
      avatarSeed: avatarConfig.avatarSeed,
      avatarOptions: avatarConfig.avatarOptions,
      avatarColor: avatarConfig.avatarColor,
    });
    setName(guest.name);
    setAvatar(guest.avatar);
    setColor(guest.color);
    setAvatarConfig(normalizeAvatarConfig({
      avatarStyle: guest.avatarStyle,
      avatarSeed: guest.avatarSeed,
      avatarOptions: guest.avatarOptions,
      avatarColor: guest.avatarColor,
    }, guest.name));
    setCreating(hostMode);
    setLoading(true);
    try {
      const supabase = getSupabase();
      const userId = await getCurrentUserId();
      let roomId: string | null = null;
      let roomCode = "";
      for (let i = 0; i < 5 && !roomId; i++) {
        roomCode = generateRoomCode();
        const { data, error } = await supabase
          .from("rooms")
          .insert({
            code: roomCode,
            host_client_id: guest.guestId,
            created_by_guest_id: guest.guestId,
            created_by_user_id: userId,
            status: "lobby",
            host_mode: hostMode,
          })
          .select("id")
          .single();
        if (!error && data) roomId = data.id;
      }
      if (!roomId) throw new Error("Impossible de créer la salle. Réessaie.");

      if (hostMode === "classic") {
        const { error: pErr } = await supabase.from("players").insert({
          room_id: roomId,
          client_id: guest.guestId,
          guest_id: guest.guestId,
          auth_user_id: userId,
          name: guest.name,
          avatar: guest.avatar,
          color: guest.color,
          avatar_style: guest.avatarStyle,
          avatar_seed: guest.avatarSeed,
          avatar_options: guest.avatarOptions,
          avatar_color: guest.avatarColor,
          is_host: true,
        });
        if (pErr) throw pErr;
      }

      router.push(`/host/${roomCode}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue.");
      setLoading(false);
      setCreating(null);
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    primeAudio();
    playSfx("validate");
    const guest = saveGuestSession({
      name,
      avatar,
      color,
      avatarStyle: avatarConfig.avatarStyle,
      avatarSeed: avatarConfig.avatarSeed,
      avatarOptions: avatarConfig.avatarOptions,
      avatarColor: avatarConfig.avatarColor,
    });
    setName(guest.name);
    setAvatar(guest.avatar);
    setColor(guest.color);
    setAvatarConfig(normalizeAvatarConfig({
      avatarStyle: guest.avatarStyle,
      avatarSeed: guest.avatarSeed,
      avatarOptions: guest.avatarOptions,
      avatarColor: guest.avatarColor,
    }, guest.name));
    const cleanCode = normalizeRoomCode(code);
    if (!cleanCode) return setError("Entre un code de salle.");

    setLoading(true);
    try {
      const supabase = getSupabase();
      const userId = await getCurrentUserId();
      const { data: room, error: rErr } = await supabase
        .from("rooms")
        .select("id, status")
        .eq("code", cleanCode)
        .maybeSingle();

      if (rErr) throw rErr;
      if (!room) throw new Error("Aucune salle trouvée avec ce code.");

      const { error: pErr } = await supabase
        .from("players")
        .upsert(
          {
            room_id: room.id,
            client_id: guest.guestId,
            guest_id: guest.guestId,
            auth_user_id: userId,
            name: guest.name,
            avatar: guest.avatar,
            color: guest.color,
            avatar_style: guest.avatarStyle,
            avatar_seed: guest.avatarSeed,
            avatar_options: guest.avatarOptions,
            avatar_color: guest.avatarColor,
            is_host: false,
            last_seen_at: new Date().toISOString(),
          },
          { onConflict: "room_id,client_id" }
        );
      if (pErr) throw pErr;

      router.push(`/play/${cleanCode}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue.");
      setLoading(false);
    }
  }

  async function handleAdminLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setAuthMessage(null);
    setLoading(true);
    primeAudio();
    try {
      const result = await profile.signInWithPassword(adminEmail, adminPassword);
      if (result) throw new Error(result);
      await profile.refresh();
      playSfx("validate");
      setAuthMessage("Connecté en admin. Tu peux jouer ou ouvrir la bibliothèque.");
      setMode("menu");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connexion impossible.");
    } finally {
      setLoading(false);
    }
  }

  const showAdminBadge = !profile.loading && profile.canManageQuestions;
  const showAdminLink = !profile.loading && !profile.userEmail && mode !== "admin";

  return (
    <main className="home-stage min-h-dvh px-4 pb-8 pt-3 text-white sm:px-5 sm:pt-5">
      <div className="home-grid" aria-hidden="true" />
      <div className="relative z-10 mx-auto flex min-h-[calc(100dvh-2rem)] max-w-md flex-col gap-5">
        <nav className="app-navbar safe-area-pt" aria-label="Navigation principale">
          <Link href="/" className="app-navbar-brand">
            <span className="app-navbar-brand-mark">B</span>
            Badaboum
          </Link>
          <div className="app-navbar-actions">
            <AudioToggle compact />
            <Link
              href="/questions"
              className="app-navbar-link"
              onClick={() => playSfx("click")}
              aria-label="Bibliothèque"
              title={showAdminBadge ? "Bibliothèque" : "Bibliothèque (réservée aux admins)"}
            >
              <span aria-hidden="true">📚</span>
              <span className="app-navbar-link-label">Bibliothèque</span>
            </Link>
            {showAdminBadge ? (
              <button
                type="button"
                className="app-navbar-button"
                onClick={() => {
                  primeAudio();
                  void profile.signOut();
                }}
                aria-label="Se déconnecter"
              >
                <span aria-hidden="true">⏻</span>
                <span className="app-navbar-link-label">Logout</span>
              </button>
            ) : showAdminLink ? (
              <button
                type="button"
                className="app-navbar-button"
                onClick={() => {
                  primeAudio();
                  setMode("admin");
                }}
                aria-label="Connexion admin"
              >
                <span aria-hidden="true">🔐</span>
                <span className="app-navbar-link-label">Admin</span>
              </button>
            ) : null}
          </div>
        </nav>

        {mode === "menu" && (
          <>
            <HomeHero adminConnected={showAdminBadge} adminLabel={profile.isAdmin ? "Admin" : "Trusted"} />

            {profile.loading ? (
              <Card variant="default" padding="md" className="animate-slideUp">
                <Chip tone="cyan">Session</Chip>
                <h2 className="mt-2 text-xl font-black">Vérification admin…</h2>
              </Card>
            ) : (
              <Card variant="default" padding="md" className="animate-slideUp">
                {authMessage && (
                  <p className="mb-3 rounded-2xl border border-neon-green/30 bg-neon-green/10 p-3 text-center text-sm font-bold text-neon-green">
                    {authMessage}
                  </p>
                )}
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  trailing={<Chip tone="yellow" size="sm">INSTANT</Chip>}
                  onClick={() => {
                    primeAudio();
                    playSfx("click");
                    setMode("guest");
                  }}
                >
                  Jouer en invité
                </Button>
              </Card>
            )}

            {!profile.loading && (
              <Section
                eyebrow="Modes prêts"
                trailing={<Chip tone="neutral" size="sm">mobile + TV</Chip>}
                spacing="tight"
              >
                <div className="grid gap-2">
                  {GAME_TEASERS.map((game, index) => (
                    <Card
                      key={game.title}
                      variant="interactive"
                      padding="sm"
                      className="flex items-center justify-between gap-3 animate-slideUp"
                      style={{ animationDelay: `${Math.min(index, 8) * 50}ms` }}
                    >
                      <div className="min-w-0">
                        <div className="truncate text-base font-black">{game.title}</div>
                        <div className="mt-0.5 truncate text-xs font-medium text-white/55">{game.detail}</div>
                      </div>
                      <Chip tone={game.tone} size="sm">{game.tag}</Chip>
                    </Card>
                  ))}
                </div>
              </Section>
            )}
          </>
        )}

        {mode === "guest" && (
          <HomeFormShell title="Jouer en invité" subtitle="Pseudo, avatar et c'est parti. Aucun compte requis.">
            <div className="space-y-4">
              <GuestIdentityPicker
                name={name}
                avatarConfig={avatarConfig}
                onNameChange={setName}
                onAvatarChange={(next) => {
                  setAvatarConfig(next);
                  setColor(next.avatarColor);
                  const saved = saveGuestSession({
                    name,
                    color: next.avatarColor,
                    avatarStyle: next.avatarStyle,
                    avatarSeed: next.avatarSeed,
                    avatarOptions: next.avatarOptions,
                    avatarColor: next.avatarColor,
                  });
                  setAvatar(saved.avatar);
                  playSfx("avatarPick");
                }}
                onColorChange={(nextColor) => {
                  setColor(nextColor);
                  setAvatarConfig((current) => ({ ...current, avatarColor: nextColor }));
                  saveGuestSession({ name, color: nextColor, avatarColor: nextColor });
                }}
              />
              {error && (
                <p className="rounded-2xl border border-neon-pink/40 bg-neon-pink/10 p-3 text-sm font-bold text-neon-pink">
                  {error}
                </p>
              )}

              <div className="grid gap-3">
                <ModeChoiceButton
                  tone="pink"
                  badge="Classique"
                  title="Lancer une partie"
                  detail="Tu joues aussi. Idéal entre amis sans TV."
                  loading={creating === "classic" && loading}
                  disabled={loading}
                  onClick={() => void handleCreate("classic")}
                />
                <ModeChoiceButton
                  tone="cyan"
                  badge="Mode TV"
                  title="Lancer en mode TV"
                  detail="Cet écran devient l'affichage principal. Les phones jouent."
                  loading={creating === "tv" && loading}
                  disabled={loading}
                  onClick={() => void handleCreate("tv")}
                />
              </div>

              <form onSubmit={handleJoin} className="grid gap-3 pt-1">
                <Input
                  inputSize="lg"
                  className="uppercase tracking-widest"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="CODE DE SALLE"
                  maxLength={10}
                />
                <Button type="submit" variant="secondary" size="lg" fullWidth disabled={loading}>
                  {loading ? "Connexion…" : "Rejoindre une salle existante"}
                </Button>
              </form>
              <Button type="button" variant="ghost" size="md" fullWidth onClick={() => setMode("menu")}>
                Retour
              </Button>
            </div>
          </HomeFormShell>
        )}

        {mode === "admin" && (
          <HomeFormShell title="Connexion admin" subtitle="Réservé aux comptes trusted/admin.">
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <Input
                autoFocus
                inputSize="lg"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="Email"
                type="email"
              />
              <Input
                inputSize="lg"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Mot de passe"
                type="password"
              />
              {error && (
                <p className="rounded-2xl border border-neon-pink/40 bg-neon-pink/10 p-3 text-sm font-bold text-neon-pink">
                  {error}
                </p>
              )}
              <Button type="submit" variant="primary" size="lg" fullWidth disabled={loading}>
                {loading ? "Connexion…" : "Se connecter"}
              </Button>
              <Button type="button" variant="ghost" size="md" fullWidth onClick={() => setMode("menu")}>
                Retour
              </Button>
            </form>
          </HomeFormShell>
        )}
      </div>
    </main>
  );
}

function ModeChoiceButton({
  tone,
  badge,
  title,
  detail,
  loading,
  disabled,
  onClick,
}: {
  tone: "pink" | "cyan";
  badge: string;
  title: string;
  detail: string;
  loading?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  const toneRing = tone === "pink" ? "border-neon-pink/45 hover:shadow-glow-pink" : "border-neon-cyan/45 hover:shadow-glow-cyan";
  const toneAura = tone === "pink"
    ? "from-neon-pink/18 via-neon-purple/10 to-transparent"
    : "from-neon-cyan/18 via-neon-purple/10 to-transparent";
  const toneTxt = tone === "pink" ? "text-neon-pink" : "text-neon-cyan";
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`focus-ring relative isolate overflow-hidden rounded-2xl border ${toneRing} bg-surface-2/80 p-4 text-left transition-all duration-200 ease-out-soft hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60`}
      style={{ backgroundClip: "padding-box" }}
    >
      <span className={`pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br ${toneAura}`} aria-hidden="true" />
      <span className="absolute right-3 top-3">
        <Chip tone={tone} size="sm">{badge}</Chip>
      </span>
      <div className="text-lg font-black">{title}</div>
      <div className="mt-1 text-xs font-semibold text-white/65">{detail}</div>
      {loading && <div className={`mt-2 text-xs font-semibold ${toneTxt}`}>Préparation…</div>}
    </button>
  );
}

function HomeHero({ adminConnected, adminLabel }: { adminConnected: boolean; adminLabel: string }) {
  return (
    <header className="home-hero relative overflow-hidden rounded-2xl border border-white/12 surface-hero p-5 text-center">
      <div className="relative z-10 flex flex-col items-center gap-3">
        <Chip tone="cyan" size="sm">Party games — calibrés soirée</Chip>
        <h1 className="text-brand text-5xl font-black leading-none sm:text-6xl">Badaboum</h1>
        <p className="mx-auto max-w-xs text-sm font-semibold text-white/70">
          Votes, mimes, accusations amicales et bilans qui restent dans les mémoires.
        </p>
        {adminConnected && (
          <Chip tone="green" size="sm">{adminLabel} connecté</Chip>
        )}
      </div>
    </header>
  );
}

function GuestIdentityPicker({
  name,
  avatarConfig,
  onNameChange,
  onAvatarChange,
  onColorChange,
}: {
  name: string;
  avatarConfig: AvatarConfig;
  onNameChange: (value: string) => void;
  onAvatarChange: (value: AvatarConfig) => void;
  onColorChange: (value: string) => void;
}) {
  return (
    <Card variant="subtle" padding="sm">
      <Input
        inputSize="lg"
        value={name}
        onChange={(e) => {
          onNameChange(e.target.value);
          saveGuestSession({ name: e.target.value });
        }}
        placeholder="Ton pseudo"
        maxLength={24}
      />
      <div className="mt-3">
        <AvatarCustomizer
          name={name}
          config={avatarConfig}
          onChange={onAvatarChange}
          onColorChange={onColorChange}
        />
      </div>
    </Card>
  );
}

async function getCurrentUserId(): Promise<string | null> {
  const { data } = await getSupabase().auth.getUser();
  return (data.user as User | null)?.id ?? null;
}

function HomeFormShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <Card variant="default" padding="lg" className="animate-slideUp">
      <div className="mb-5">
        <Chip tone="yellow" size="sm">Badaboum</Chip>
        <h2 className="mt-2 text-2xl sm:text-3xl font-black">{title}</h2>
        <p className="mt-2 text-sm font-medium text-white/55">{subtitle}</p>
      </div>
      {children}
    </Card>
  );
}
