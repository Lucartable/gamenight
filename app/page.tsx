"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { AdminStatusBar } from "@/components/adminStatus";
import { getSupabase } from "@/lib/supabase";
import { useProfile } from "@/lib/useProfile";
import {
  GUEST_COLORS,
  getNextGuestAvatar,
  getOrCreateGuestSession,
  saveGuestSession,
} from "@/lib/guestSession";
import {
  generateRoomCode,
  normalizeRoomCode,
} from "@/lib/utils";

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
  const [avatar, setAvatar] = useState("B");
  const [color, setColor] = useState("#ff3ea5");
  const [code, setCode] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authMessage, setAuthMessage] = useState<string | null>(null);

  useEffect(() => {
    const guest = getOrCreateGuestSession();
    setName(guest.name);
    setAvatar(guest.avatar);
    setColor(guest.color);
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const guest = saveGuestSession({ name, avatar, color });
    setName(guest.name);
    setAvatar(guest.avatar);
    setColor(guest.color);
    setLoading(true);
    try {
      const supabase = getSupabase();
      const userId = await getCurrentUserId();

      // On retente quelques fois en cas de collision de code (très rare).
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
          })
          .select("id")
          .single();
        if (!error && data) roomId = data.id;
      }
      if (!roomId) throw new Error("Impossible de créer la salle. Réessaie.");

      const { error: pErr } = await supabase.from("players").insert({
        room_id: roomId,
        client_id: guest.guestId,
        guest_id: guest.guestId,
        auth_user_id: userId,
        name: guest.name,
        avatar: guest.avatar,
        color: guest.color,
        is_host: true,
      });
      if (pErr) throw pErr;

      router.push(`/host/${roomCode}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue.");
      setLoading(false);
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const guest = saveGuestSession({ name, avatar, color });
    setName(guest.name);
    setAvatar(guest.avatar);
    setColor(guest.color);
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
      // upsert : si on rejoint deux fois (refresh), on met juste à jour le nom.
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
    try {
      const result = await profile.signInWithPassword(adminEmail, adminPassword);
      if (result) throw new Error(result);
      await profile.refresh();
      setAuthMessage("Connecté en admin. Tu peux jouer normalement ou ouvrir la bibliothèque.");
      setMode("menu");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connexion impossible.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="home-stage min-h-dvh px-5 py-6 text-white">
      <div className="home-grid" aria-hidden="true" />
      <div className="relative z-10 mx-auto flex min-h-[calc(100dvh-3rem)] max-w-md flex-col">
        <AdminStatusBar
          userEmail={profile.userEmail}
          role={profile.role}
          canManageQuestions={profile.canManageQuestions}
          loading={profile.loading || loading}
          onSignOut={() => void profile.signOut()}
          onAdminClick={() => {
            setError(null);
            setAuthMessage(null);
            setMode("admin");
          }}
        />

        <header className="home-hero pt-6 text-center">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-[28px] border border-neon-yellow/40 bg-neon-yellow/10 shadow-glow">
            <span className="home-burst-mark">B</span>
          </div>
          <div className="text-xs font-black uppercase tracking-wider text-neon-cyan">party games calibrés soirée</div>
          <h1 className="home-brand mt-2 text-6xl font-black leading-none">Badaboum</h1>
          <p className="mx-auto mt-4 max-w-xs text-sm font-semibold text-white/65">
            Votes, mimes, accusations amicales et bilans de fin qui restent dans les mémoires.
          </p>
        </header>

        {mode === "menu" && (
          <div className="mt-8 flex flex-1 flex-col">
            <section className="home-action-panel p-3">
              {authMessage && (
                <p className="mb-3 rounded-2xl border border-neon-green/30 bg-neon-green/10 p-3 text-center text-sm font-bold text-neon-green">
                  {authMessage}
                </p>
              )}
              <button
                type="button"
                onClick={() => setMode("guest")}
                className="home-primary-action w-full"
              >
                <span>Jouer en invité</span>
                <span className="home-action-key">INSTANT</span>
              </button>
              {!profile.userEmail && (
                <button
                  type="button"
                  onClick={() => setMode("admin")}
                  className="home-admin-action mt-3 w-full"
                >
                  <span>Connexion admin</span>
                  <span className="home-action-key">TRUSTED</span>
                </button>
              )}
              {profile.canManageQuestions && (
                <Link href="/questions" className="btn-secondary mt-3 w-full">
                  Ouvrir la bibliothèque
                </Link>
              )}
            </section>

            <section className="mt-5">
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
          </div>
        )}

        {mode === "guest" && (
          <HomeFormShell title="Jouer en invité" subtitle="Pseudo, code éventuel, et c'est parti. Aucun compte requis.">
            <div className="space-y-4">
              <GuestIdentityPicker
                name={name}
                avatar={avatar}
                color={color}
                onNameChange={setName}
                onAvatarChange={() => setAvatar((current) => getNextGuestAvatar(current))}
                onColorChange={setColor}
              />
              {error && <p className="rounded-2xl border border-neon-pink/40 bg-neon-pink/10 p-3 text-sm font-bold text-neon-pink">{error}</p>}
              <form onSubmit={handleCreate}>
                <button disabled={loading} className="btn-primary w-full" type="submit">
                  {loading ? "Création..." : "Créer une salle"}
                </button>
              </form>
              <form onSubmit={handleJoin} className="grid gap-3">
                <input
                  className="input uppercase tracking-widest"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="CODE DE SALLE"
                  maxLength={10}
                />
                <button disabled={loading} className="btn-secondary w-full" type="submit">
                  {loading ? "Connexion..." : "Rejoindre"}
                </button>
              </form>
              <button type="button" onClick={() => setMode("menu")} className="btn-ghost w-full">
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
              <Link href="/questions" className="btn-ghost w-full">Ouvrir la bibliothèque</Link>
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
  avatar,
  color,
  onNameChange,
  onAvatarChange,
  onColorChange,
}: {
  name: string;
  avatar: string;
  color: string;
  onNameChange: (value: string) => void;
  onAvatarChange: () => void;
  onColorChange: (value: string) => void;
}) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/5 p-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onAvatarChange}
          className="guest-avatar-button"
          style={{ background: `linear-gradient(135deg, ${color}, rgba(34, 211, 238, 0.72))` }}
          aria-label="Changer d'avatar"
        >
          {avatar}
        </button>
        <input
          className="input min-w-0 flex-1"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Ton pseudo"
          maxLength={24}
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {GUEST_COLORS.map((swatch) => (
          <button
            key={swatch}
            type="button"
            aria-label={`Couleur ${swatch}`}
            onClick={() => onColorChange(swatch)}
            className={`h-9 w-9 rounded-2xl border transition-transform active:scale-95 ${color === swatch ? "border-white scale-105" : "border-white/15"}`}
            style={{ background: swatch }}
          />
        ))}
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
    <section className="home-action-panel mt-8 p-5 animate-reveal-in">
      <div className="mb-5">
        <div className="text-xs font-black uppercase tracking-wider text-neon-yellow">Badaboum</div>
        <h2 className="mt-1 text-3xl font-black">{title}</h2>
        <p className="mt-2 text-sm font-medium text-white/55">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}
