"use client";

import { type ReactNode } from "react";
import { Button } from "@/components/ui";
import type { QuestionSourceSettings } from "@/types/database";

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
  liveQuestionCount,
  onChange,
}: {
  settings: QuestionSourceSettings;
  canUseSavedQuestions: boolean;
  savedQuestionCount: number;
  liveQuestionCount: number;
  onChange: (settings: QuestionSourceSettings) => void;
}) {
  const patch = (next: Partial<QuestionSourceSettings>) => onChange({ ...settings, ...next });
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
        <ConfigButton active={settings.mode === "all_mix"} disabled={!canUseSavedQuestions} onClick={() => patch({ mode: "all_mix", useSystemQuestions: true, useLiveQuestions: true, useSavedQuestions: true })}>
          Tout mixer
        </ConfigButton>
      </ConfigGroup>

      <div className="grid gap-2 sm:grid-cols-3">
        <SourceToggle active={settings.useSystemQuestions} label="Questions système" detail="Base Badaboum" onClick={() => patch({ mode: "smart_mix", useSystemQuestions: !settings.useSystemQuestions })} />
        <SourceToggle active={settings.useLiveQuestions} label="Questions live" detail={`${liveQuestionCount} proposée${liveQuestionCount > 1 ? "s" : ""}`} onClick={() => patch({ mode: "smart_mix", useLiveQuestions: !settings.useLiveQuestions })} />
        <SourceToggle
          active={settings.useSavedQuestions}
          label="Sauvegardées"
          detail={canUseSavedQuestions ? `${savedQuestionCount} dispo` : "Trusted/admin"}
          disabled={!canUseSavedQuestions}
          onClick={() => patch({ mode: "smart_mix", useSavedQuestions: !settings.useSavedQuestions })}
        />
      </div>

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
        En mix intelligent, les questions live/sauvegardées sont injectées en priorité, puis les questions système complètent les manches restantes.
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
