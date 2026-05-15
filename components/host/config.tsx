"use client";

import { type ReactNode } from "react";
import { Button } from "@/components/ui";
import type { GameType, QuestionSourceSettings } from "@/types/database";

export interface QuestionPackChoice {
  id: string;
  name: string;
  compatibleCount: number;
  gameCounts: Partial<Record<GameType, number>>;
}

export function ConfigGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mb-4">
      <div className="mb-2 text-xs font-bold uppercase tracking-wider text-white/50">{label}</div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export function ConfigButton({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-xl border px-4 py-2 text-sm font-bold transition disabled:opacity-50 ${
        active
          ? "border-neon-pink bg-neon-pink/20 text-white shadow-glow-pink"
          : "border-white/10 bg-white/5 text-white/70 hover:border-white/20"
      }`}
    >
      {children}
    </button>
  );
}

export function OrderModeButton({
  active,
  disabled,
  title,
  subtitle,
  onClick,
}: {
  active: boolean;
  disabled: boolean;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-2xl border p-4 text-left transition disabled:opacity-50 ${
        active
          ? "border-neon-cyan bg-neon-cyan/10 shadow-glow-cyan"
          : "border-white/10 bg-white/5 hover:border-white/20"
      }`}
    >
      <div className="font-black">{title}</div>
      <div className="mt-1 text-xs text-white/50">{subtitle}</div>
    </button>
  );
}

