"use client";

import { PlayersLobbyGrid } from "@/components/playersLobbyGrid";
import {
  ConfigButton,
  ConfigGroup,
  HostStartDock,
  OrderModeButton,
  QuestionSourcePanel,
  type QuestionPackChoice,
} from "@/components/host/config";
import {
  getGameCategories,
  type GameCategory,
} from "@/lib/gameQuestions";
import {
  getOrderedPlayers,
  mergePlayerOrder,
  type MimeOrderMode,
} from "@/lib/mimeGame";
import {
  MIME_MODES,
  getMimeModeMeta,
  type MimeMode,
} from "@/lib/mimeModes";
import {
  QUESTION_COUNT_PRESETS,
  VOTE_DURATION_OPTIONS,
} from "@/lib/utils";
import type { RoomConfigPatch } from "@/lib/hostTypes";
import type { QuestionPoolDiagnostics } from "@/lib/questionPoolTypes";
import type {
  Player,
  QuestionSourceSettings,
  Room,
} from "@/types/database";

export function MimeLobbyView({
  players,
  availableCount,
  gameLabel,
  selectedCategories,
  room,
  busy,
  customQuestionCount,
  orderMode,
  hostPlayMode,
  finalOrder,
  customOrder,
  onOrderModeChange,
  onShuffle,
  onMoveCustomPlayer,
  onHostPlayModeChange,
  onCustomQuestionCountChange,
  onCommitCustomQuestionCount,
  onToggleCategory,
  onUpdateConfig,
  questionSourceSettings,
  canUseSavedQuestions,
  savedQuestionCount,
  packQuestionCount,
  packChoices,
  liveQuestionCount,
  questionPoolDiagnostics,
  onQuestionSourceSettingsChange,
  onTogglePack,
  onStart,
  onChangeGame,
  selectedMode,
  onSelectedModeChange,
}: {
  players: Player[];
  availableCount: number;
  gameLabel: string;
  selectedCategories: string[];
  room: Room;
  busy: boolean;
  customQuestionCount: string;
  orderMode: MimeOrderMode;
  hostPlayMode: boolean;
  finalOrder: string[];
  customOrder: string[];
  onOrderModeChange: (mode: MimeOrderMode) => void;
  onShuffle: () => void;
  onMoveCustomPlayer: (playerId: string, direction: -1 | 1) => void;
  onHostPlayModeChange: (value: boolean) => void;
  onCustomQuestionCountChange: (value: string) => void;
  onCommitCustomQuestionCount: () => void;
  onToggleCategory: (category: GameCategory) => void;
  onUpdateConfig: (patch: RoomConfigPatch) => void;
  questionSourceSettings: QuestionSourceSettings;
  canUseSavedQuestions: boolean;
  savedQuestionCount: number;
  packQuestionCount: number;
  packChoices: QuestionPackChoice[];
  liveQuestionCount: number;
  questionPoolDiagnostics: QuestionPoolDiagnostics | null;
  onQuestionSourceSettingsChange: (settings: QuestionSourceSettings) => void;
  onTogglePack: (packId: string) => void;
  onStart: () => void;
  onChangeGame: () => void;
  selectedMode: MimeMode;
  onSelectedModeChange: (mode: MimeMode) => void;
}) {
  const enoughPlayers = players.length >= 2;
  const canStart = enoughPlayers && finalOrder.length >= 2 && availableCount > 0 && !busy;
  const categories = getGameCategories("mime_expressions");
  const orderedPlayers = getOrderedPlayers(finalOrder, players);
  const customPlayers = getOrderedPlayers(mergePlayerOrder(customOrder, players), players);

  return (
    <>
      <section className="card mb-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-wider text-white/50">Jeu sélectionné</div>
            <h2 className="text-2xl font-black">{gameLabel}</h2>
          </div>
          <button type="button" onClick={onChangeGame} disabled={busy} className="btn-ghost text-neon-cyan">
            Changer
          </button>
        </div>
      </section>

      <QuestionSourcePanel
        settings={questionSourceSettings}
        canUseSavedQuestions={canUseSavedQuestions}
        savedQuestionCount={savedQuestionCount}
        packQuestionCount={packQuestionCount}
        packChoices={packChoices}
        liveQuestionCount={liveQuestionCount}
        validLiveQuestionCount={questionPoolDiagnostics?.sources.liveValid ?? liveQuestionCount}
        totalQuestions={room.total_questions}
        onUseAllLiveQuestions={(count) => onUpdateConfig({ total_questions: count })}
        onChange={onQuestionSourceSettingsChange}
        onTogglePack={onTogglePack}
      />
      {questionPoolDiagnostics?.issue && (
        <p className="mb-4 rounded-2xl border border-neon-yellow/30 bg-neon-yellow/10 p-3 text-sm font-bold text-neon-yellow">
          {questionPoolDiagnostics.issue}
        </p>
      )}

      <section className="card mb-4 p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">Joueurs présents</h2>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-white/55">
            {players.length}
          </span>
        </div>
        <PlayersLobbyGrid players={players} hostClientId={room.host_client_id} />
      </section>

      <section className="card mb-4 p-5">
        <h2 className="mb-4 text-lg font-bold">Configuration</h2>

        <ConfigGroup label="Manches">
          {QUESTION_COUNT_PRESETS.map((count) => (
            <ConfigButton
              key={count}
              active={room.total_questions === count}
              disabled={busy}
              onClick={() => onUpdateConfig({ total_questions: count })}
            >
              {count}
            </ConfigButton>
          ))}
          <div className="flex min-w-[128px] flex-1 gap-2">
            <input
              className="input min-w-0 rounded-xl px-3 py-2 text-base"
              inputMode="numeric"
              value={customQuestionCount}
              onChange={(event) => onCustomQuestionCountChange(event.target.value.replace(/\D/g, ""))}
              onBlur={onCommitCustomQuestionCount}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.currentTarget.blur();
              }}
              disabled={busy}
            />
            <button
              type="button"
              disabled={busy}
              onClick={onCommitCustomQuestionCount}
              className="btn-secondary rounded-xl px-3 py-2 text-sm"
            >
              OK
            </button>
          </div>
        </ConfigGroup>

        <ConfigGroup label="Timer">
          {VOTE_DURATION_OPTIONS.map((duration) => (
            <ConfigButton
              key={duration}
              active={room.vote_duration_sec === duration}
              disabled={busy}
              onClick={() => onUpdateConfig({ vote_duration_sec: duration })}
            >
              {duration}s
            </ConfigButton>
          ))}
        </ConfigGroup>

        <button
          type="button"
          disabled={busy}
          onClick={() => onHostPlayModeChange(!hostPlayMode)}
          className={`mt-2 flex w-full items-center justify-between rounded-2xl border p-4 text-left transition disabled:opacity-50 ${
            hostPlayMode
              ? "border-neon-cyan bg-neon-cyan/10 text-white"
              : "border-white/10 bg-white/5 text-white/70"
          }`}
        >
          <span className="font-bold">Mode hôte joueur</span>
          <span className={hostPlayMode ? "text-neon-cyan" : "text-white/50"}>{hostPlayMode ? "ON" : "OFF"}</span>
        </button>
      </section>

      <section className="card mb-4 p-5">
        <h2 className="mb-3 text-lg font-bold">Catégories</h2>
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => {
            const active = selectedCategories.includes(category.id);
            return (
              <button
                key={category.id}
                type="button"
                disabled={busy}
                onClick={() => onToggleCategory(category.id)}
                className={`prediction-card flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition duration-200 active:scale-[0.96] disabled:opacity-50 ${
                  active
                    ? "border-neon-pink bg-neon-pink/20 text-white shadow-glow-pink"
                    : "border-white/10 bg-white/5 text-white/70 hover:-translate-y-0.5 hover:border-white/20"
                }`}
                title={category.description}
              >
                <span>{category.emoji}</span>
                <span>{category.label}</span>
                {category.adult && <span className="rounded bg-neon-pink/30 px-1 text-[10px] uppercase">18+</span>}
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-sm text-white/50">
          {availableCount} expression{availableCount > 1 ? "s" : ""} disponible{availableCount > 1 ? "s" : ""}.
        </p>
      </section>

      <section className="card mb-4 p-5">
        <h2 className="mb-3 text-lg font-bold">Mode de jeu</h2>
        <p className="mb-3 text-sm font-semibold text-white/55">
          Change la consigne donnée au mimeur sans bloquer la mécanique. Le timer s&apos;adapte au mode.
        </p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {MIME_MODES.map((mode) => {
            const active = selectedMode === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                disabled={busy}
                onClick={() => onSelectedModeChange(mode.id)}
                className={`rounded-2xl border p-3 text-left transition disabled:opacity-50 ${
                  active
                    ? "border-neon-pink bg-neon-pink/10 shadow-glow-pink"
                    : "border-white/10 bg-white/5 hover:-translate-y-0.5 hover:border-white/20"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-lg" aria-hidden="true">
                    {mode.emoji}
                  </span>
                  <span className={`text-[10px] font-black uppercase tracking-wider ${active ? "text-neon-pink" : "text-white/40"}`}>
                    {mode.id === "chaos_timer" ? "rapide" : mode.timerScale > 1 ? "long" : "standard"}
                  </span>
                </div>
                <div className="mt-1 text-sm font-black">{mode.label}</div>
                <div className="mt-1 text-xs font-semibold text-white/55">{mode.description}</div>
              </button>
            );
          })}
        </div>
        <div className="mt-3 rounded-2xl border border-neon-cyan/30 bg-neon-cyan/10 p-3 text-sm font-semibold text-neon-cyan">
          <strong className="font-black">Consigne :</strong> {getMimeModeMeta(selectedMode).rule}
        </div>
      </section>

      <section className="card mb-4 p-5">
        <h2 className="mb-4 text-lg font-bold">Ordre de passage</h2>
        <div className="grid gap-2 sm:grid-cols-3">
          <OrderModeButton
            active={orderMode === "arrival"}
            disabled={busy}
            title="Ordre d'arrivée"
            subtitle="Selon l'entrée dans la room"
            onClick={() => onOrderModeChange("arrival")}
          />
          <OrderModeButton
            active={orderMode === "random"}
            disabled={busy}
            title="Aléatoire"
            subtitle="Mélangé au lancement"
            onClick={() => onOrderModeChange("random")}
          />
          <OrderModeButton
            active={orderMode === "custom"}
            disabled={busy}
            title="Personnalisé"
            subtitle="Réorganisé par l'hôte"
            onClick={() => onOrderModeChange("custom")}
          />
        </div>

        {orderMode === "random" && (
          <button type="button" disabled={busy} onClick={onShuffle} className="btn-secondary mt-3 w-full rounded-xl py-3 text-base">
            Remélanger
          </button>
        )}

        {orderMode === "custom" && (
          <ul className="mt-4 space-y-2">
            {customPlayers.map((player, index) => (
              <li key={player.id} className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neon-cyan/15 text-sm font-black text-neon-cyan">
                  {index + 1}
                </div>
                <div className="min-w-0 flex-1 truncate font-bold">{player.name}</div>
                <button
                  type="button"
                  disabled={busy || index === 0}
                  onClick={() => onMoveCustomPlayer(player.id, -1)}
                  className="btn-ghost rounded-xl px-3"
                  aria-label={`Monter ${player.name}`}
                >
                  ↑
                </button>
                <button
                  type="button"
                  disabled={busy || index === customPlayers.length - 1}
                  onClick={() => onMoveCustomPlayer(player.id, 1)}
                  className="btn-ghost rounded-xl px-3"
                  aria-label={`Descendre ${player.name}`}
                >
                  ↓
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 rounded-2xl border border-white/10 bg-bg-soft p-4">
          <div className="mb-3 text-xs font-bold uppercase tracking-wider text-white/50">Aperçu final</div>
          <ol className="space-y-2">
            {orderedPlayers.map((player, index) => (
              <li key={player.id} className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-xs font-black">
                  {index + 1}
                </span>
                <span className="font-semibold">{player.name}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <HostStartDock
        title={canStart ? "La scène est prête" : "Mime pas encore prêt"}
        subtitle={`${players.length} joueur${players.length > 1 ? "s" : ""} · ${availableCount} expression${availableCount > 1 ? "s" : ""} disponibles`}
        primaryLabel="Valider et lancer"
        disabled={!canStart}
        busy={busy}
        onStart={onStart}
      >
        {!enoughPlayers && (
          <p className="text-sm font-bold text-neon-yellow">
            Il faut au moins 2 joueurs pour lancer.
          </p>
        )}
        {availableCount === 0 && (
          <p className="text-sm font-bold text-neon-pink">
            Aucune expression disponible avec ces catégories.
          </p>
        )}
      </HostStartDock>
    </>
  );
}
