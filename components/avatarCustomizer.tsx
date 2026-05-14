"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  AVATAR_BACKGROUNDS,
  AVATAR_COLORS,
  AVATAR_STYLES,
  buildStableAvatarKey,
  createRandomAvatarConfig,
  deriveAvatarSeed,
  type AvatarConfig,
  type AvatarStyle,
} from "@/lib/avatar";
import { AvatarImage } from "./playerAvatar";

const QUICK_GRID_LENGTH = 16;

export function AvatarCustomizer({
  name,
  config,
  onChange,
  onColorChange,
}: {
  name: string;
  config: AvatarConfig;
  onChange: (config: AvatarConfig) => void;
  onColorChange: (color: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [quickNonce, setQuickNonce] = useState(0);

  useEffect(() => {
    if (!open || typeof document === "undefined") return;
    const { body } = document;
    const previousOverflow = body.style.overflow;
    const previousPaddingRight = body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = "hidden";
    if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPaddingRight;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const quickChoices = useMemo<AvatarConfig[]>(
    () =>
      Array.from({ length: QUICK_GRID_LENGTH }, (_, index): AvatarConfig => {
        const style = AVATAR_STYLES[(index + quickNonce) % AVATAR_STYLES.length]?.id ?? "adventurer";
        const color = AVATAR_COLORS[(index + quickNonce) % AVATAR_COLORS.length] ?? "#ff3ea5";
        const backgroundColor = AVATAR_BACKGROUNDS[(index * 2 + quickNonce) % AVATAR_BACKGROUNDS.length] ?? "#18091f";
        return {
          avatarStyle: style,
          avatarSeed: deriveAvatarSeed(name, `quick-${quickNonce}-${index}`),
          avatarColor: color,
          avatarOptions: {
            backgroundColor,
            radius: 18,
            scale: 96,
            rotate: 0,
            flip: index % 2 === 0,
          },
        };
      }),
    [name, quickNonce]
  );

  const styleSamples = useMemo(
    () =>
      AVATAR_STYLES.map((style): { id: AvatarStyle; label: string; vibe: string; sample: AvatarConfig } => ({
        id: style.id,
        label: style.label,
        vibe: style.vibe,
        sample: {
          avatarStyle: style.id,
          avatarSeed: deriveAvatarSeed(name, `preview-${style.id}`),
          avatarColor: config.avatarColor,
          avatarOptions: { ...config.avatarOptions },
        },
      })),
    [config.avatarColor, config.avatarOptions, name]
  );

  const selectedKey = buildStableAvatarKey(config);

  function update(next: AvatarConfig) {
    onChange(next);
    onColorChange(next.avatarColor);
  }

  return (
    <div className="avatar-customizer">
      <div className="avatar-preview-row">
        <button type="button" className="avatar-preview-button" onClick={() => setOpen(true)} aria-label="Personnaliser mon avatar">
          <AvatarImage config={config} name={name || "Joueur"} size="lg" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-black uppercase tracking-wider text-neon-cyan">Avatar</div>
          <button type="button" onClick={() => setOpen(true)} className="mt-1 text-left text-lg font-black text-white">
            Personnaliser mon avatar
          </button>
          <p className="mt-1 text-xs font-semibold text-white/45">SVG vectoriel, sauvegarde auto dans ta session.</p>
        </div>
        <button
          type="button"
          className="avatar-random-button"
          onClick={() => update(createRandomAvatarConfig(name || "badaboum"))}
        >
          Aleatoire
        </button>
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] font-black uppercase tracking-wider text-white/45">Selection rapide</span>
          <button type="button" className="text-xs font-black text-neon-cyan" onClick={() => setQuickNonce((value) => value + 1)}>
            Changer
          </button>
        </div>
        <div className="avatar-quick-grid">
          {quickChoices.map((choice) => {
            const key = buildStableAvatarKey(choice);
            const selected = key === selectedKey;
            return (
              <button
                key={key}
                type="button"
                className={`avatar-choice ${selected ? "is-selected" : ""}`}
                onClick={() => update(choice)}
                aria-label="Choisir cet avatar"
                aria-pressed={selected}
              >
                <AvatarImage config={choice} name={name || "Joueur"} size="sm" />
              </button>
            );
          })}
        </div>
      </div>

      {open && (
        <div className="avatar-modal-backdrop" role="presentation" onMouseDown={() => setOpen(false)}>
          <section
            className="avatar-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Personnalisation avatar"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-black uppercase tracking-wider text-neon-yellow">Badaboum ID</div>
                <h3 className="mt-1 text-3xl font-black">Ton avatar</h3>
              </div>
              <button type="button" className="btn-ghost px-3 py-2 text-xs" onClick={() => setOpen(false)}>
                Fermer
              </button>
            </div>

            <div className="avatar-modal-preview">
              <AvatarImage config={config} name={name || "Joueur"} size="xl" />
              <button
                type="button"
                className="btn-primary mt-4 w-full"
                onClick={() => update(createRandomAvatarConfig(name || "badaboum"))}
              >
                Surprends-moi
              </button>
            </div>

            <AvatarOptionSection title="Style">
              <div className="avatar-style-grid">
                {styleSamples.map((style) => {
                  const sampleKey = buildStableAvatarKey(style.sample);
                  const isSelected = config.avatarStyle === style.id;
                  return (
                    <button
                      key={style.id}
                      type="button"
                      className={`avatar-style-card ${isSelected ? "is-selected" : ""}`}
                      onClick={() =>
                        update({
                          ...config,
                          avatarStyle: style.id,
                          avatarSeed: deriveAvatarSeed(name, `${style.id}-${Date.now().toString(36).slice(-4)}`),
                        })
                      }
                      aria-pressed={isSelected}
                    >
                      <AvatarImage key={sampleKey} config={style.sample} name={name || "Joueur"} size="sm" />
                      <span>
                        <strong>{style.label}</strong>
                        <small>{style.vibe}</small>
                      </span>
                    </button>
                  );
                })}
              </div>
            </AvatarOptionSection>

            <AvatarOptionSection title="Couleur joueur">
              <div className="avatar-swatch-row">
                {AVATAR_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`avatar-swatch ${config.avatarColor === color ? "is-selected" : ""}`}
                    style={{ background: color }}
                    onClick={() => update({ ...config, avatarColor: color })}
                    aria-label={`Couleur ${color}`}
                    aria-pressed={config.avatarColor === color}
                  />
                ))}
              </div>
            </AvatarOptionSection>

            <AvatarOptionSection title="Fond">
              <div className="avatar-swatch-row">
                {AVATAR_BACKGROUNDS.map((backgroundColor) => (
                  <button
                    key={backgroundColor}
                    type="button"
                    className={`avatar-swatch ${config.avatarOptions.backgroundColor === backgroundColor ? "is-selected" : ""}`}
                    style={{ background: backgroundColor }}
                    onClick={() =>
                      update({
                        ...config,
                        avatarOptions: { ...config.avatarOptions, backgroundColor },
                      })
                    }
                    aria-label={`Fond ${backgroundColor}`}
                    aria-pressed={config.avatarOptions.backgroundColor === backgroundColor}
                  />
                ))}
              </div>
            </AvatarOptionSection>

            <AvatarOptionSection title="Ajustements">
              <div className="avatar-control-grid">
                <label>
                  <span>Zoom</span>
                  <input
                    type="range"
                    min="82"
                    max="110"
                    value={config.avatarOptions.scale ?? 96}
                    onChange={(event) =>
                      update({ ...config, avatarOptions: { ...config.avatarOptions, scale: Number(event.target.value) } })
                    }
                  />
                </label>
                <label>
                  <span>Rotation</span>
                  <input
                    type="range"
                    min="-12"
                    max="12"
                    value={config.avatarOptions.rotate ?? 0}
                    onChange={(event) =>
                      update({ ...config, avatarOptions: { ...config.avatarOptions, rotate: Number(event.target.value) } })
                    }
                  />
                </label>
                <button
                  type="button"
                  className={`avatar-toggle ${config.avatarOptions.flip ? "is-selected" : ""}`}
                  onClick={() =>
                    update({ ...config, avatarOptions: { ...config.avatarOptions, flip: !config.avatarOptions.flip } })
                  }
                  aria-pressed={Boolean(config.avatarOptions.flip)}
                >
                  Miroir
                </button>
              </div>
            </AvatarOptionSection>

            <button type="button" className="btn-secondary mt-5 w-full" onClick={() => setOpen(false)}>
              Garder cet avatar
            </button>
          </section>
        </div>
      )}
    </div>
  );
}

function AvatarOptionSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="avatar-option-section">
      <h4>{title}</h4>
      {children}
    </section>
  );
}
