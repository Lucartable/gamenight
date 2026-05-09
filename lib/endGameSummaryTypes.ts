import type { AskedQuestion, GameType, JaugeGameState, MimeGameState, Player, Rating, Vote } from "@/types/database";

export type SummaryTone = "gold" | "cyan" | "pink" | "green" | "purple" | "ghost" | "danger";
export type SummaryProfile = "mime" | "social_vote" | "duel" | "prediction" | "rating" | "generic";

export interface SummaryScoreRow {
  player: Player;
  rank: number;
  score: number;
  scoreLabel: string;
  detail: string;
  tone: SummaryTone;
}

export interface SummarySpotlight {
  id: string;
  label: string;
  title: string;
  player: Player | null;
  value: string;
  detail: string;
  tone: SummaryTone;
}

export interface SummaryHeatCell {
  from: Player;
  to: Player;
  value: number;
  percent: number;
  detail?: string;
  metricLabel?: string;
}

export interface SummaryRareMoment {
  title: string;
  detail: string;
  tone: SummaryTone;
}

export interface EndGameSummary {
  profile: SummaryProfile;
  title: string;
  subtitle: string;
  leaderLabel: string;
  sectionLabels: SummarySectionLabels;
  roundsPlayed: number;
  totalVotes: number;
  leader: SummaryScoreRow | null;
  scoreboard: SummaryScoreRow[];
  spotlights: SummarySpotlight[];
  heatmapMode: "targets" | "alliances" | "mime" | "empty";
  heatmap: SummaryHeatCell[];
  relationInsights: string[];
  rareMoments: SummaryRareMoment[];
  recapLines: string[];
}

export interface SummarySectionLabels {
  scoreboardEyebrow: string;
  scoreboardTitle: string;
  scoreboardPill: string;
  scoreboardEmpty: string;
  spotlightsEyebrow: string;
  spotlightsTitle: string;
  heatmapEyebrow: string;
  heatmapTitle: string;
  heatmapEmpty: string;
  rareEyebrow: string;
  rareTitle: string;
  rareFallbackTitle: string;
  rareFallbackDetail: string;
  recapEyebrow: string;
  recapTitle: string;
}

export interface BuildSummaryInput {
  gameType: GameType | null | undefined;
  players: Player[];
  votes: Vote[];
  ratings?: Rating[];
  askedQuestions: AskedQuestion[];
  roundQuestionIds?: number[];
  mimeGameState: MimeGameState | null;
  jaugeGameState?: JaugeGameState | null;
}
