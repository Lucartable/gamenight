"use client";

import { PlayersLobbyGrid } from "@/components/playersLobbyGrid";
import {
  ConfigButton,
  ConfigGroup,
  HostStartDock,
  QuestionSourcePanel,
} from "@/components/host/config";
import {
  getGameCategories,
  type GameCategory,
} from "@/lib/gameQuestions";
import {
  QUESTION_COUNT_PRESETS,
  REVEAL_DURATION_OPTIONS,
  SCORE_TARGET_OPTIONS,
  VOTE_DURATION_OPTIONS,
} from "@/lib/utils";
import type { RoomConfigPatch } from "@/lib/hostTypes";
import type { QuestionPoolDiagnostics } from "@/lib/questionPoolTypes";
import type {
  GameType,
  Player,
  QuestionSourceSettings,
  Room,
} from "@/types/database";

export function LobbyView({
  players,
  availableCount,
  gameType,
  gameLabel,
  isPredictionMode,
  selectedCategories,
  room,
  busy,
  customQuestionCount,
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
  gameType: GameType;
  gameLabel: string;
  isPredictionMode: boolean;
  selectedCategories: string[];
  room: Room;
  busy: boolean;
  customQuestionCount: string;
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
  const enoughPlayers = players.length >= 2;
  const hasEnoughQuestions = availableCount >= room.total_questions;
  const canStart = enoughPlayers && hasEnoughQuestions && !busy;
  const categories = getGameCategories(gameType);

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
        liveQuestionCount={liveQuestionCount}
        validLiveQuestionCount={questionPoolDiagnostics?.sources.liveValid ?? liveQuestionCount}
        totalQuestions={room.total_questions}
        onUseAllLiveQuestions={(count) => onUpdateConfig({ total_questions: count })}
        onChange={onQuestionSourceSettingsChange}
      />

      <section className="card mb-4 p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">Joueurs connectés</h2>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-white/55">
            {players.length}
          </span>
        </div>
        <PlayersLobbyGrid players={players} hostClientId={room.host_client_id} />
      </section>

      <section className="card mb-4 p-5">
        <h2 className="mb-4 text-lg font-bold">Configuration</h2>
        <ConfigGroup label="Questions">
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
              onChange={(e) => onCustomQuestionCountChange(e.target.value.replace(/\D/g, ""))}
              onBlur={onCommitCustomQuestionCount}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
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

        <ConfigGroup label="Vote">
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

        <ConfigGroup label="Révélation">
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
            room.autoplay
              ? "border-neon-cyan bg-neon-cyan/10 text-white"
              : "border-white/10 bg-white/5 text-white/70"
          }`}
        >
          <span className="font-bold">Lecture automatique</span>
          <span className={room.autoplay ? "text-neon-cyan" : "text-white/50"}>
            {room.autoplay ? "ON" : "OFF"}
          </span>
        </button>

        {isPredictionMode && (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => onUpdateConfig({ hide_scores: !room.hide_scores })}
              className={`mt-3 flex w-full items-center justify-between rounded-2xl border p-4 text-left transition ${
                room.hide_scores
                  ? "border-neon-yellow/50 bg-neon-yellow/10 text-white"
                  : "border-white/10 bg-white/5 text-white/70"
              }`}
            >
              <span className="font-bold">Masquer les scores pendant la partie</span>
              <span className={room.hide_scores ? "text-neon-yellow" : "text-white/50"}>
                {room.hide_scores ? "ON" : "OFF"}
              </span>
            </button>

            <ConfigGroup label="Scoreboard">
              <ConfigButton
                active={room.scoreboard_frequency === "round"}
                disabled={busy || room.hide_scores}
                onClick={() => onUpdateConfig({ scoreboard_frequency: "round" })}
              >
                Après chaque manche
              </ConfigButton>
              <ConfigButton
                active={room.scoreboard_frequency === "end"}
                disabled={busy}
                onClick={() => onUpdateConfig({ scoreboard_frequency: "end" })}
              >
                Seulement à la fin
              </ConfigButton>
            </ConfigGroup>

            <ConfigGroup label="Score cible">
              <ConfigButton
                active={!room.score_target}
                disabled={busy}
                onClick={() => onUpdateConfig({ score_target: null })}
              >
                Aucun
              </ConfigButton>
              {SCORE_TARGET_OPTIONS.map((target) => (
                <ConfigButton
                  key={target}
                  active={room.score_target === target}
                  disabled={busy}
                  onClick={() => onUpdateConfig({ score_target: target })}
                >
                  {target}
                </ConfigButton>
              ))}
            </ConfigGroup>
          </>
        )}
      </section>

      <section className="card mb-4 p-5">
        <h2 className="mb-3 text-lg font-bold">Thèmes</h2>
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => {
            const active = selectedCategories.includes(category.id);
            return (
              <button
                key={category.id}
                onClick={() => onToggleCategory(category.id)}
                className={`prediction-card flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition duration-200 active:scale-[0.96] ${
                  active
                    ? "border-neon-pink bg-neon-pink/20 text-white shadow-glow-pink"
                    : "border-white/10 bg-white/5 text-white/70 hover:-translate-y-0.5 hover:border-white/20"
                }`}
                title={category.description}
              >
                <span>{category.emoji}</span>
                <span>{category.label}</span>
                {category.adult && (
                  <span className="rounded bg-neon-pink/30 px-1 text-[10px] uppercase">18+</span>
                )}
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-sm text-white/50">
          {availableCount} question{availableCount > 1 ? "s" : ""} disponible{availableCount > 1 ? "s" : ""}.
        </p>
        {questionPoolDiagnostics?.issue && (
          <p className="mt-2 rounded-2xl border border-neon-yellow/30 bg-neon-yellow/10 p-3 text-sm font-bold text-neon-yellow">
            {questionPoolDiagnostics.issue}
          </p>
        )}
      </section>

      <HostStartDock
        title={canStart ? "Tout est prêt" : "Configuration incomplète"}
        subtitle={`${players.length} joueur${players.length > 1 ? "s" : ""} · ${availableCount}/${room.total_questions} question${room.total_questions > 1 ? "s" : ""} disponibles`}
        primaryLabel="Relancer une partie"
        disabled={!canStart}
        busy={busy}
        onStart={onStart}
      >
        {!enoughPlayers && (
          <p className="text-sm font-bold text-neon-yellow">
            Il faut au moins 2 joueurs pour lancer.
          </p>
        )}
        {!hasEnoughQuestions && (
          <p className="text-sm font-bold text-neon-pink">
            {questionPoolDiagnostics?.issue ?? "Réduis le nombre de questions ou ajoute plus de questions compatibles."}
          </p>
        )}
      </HostStartDock>
    </>
  );
}
