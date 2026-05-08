"use client";

import Link from "next/link";
import type { UserRole } from "@/types/database";

export function AdminStatusBar({
  userEmail,
  role,
  canManageQuestions,
  loading,
  onSignOut,
  onAdminClick,
  compact = false,
}: {
  userEmail: string | null;
  role: UserRole;
  canManageQuestions: boolean;
  loading: boolean;
  onSignOut: () => void;
  onAdminClick?: () => void;
  compact?: boolean;
}) {
  const connected = Boolean(userEmail);
  const roleLabel = role === "admin" ? "Admin" : role === "trusted" ? "Trusted" : "Connecté";

  return (
    <section className={`mb-4 rounded-[22px] border border-white/10 bg-black/25 p-3 text-white shadow-2xl backdrop-blur ${compact ? "" : "animate-reveal-in"}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        {loading ? (
          <div>
            <div className="text-sm font-black">Vérification de la session admin...</div>
            <div className="mt-1 text-xs font-semibold text-white/50">
              On garde le jeu prêt pendant que Supabase Auth répond.
            </div>
          </div>
        ) : connected ? (
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-neon-green/40 bg-neon-green/15 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-neon-green">
                {roleLabel}
              </span>
              <span className="truncate text-sm font-black">
                {role === "admin" ? "Connecté en tant qu'admin" : "Connecté"}
              </span>
            </div>
            <div className="mt-1 truncate text-xs font-semibold text-white/50">{userEmail}</div>
          </div>
        ) : (
          <div>
            <div className="text-sm font-black">Mode invité disponible</div>
            <div className="mt-1 text-xs font-semibold text-white/50">
              Connecte-toi seulement pour gérer la bibliothèque.
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {!loading && !connected && (
            onAdminClick ? (
              <button type="button" onClick={onAdminClick} disabled={loading} className="btn-ghost px-3 py-2 text-xs">
                Connexion admin
              </button>
            ) : (
              <Link href="/" className="btn-ghost px-3 py-2 text-xs">
                Connexion admin
              </Link>
            )
          )}
          {connected && canManageQuestions && (
            <Link href="/questions" className="btn-secondary px-3 py-2 text-xs">
              Bibliothèque
            </Link>
          )}
          <Link href="/" className="btn-ghost px-3 py-2 text-xs">
            Accueil
          </Link>
          {connected && (
            <button type="button" onClick={onSignOut} className="btn-ghost px-3 py-2 text-xs">
              Se déconnecter
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