export function SourceToggle({
  active,
  label,
  detail,
  disabled = false,
  onClick,
}: {
  active: boolean;
  label: string;
  detail: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-2xl border p-4 text-left transition-transform duration-200 will-change-transform active:scale-[0.98] disabled:opacity-40 ${
        active ? "border-neon-green/50 bg-neon-green/10" : "border-white/10 bg-white/5 text-white/70"
      }`}
    >
      <div className="font-black">{label}</div>
      <div className="mt-1 text-xs text-white/50">{detail}</div>
    </button>
  );
}

export function QuestionSourcePanel({
  settings,
  canUseSavedQuestions,
  savedQuestionCount,
  packQuestionCount,
  packChoices = [],
  liveQuestionCount,
  validLiveQuestionCount,
  totalQuestions,
  onChange,
  onUseAllLiveQuestions,
  onTogglePack,
}: {
  settings: QuestionSourceSettings;
  canUseSavedQuestions: boolean;
  savedQuestionCount: number;
  packQuestionCount?: number;
  packChoices?: QuestionPackChoice[];
  liveQuestionCount: number;
  validLiveQuestionCount?: number;
  totalQuestions?: number;
  onChange: (settings: QuestionSourceSettings) => void;
  onUseAllLiveQuestions?: (count: number) => void;
  onTogglePack?: (packId: string) => void;
}) {
  const patch = (next: Partial<QuestionSourceSettings>) => onChange({ ...settings, ...next });
  const coverageLiveCount = validLiveQuestionCount ?? liveQuestionCount;
  const liveOverflow = totalQuestions ? Math.max(0, coverageLiveCount - totalQuestions) : 0;
  const showLiveCoverage = settings.useLiveQuestions && typeof totalQuestions === "number";

  return (
    <section className="card mb-4 p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-black uppercase tracking-wider text-neon-cyan">Moteur de questions</div>
          <h2 className="text-xl font-black">Sources et mix intelligent</h2>
        </div>
        {canUseSavedQuestions && <a href="/questions" className="btn-ghost text-neon-cyan">Bibliothèque</a>}
      </div>

      <ConfigGroup label="Mode">
        <ConfigButton active={settings.mode === "system_only"} disabled={false} onClick={() => patch({ mode: "system_only", useSystemQuestions: true, useLiveQuestions: false, useSavedQuestions: false })}>
          Système uniquement
        </ConfigButton>
        <ConfigButton active={settings.mode === "players_only"} disabled={false} onClick={() => patch({ mode: "players_only", useSystemQuestions: false, useLiveQuestions: true })}>
          Joueurs uniquement
        </ConfigButton>
        <ConfigButton active={settings.mode === "saved_only"} disabled={!canUseSavedQuestions} onClick={() => patch({ mode: "saved_only", useSystemQuestions: false, useLiveQuestions: false, useSavedQuestions: true })}>
          Sauvegardées uniquement
        </ConfigButton>
        <ConfigButton active={settings.mode === "smart_mix"} disabled={false} onClick={() => patch({ mode: "smart_mix", useSystemQuestions: true, useLiveQuestions: true })}>
          Mix système + joueurs
        </ConfigButton>
        <ConfigButton active={settings.mode === "all_mix"} disabled={!canUseSavedQuestions} onClick={() => patch({ mode: "all_mix", useSystemQuestions: true, useLiveQuestions: true, usePackQuestions: settings.usePackQuestions, useSavedQuestions: true })}>
          Tout mixer
        </ConfigButton>
      </ConfigGroup>

      <div className="grid gap-2 sm:grid-cols-4">
        <SourceToggle active={settings.useSystemQuestions} label="Questions système" detail="Base Badaboum" onClick={() => patch({ mode: "smart_mix", useSystemQuestions: !settings.useSystemQuestions })} />
        <SourceToggle active={settings.useLiveQuestions} label="Questions live" detail={`${liveQuestionCount} proposée${liveQuestionCount > 1 ? "s" : ""}`} onClick={() => patch({ mode: "smart_mix", useLiveQuestions: !settings.useLiveQuestions })} />
        <SourceToggle
          active={settings.usePackQuestions}
          label="Packs"
          detail={canUseSavedQuestions ? `${packQuestionCount ?? 0} compatible${(packQuestionCount ?? 0) > 1 ? "s" : ""}` : "Trusted/admin"}
          disabled={!canUseSavedQuestions}
          onClick={() => patch({ mode: "smart_mix", usePackQuestions: !settings.usePackQuestions })}
        />
        <SourceToggle
          active={settings.useSavedQuestions}
          label="Sauvegardées"
          detail={canUseSavedQuestions ? `${savedQuestionCount} dispo` : "Trusted/admin"}
          disabled={!canUseSavedQuestions}
          onClick={() => patch({ mode: "smart_mix", useSavedQuestions: !settings.useSavedQuestions })}
        />
      </div>

      {canUseSavedQuestions && settings.usePackQuestions && packChoices.length > 0 && (
        <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="mb-3 text-xs font-black uppercase tracking-wider text-white/45">Packs sélectionnés</div>
          <div className="grid gap-2 sm:grid-cols-2">
            {packChoices.map((pack) => {
              const active = settings.selectedPackIds.includes(pack.id);
              return (
                <button
                  key={pack.id}
                  type="button"
                  onClick={() => onTogglePack?.(pack.id)}
                  className={`rounded-2xl border p-3 text-left transition ${
                    active
                      ? "border-neon-cyan/60 bg-neon-cyan/10 shadow-glow-cyan"
                      : "border-white/10 bg-white/5 hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate text-sm font-black">{pack.name}</span>
                    <span className="rounded-full border border-white/10 bg-black/25 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white/55">
                      {pack.compatibleCount} compatible{pack.compatibleCount > 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {Object.entries(pack.gameCounts).map(([game, count]) => (
                      <span key={game} className="rounded-full bg-white/8 px-2 py-0.5 text-[10px] font-bold text-white/55">
                        {game} {count}
                      </span>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {showLiveCoverage && (
        <div className={`mt-3 rounded-2xl border p-4 ${
          liveOverflow > 0
            ? "border-neon-yellow/35 bg-neon-yellow/10"
            : coverageLiveCount > 0
              ? "border-neon-green/30 bg-neon-green/10"
              : "border-white/10 bg-white/5"
        }`}>
          <div className="text-xs font-black uppercase tracking-wider text-white/45">Priorité questions joueurs</div>
          {coverageLiveCount > 0 ? (
            <>
              <p className={`mt-1 text-sm font-bold ${liveOverflow > 0 ? "text-neon-yellow" : "text-neon-green"}`}>
                {liveOverflow > 0
                  ? `${coverageLiveCount} questions joueurs valides, mais la partie est réglée sur ${totalQuestions}. ${liveOverflow} ne pourront pas passer.`
                  : `${coverageLiveCount} questions joueurs valides disponibles. Elles seront toutes jouées.`}
              </p>
              {liveOverflow > 0 && onUseAllLiveQuestions && (
                <button
                  type="button"
                  className="btn-secondary mt-3 rounded-xl px-4 py-2 text-sm"
                  onClick={() => onUseAllLiveQuestions(coverageLiveCount)}
                >
                  Passer à {coverageLiveCount} questions
                </button>
              )}
            </>
          ) : (
            <p className="mt-1 text-sm font-bold text-white/55">
              Aucune question joueur valide pour l&apos;instant. Le système complètera selon les sources activées.
            </p>
          )}
        </div>
      )}

      <ConfigGroup label="Auteurs">
        <ConfigButton active={settings.authorVisibility === "hidden"} disabled={false} onClick={() => patch({ authorVisibility: "hidden" })}>Anonyme</ConfigButton>
        <ConfigButton active={settings.authorVisibility === "final_reveal"} disabled={false} onClick={() => patch({ authorVisibility: "final_reveal" })}>Reveal final</ConfigButton>
        <ConfigButton active={settings.authorVisibility === "visible"} disabled={false} onClick={() => patch({ authorVisibility: "visible" })}>Visible</ConfigButton>
      </ConfigGroup>

      <ConfigGroup label="Par joueur">
        {[1, 2, 3, 5, 10].map((count) => (
          <ConfigButton key={count} active={settings.maxQuestionsPerPlayer === count} disabled={false} onClick={() => patch({ maxQuestionsPerPlayer: count })}>
            {count}
          </ConfigButton>
        ))}
      </ConfigGroup>

      <p className="mt-3 text-sm font-semibold text-white/55">
        En mix intelligent, les questions live passent avant tout, puis les packs sélectionnés, puis les sauvegardées, puis le système complète.
      </p>
    </section>
  );
}

export function HostStartDock({
  eyebrow = "Prêt à lancer",
  title,
  subtitle,
  primaryLabel,
  disabled,
  busy,
  onStart,
  children,
}: {
  eyebrow?: string;
  title: string;
  subtitle: string;
  primaryLabel: string;
  disabled: boolean;
  busy: boolean;
  onStart: () => void;
  children?: ReactNode;
}) {
  return (
    <section className="host-start-dock">
      <div className="min-w-0">
        <div className="text-[11px] font-black uppercase tracking-[0.22em] text-neon-cyan/80">{eyebrow}</div>
        <h2 className="mt-1 text-xl font-black">{title}</h2>
        <p className="mt-1 text-sm font-semibold text-white/55">{subtitle}</p>
        {children && <div className="mt-3 grid gap-2">{children}</div>}
      </div>
      <Button
        type="button"
        variant="primary"
        size="lg"
        disabled={disabled}
        onClick={onStart}
        className="shrink-0 text-base sm:min-w-56"
      >
        {busy ? "Patiente..." : primaryLabel}
      </Button>
    </section>
  );
}
