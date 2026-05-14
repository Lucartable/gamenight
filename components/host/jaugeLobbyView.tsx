"use client";

import { PlayersLobbyGrid } from "@/components/playersLobbyGrid";
import {
  ConfigButton,
  ConfigGroup,
  HostStartDock,
  OrderModeButton,
  QuestionSourcePanel,
} from "@/components/host/config";
import {
  getGameCategories,
  type GameCategory,
} from "@/lib/gameQuestions";
import {
  getOrderedPlayers,
  mergePlayerOrder,
} from "@/lib/mimeGame";
import { getEffectiveJaugeQuestionMode } from "@/lib/jaugeQuestionMode";
import {
  QUESTION_COUNT_PRESETS,
  REVEAL_DURATION_OPTIONS,
  VOTE_DURATION_OPTIONS,
} from "@/lib/utils";
import type { RoomConfigPatch } from "@/lib/hostTypes";
import type { QuestionPoolDiagnostics } from "@/lib/questionPoolTypes";
import type {
  JaugeAnonymityMode,
  JaugeQuestionMode,
  JaugeTargetMode,
  Player,
  QuestionSourceSettings,
  Room,
} from "@/types/database";

export function JaugeLobbyView({
  players,
  availableCount,
  gameLabel,
  selectedCategories,
  room,
  busy,
  customQuestionCount,
  targetMode,
  questionMode,
  anonymityMode,
  brutalMode,
  autoJaugeMode,
  allowPlayerQuestions,
  finalOrder,
  customOrder,
  onTargetModeChange,
  onQuestionModeChange,
  onAnonymityModeChange,
  onShuffle,
  onMoveCustomPlayer,
  onBrutalModeChange,
  onAutoJaugeModeChange,
  onAllowPlayerQuestionsChange,
  onCustomQuestionCountChange,
  onCommitCustomQuestionCount,
  onToggleCategory,
  onUpdateConfig,
  questionSourceSettings,
  canUseSavedQuestions,
  savedQuestionCount,
  liveQuestionCount,
  questionPoolDiagnostics,
  onQuestionSourceSettingsChange,
  onStart,
  onChangeGame,
}: {
  players: Player[];
  availableCount: number;
  gameLabel: string;
  selectedCategories: string[];
  room: Room;
  busy: boolean;
  customQuestionCount: string;
  targetMode: JaugeTargetMode;
  questionMode: JaugeQuestionMode;
  anonymityMode: JaugeAnonymityMode;
  brutalMode: boolean;
  autoJaugeMode: boolean;
  allowPlayerQuestions: boolean;
  finalOrder: string[];
  customOrder: string[];
  onTargetModeChange: (mode: JaugeTargetMode) => void;
  onQuestionModeChange: (mode: JaugeQuestionMode) => void;
  onAnonymityModeChange: (mode: JaugeAnonymityMode) => void;
  onShuffle: () => void;
  onMoveCustomPlayer: (playerId: string, direction: -1 | 1) => void;
  onBrutalModeChange: (value: boolean) => void;
  onAutoJaugeModeChange: (value: boolean) => void;
  onAllowPlayerQuestionsChange: (value: boolean) => void;
  onCustomQuestionCountChange: (value: string) => void;
  onCommitCustomQuestionCount: () => void;
  onToggleCategory: (category: GameCategory) => void;
  onUpdateConfig: (patch: RoomConfigPatch) => void;
  questionSourceSettings: QuestionSourceSettings;
  canUseSavedQuestions: boolean;
  savedQuestionCount: number;
  liveQuestionCount: number;
  questionPoolDiagnostics: QuestionPoolDiagnostics | null;
  onQuestionSourceSettingsChange: (settings: QuestionSourceSettings) => void;
  onStart: () => void;
  onChangeGame: () => void;
}) {
  const categories = getGameCategories("jauge");
  const enoughPlayers = players.length >= 2;
  const orderedPlayers = getOrderedPlayers(finalOrder, players);
  const customPlayers = getOrderedPlayers(mergePlayerOrder(customOrder, players), players);
  const playerQuestionCount = liveQuestionCount + (room.jauge_game_state?.playerQuestions?.length ?? 0);
  const effectiveQuestionMode = getEffectiveJaugeQuestionMode(questionSourceSettings, questionMode);
  const validCustomSourceCount =
    (questionPoolDiagnostics?.sources.liveValid ?? playerQuestionCount) +
    (questionPoolDiagnostics?.sources.savedValid ??
      (questionSourceSettings.useSavedQuestions && canUseSavedQuestions ? savedQuestionCount : 0));
  const hasQuestions =
    effectiveQuestionMode === "players" ? validCustomSourceCount >= room.total_questions : availableCount >= room.total_questions;
  const canStart = enoughPlayers && finalOrder.length >= 2 && hasQuestions && !busy;

  return (
    <>
      <section className="jauge-config-hero mb-4 overflow-hidden rounded-[2rem] border border-white/10 bg-black/35 p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-wider text-neon-cyan">Jeu sélectionné</div>
            <h2 className="mt-1 text-4xl font-black">{gameLabel}</h2>
            <p className="mt-2 max-w-md text-sm font-semibold text-white/60">
              Une cible, une question, tout le monde note de 1 à 10. Le reveal fait le reste.
            </p>
          </div>
          <button type="button" onClick={onChangeGame} disabled={busy} className="btn-ghost text-neon-cyan">
            Changer
          </button>
        </div>
      </section>

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
        <h2 className="mb-4 text-lg font-bold">Rythme de partie</h2>
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

        <ConfigGroup label="Timer vote">
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

        <ConfigGroup label="Reveal">
          {REVEAL_DURATION_OPTIONS.map((duration) => (
            <ConfigButton
              key={duration}
              active={room.reveal_duration_sec === duration}
              disabled={busy}
              onClick={() => onUpdateConfig({ reveal_duration_sec: duration })}
            >
              {duration}s
            </ConfigButton>
          ))}
        </ConfigGroup>

        <button
          type="button"
          disabled={busy}
          onClick={() => onUpdateConfig({ autoplay: !room.autoplay })}
          className={`mt-2 flex w-full items-center justify-between rounded-2xl border p-4 text-left transition ${
            room.autoplay ? "border-neon-cyan bg-neon-cyan/10" : "border-white/10 bg-white/5 text-white/70"
          }`}
        >
          <span className="font-bold">Lecture automatique</span>
          <span className={room.autoplay ? "text-neon-cyan" : "text-white/50"}>{room.autoplay ? "ON" : "OFF"}</span>
        </button>
      </section>

      <QuestionSourcePanel
        settings={questionSourceSettings}
        canUseSavedQuestions={canUseSavedQuestions}
        savedQuestionCount={savedQuestionCount}
        liveQuestionCount={playerQuestionCount}
        onChange={onQuestionSourceSettingsChange}
      />
      {questionPoolDiagnostics?.issue && (
        <p className="mb-4 rounded-2xl border border-neon-yellow/30 bg-neon-yellow/10 p-3 text-sm font-bold text-neon-yellow">
          {questionPoolDiagnostics.issue}
        </p>
      )}

      <section className="card mb-4 p-5">
        <h2 className="mb-4 text-lg font-bold">Cible à noter</h2>
        <div className="grid gap-2 sm:grid-cols-3">
          <OrderModeButton
            active={targetMode === "random"}
            disabled={busy}
            title="Aléatoire"
            subtitle="Évite les répétitions"
            onClick={() => onTargetModeChange("random")}
          />
          <OrderModeButton
            active={targetMode === "arrival"}
            disabled={busy}
            title="Ordre auto"
            subtitle="Selon l'arrivée"
            onClick={() => onTargetModeChange("arrival")}
          />
          <OrderModeButton
            active={targetMode === "custom"}
            disabled={busy}
            title="Personnalisé"
            subtitle="Réglé par l'hôte"
            onClick={() => onTargetModeChange("custom")}
          />
        </div>

        {targetMode === "random" && (
          <button type="button" disabled={busy} onClick={onShuffle} className="btn-secondary mt-3 w-full rounded-xl py-3 text-base">
            Pré-mélanger
          </button>
        )}

        {targetMode === "custom" && (
          <ul className="mt-4 space-y-2">
            {customPlayers.map((player, index) => (
              <li key={player.id} className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neon-pink/15 text-sm font-black text-neon-pink">
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
          <div className="mb-3 text-xs font-bold uppercase tracking-wider text-white/50">Aperçu de passage</div>
          <ol className="space-y-2">
            {orderedPlayers.map((player, index) => (
              <li key={player.id} className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-xs font-black">{index + 1}</span>
                <span className="font-semibold">{player.name}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="card mb-4 p-5">
        <h2 className="mb-4 text-lg font-bold">Questions</h2>
        <div className="grid gap-2 sm:grid-cols-3">
          <OrderModeButton
            active={questionMode === "random"}
            disabled={busy}
            title="Aléatoires"
            subtitle="Pioche variée"
            onClick={() => onQuestionModeChange("random")}
          />
          <OrderModeButton
            active={questionMode === "fixed"}
            disabled={busy}
            title="Ordre fixe"
            subtitle="Déroulé stable"
            onClick={() => onQuestionModeChange("fixed")}
          />
          <OrderModeButton
            active={questionMode === "players"}
            disabled={busy}
            title="Joueurs"
            subtitle={`${playerQuestionCount} proposée${playerQuestionCount > 1 ? "s" : ""}`}
            onClick={() => onQuestionModeChange("players")}
          />
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={() => onAllowPlayerQuestionsChange(!allowPlayerQuestions)}
          className={`mt-3 flex w-full items-center justify-between rounded-2xl border p-4 text-left transition ${
            allowPlayerQuestions ? "border-neon-green/50 bg-neon-green/10" : "border-white/10 bg-white/5 text-white/70"
          }`}
        >
          <span className="font-bold">Questions écrites par les joueurs</span>
          <span className={allowPlayerQuestions ? "text-neon-green" : "text-white/50"}>{allowPlayerQuestions ? "ON" : "OFF"}</span>
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
          {availableCount} question{availableCount > 1 ? "s" : ""} disponible{availableCount > 1 ? "s" : ""}.
        </p>
      </section>

      <section className="card mb-4 p-5">
        <h2 className="mb-4 text-lg font-bold">Anonymat et tension</h2>
        <div className="grid gap-2">
          <ConfigButton active={anonymityMode === "visible"} disabled={busy} onClick={() => onAnonymityModeChange("visible")}>
            Votes visibles au reveal
          </ConfigButton>
          <ConfigButton active={anonymityMode === "round_anonymous"} disabled={busy} onClick={() => onAnonymityModeChange("round_anonymous")}>
            Anonyme pendant la partie
          </ConfigButton>
          <ConfigButton active={anonymityMode === "final_reveal"} disabled={busy} onClick={() => onAnonymityModeChange("final_reveal")}>
            Auteurs révélés au bilan
          </ConfigButton>
          <ConfigButton active={anonymityMode === "anonymous"} disabled={busy} onClick={() => onAnonymityModeChange("anonymous")}>
            Anonyme permanent
          </ConfigButton>
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={() => onAutoJaugeModeChange(!autoJaugeMode)}
          className={`mt-3 flex w-full items-center justify-between rounded-2xl border p-4 text-left transition ${
            autoJaugeMode ? "border-neon-cyan bg-neon-cyan/10" : "border-white/10 bg-white/5 text-white/70"
          }`}
        >
          <span className="font-bold">Auto-jauge</span>
          <span className={autoJaugeMode ? "text-neon-cyan" : "text-white/50"}>{autoJaugeMode ? "ON" : "OFF"}</span>
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={() => onBrutalModeChange(!brutalMode)}
          className={`mt-3 flex w-full items-center justify-between rounded-2xl border p-4 text-left transition ${
            brutalMode ? "border-neon-pink bg-neon-pink/10" : "border-white/10 bg-white/5 text-white/70"
          }`}
        >
          <span className="font-bold">Mode brutal</span>
          <span className={brutalMode ? "text-neon-pink" : "text-white/50"}>{brutalMode ? "ON" : "OFF"}</span>
        </button>
      </section>

      <HostStartDock
        title={canStart ? "Jauge prête" : "Jauge incomplète"}
        subtitle={`${players.length} joueur${players.length > 1 ? "s" : ""} · ${availableCount}/${room.total_questions} question${room.total_questions > 1 ? "s" : ""} disponibles`}
        primaryLabel="Valider et lancer"
        disabled={!canStart}
        busy={busy}
        onStart={onStart}
      >
        {!enoughPlayers && <p className="text-sm font-bold text-neon-yellow">Il faut au moins 2 joueurs pour lancer.</p>}
        {!hasQuestions && (
          <p className="text-sm font-bold text-neon-pink">
            {questionPoolDiagnostics?.issue ??
              (effectiveQuestionMode === "players"
                ? "Aucune question joueur/sauvegardée disponible."
                : "Réduis le nombre de manches ou ajoute plus de questions.")}
          </p>
        )}
      </HostStartDock>
    </>
  );
}
