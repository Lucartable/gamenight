"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { AvatarCustomizer } from "@/components/avatarCustomizer";
import { AudioToggle } from "@/components/audioToggle";
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
  { title: "Tu préfères", detail: "Choix rapides, débats immédiats.", tag: "Duel" },
  { title: "Qui de nous ?", detail: "Accusations sociales en douceur.", tag: "Social" },
  { title: "Majorité", detail: "Lis le groupe, marque des points.", tag: "Mindgame" },
  { title: "Minorité", detail: "Sois rare, mais pas seul dans le vide.", tag: "Chaos" },
  { title: "Mime les expressions", detail: "Un ordre auto, des grands gestes.", tag: "Show" },
  { title: "Jauge", detail: "Note un joueur de 1 à 10.", tag: "Rate" },
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
      setAuthMessage("Connecté en admin. Tu peux jouer normalement ou ouvrir la bibliothèque.");
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
    <main className="home-stage min-h-dvh px-5 py-5 text-white">
      <div className="home-grid" aria-hidden="true" />
      <div className="relative z-10 mx-auto flex min-h-[calc(100dvh-2.5rem)] max-w-md flex-col gap-5">
        <nav className="app-navbar" aria-label="Navigation principale">
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

        <header className="home-hero pt-2 text-center">
          <div className="text-xs font-black uppercase tracking-wider text-neon-cyan">party games calibrés soirée</div>
          <h1 className="home-brand mt-2 text-6xl font-black leading-none">Badaboum</h1>
          <p className="mx-auto mt-3 max-w-xs text-sm font-semibold text-white/65">
            Votes, mimes, accusations amicales et bilans de fin qui restent dans les mémoires.
          </p>
          {showAdminBadge && (
            <div className="mt-3">
              <span className="app-navbar-chip">{profile.isAdmin ? "Admin" : "Trusted"} connecté</span>
            </div>
          )}
        </header>

        {mode === "menu" && (
          <>
            {profile.loading && (
              <section className="home-action-panel mb-1 p-5">
                <div className="text-xs font-black uppercase tracking-wider text-neon-cyan">Session</div>
                <h2 className="mt-2 text-2xl font-black">Vérification admin...</h2>
              </section>
            )}

            {!profile.loading && (
              <section className="home-action-panel p-5">
                {authMessage && (
                  <p className="mb-3 rounded-2xl border border-neon-green/30 bg-neon-green/10 p-3 text-center text-sm font-bold text-neon-green">
                    {authMessage}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => {
                    primeAudio();
                    playSfx("click");
                    setMode("guest");
                  }}
                  className="home-primary-action w-full"
                >
                  <span>Jouer en invité</span>
                  <span className="home-action-key">INSTANT</span>
                </button>
              </section>
            )}

            {!profile.loading && (
              <section>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-black uppercase tracking-wider text-white/50">Modes prêts</h2>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-white/55">
                    mobile first
                  </span>
                </div>
                <div className="grid gap-2">
                  {GAME_TEASERS.map((game, index) => (
                    <article key={game.title} className="home-game-row" style={{ animationDelay: `${index * 70}ms` }}>
                      <div className="min-w-0">
                        <div className="truncate text-base font-black">{game.title}</div>
                        <div className="mt-0.5 truncate text-xs font-medium text-white/50">{game.detail}</div>
                      </div>
                      <span className="home-game-tag">{game.tag}</span>
                    </article>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {mode === "guest" && (
          <HomeFormShell title="Jouer en invité" subtitle="Pseudo, code éventuel, et c'est parti. Aucun compte requis.">
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
              {error && <p className="rounded-2xl border border-neon-pink/40 bg-neon-pink/10 p-3 text-sm font-bold text-neon-pink">{error}</p>}

              <div className="home-mode-grid">
                <button
                  type="button"
                  disabled={loading}
                  className="home-mode-card is-classic"
                  onClick={() => {
                    void handleCreate("classic");
                  }}
                >
                  <span className="home-mode-pill">Classique</span>
                  <span className="home-mode-title">Lancer une partie</span>
                  <span className="home-mode-detail">Tu joues aussi. Idéal entre amis sans TV.</span>
                  {creating === "classic" && loading && <span className="home-mode-detail">Création en cours...</span>}
                </button>
                <button
                  type="button"
                  disabled={loading}
                  className="home-mode-card is-tv"
                  onClick={() => {
                    void handleCreate("tv");
                  }}
                >
                  <span className="home-mode-pill">Mode TV</span>
                  <span className="home-mode-title">Lancer en mode TV</span>
                  <span className="home-mode-detail">Cet écran devient l&apos;affichage principal. Tes potes jouent depuis leur tel.</span>
                  {creating === "tv" && loading && <span className="home-mode-detail">Préparation du studio...</span>}
                </button>
              </div>

              <form onSubmit={handleJoin} className="grid gap-3">
                <input
                  className="input uppercase tracking-widest"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="CODE DE SALLE"
                  maxLength={10}
                />
                <button disabled={loading} className="btn-secondary w-full" type="submit">
                  {loading ? "Connexion..." : "Rejoindre une salle existante"}
                </button>
              </form>
              <button
                type="button"
                onClick={() => setMode("menu")}
                className="btn-ghost w-full"
              >
                Retour
              </button>
            </div>
          </HomeFormShell>
        )}

        {mode === "admin" && (
          <HomeFormShell title="Connexion admin" subtitle="Réservé aux comptes trusted/admin : bibliothèque, packs, modération.">
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <input
                autoFocus
                className="input"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="Email"
                type="email"
              />
              <input
                className="input"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Mot de passe"
                type="password"
              />
              {error && <p className="rounded-2xl border border-neon-pink/40 bg-neon-pink/10 p-3 text-sm font-bold text-neon-pink">{error}</p>}
              <button disabled={loading} className="btn-primary w-full" type="submit">
                {loading ? "Connexion..." : "Se connecter"}
              </button>
              <button type="button" onClick={() => setMode("menu")} className="btn-ghost w-full">
                Retour
              </button>
            </form>
          </HomeFormShell>
        )}
      </div>
    </main>
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
    <div className="rounded-[24px] border border-white/10 bg-white/5 p-3">
      <div className="flex items-center gap-3">
        <input
          className="input min-w-0 flex-1"
          value={name}
          onChange={(e) => {
            onNameChange(e.target.value);
            saveGuestSession({ name: e.target.value });
          }}
          placeholder="Ton pseudo"
          maxLength={24}
        />
      </div>
      <div className="mt-3">
        <AvatarCustomizer
          name={name}
          config={avatarConfig}
          onChange={onAvatarChange}
          onColorChange={onColorChange}
        />
      </div>
    </div>
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
    <section className="home-action-panel p-5 animate-reveal-in">
      <div className="mb-5">
        <div className="text-xs font-black uppercase tracking-wider text-neon-yellow">Badaboum</div>
        <h2 className="mt-1 text-3xl font-black">{title}</h2>
        <p className="mt-2 text-sm font-medium text-white/55">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}
