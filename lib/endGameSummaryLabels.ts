import type { GameType } from "@/types/database";
import type { SummaryProfile, SummarySectionLabels } from "./endGameSummaryTypes";

export function getSummaryProfile(gameType: GameType | null | undefined): SummaryProfile {
  if (gameType === "mime_expressions") return "mime";
  if (gameType === "who_of_us") return "social_vote";
  if (gameType === "who_would") return "duel";
  if (gameType === "majority" || gameType === "minority") return "prediction";
  if (gameType === "jauge") return "rating";
  if (gameType === "intrus") return "intrus";
  return "generic";
}

export function getLeaderLabel(profile: SummaryProfile): string {
  if (profile === "mime") return "Spotlight";
  if (profile === "social_vote") return "Au centre des débats";
  if (profile === "duel") return "Influence du soir";
  if (profile === "prediction") return "Leader final";
  if (profile === "rating") return "Réputation du soir";
  if (profile === "intrus") return "Champion de l'enquête";
  return "Leader final";
}

export function getSectionLabels(profile: SummaryProfile): SummarySectionLabels {
  if (profile === "mime") {
    return {
      scoreboardEyebrow: "Rotation de scène",
      scoreboardTitle: "Ordre des passages",
      scoreboardPill: "file auto",
      scoreboardEmpty: "Aucun passage au mime enregistré pour le moment.",
      spotlightsEyebrow: "Dossiers du show",
      spotlightsTitle: "Ce que la scène raconte",
      heatmapEyebrow: "File de passage",
      heatmapTitle: "Qui passe le relais à qui",
      heatmapEmpty: "Pas encore assez d'ordre pour dessiner la rotation.",
      rareEyebrow: "Moments de scène",
      rareTitle: "Les détails qui font rire après",
      rareFallbackTitle: "Show encore jeune",
      rareFallbackDetail: "Pas de moment rare pour l'instant, mais la file automatique est prête.",
      recapEyebrow: "Recap du show",
      recapTitle: "À retenir avant de relancer",
    };
  }

  if (profile === "social_vote") {
    return {
      scoreboardEyebrow: "Accusations finales",
      scoreboardTitle: "Les plus désignés",
      scoreboardPill: "votes sociaux",
      scoreboardEmpty: "Aucun vote nominatif à classer.",
      spotlightsEyebrow: "Awards sociaux",
      spotlightsTitle: "Les dossiers de la table",
      heatmapEyebrow: "Carte relationnelle",
      heatmapTitle: "Qui vote le plus pour qui",
      heatmapEmpty: "Pas assez de votes nominaux pour dessiner une relation.",
      rareEyebrow: "Événements rares",
      rareTitle: "Les votes qui font parler",
      rareFallbackTitle: "Table calme",
      rareFallbackDetail: "Aucune unanimité ou égalité parfaite détectée.",
      recapEyebrow: "Recap social",
      recapTitle: "Les accusations à garder en mémoire",
    };
  }

  if (profile === "duel") {
    return {
      scoreboardEyebrow: "Influence des choix",
      scoreboardTitle: "Les duellistes du soir",
      scoreboardPill: "duels",
      scoreboardEmpty: "Aucun choix à classer.",
      spotlightsEyebrow: "Awards de duel",
      spotlightsTitle: "Les camps et les solos",
      heatmapEyebrow: "Synchronisation",
      heatmapTitle: "Qui choisit pareil",
      heatmapEmpty: "Pas assez de choix communs pour former une alliance.",
      rareEyebrow: "Moments serrés",
      rareTitle: "Les duels qui ont coupé la table",
      rareFallbackTitle: "Duel standard",
      rareFallbackDetail: "Aucun split rarissime, mais les préférences sont enregistrées.",
      recapEyebrow: "Recap des duels",
      recapTitle: "Ce que les choix racontent",
    };
  }

  if (profile === "prediction") {
    return {
      scoreboardEyebrow: "Scoreboard vivant",
      scoreboardTitle: "Podium final",
      scoreboardPill: "live reveal",
      scoreboardEmpty: "Pas encore assez de prédictions pour classer la table.",
      spotlightsEyebrow: "Awards de lecture",
      spotlightsTitle: "Qui comprend vraiment le groupe",
      heatmapEyebrow: "Carte des alliances",
      heatmapTitle: "Qui pense comme qui",
      heatmapEmpty: "Pas assez de votes comparables pour détecter les alliances.",
      rareEyebrow: "Événements rares",
      rareTitle: "Les prédictions qui ont secoué la table",
      rareFallbackTitle: "Chaos standard",
      rareFallbackDetail: "Aucun événement rarissime, mais les choix ont laissé des traces.",
      recapEyebrow: "Recap final",
      recapTitle: "À retenir avant de relancer",
    };
  }

  if (profile === "intrus") {
    return {
      scoreboardEyebrow: "Manuel du détective",
      scoreboardTitle: "Classement final",
      scoreboardPill: "intrus",
      scoreboardEmpty: "Aucune manche jouée. Lancez une partie pour remplir le tableau.",
      spotlightsEyebrow: "Dossiers de l'enquête",
      spotlightsTitle: "Les coups marquants",
      heatmapEyebrow: "Cartographie des accusations",
      heatmapTitle: "Qui démasque qui",
      heatmapEmpty: "Pas assez d'enquêtes réussies pour cartographier les démasquages.",
      rareEyebrow: "Moments de bluff",
      rareTitle: "Les manches qui se racontent",
      rareFallbackTitle: "Enquête calme",
      rareFallbackDetail: "Aucun retournement, mais les indices ont circulé.",
      recapEyebrow: "Recap d'enquête",
      recapTitle: "À retenir avant la prochaine manche",
    };
  }

  if (profile === "rating") {
    return {
      scoreboardEyebrow: "Courbe de réputation",
      scoreboardTitle: "Les moyennes finales",
      scoreboardPill: "1-10",
      scoreboardEmpty: "Aucune note exploitable pour classer la table.",
      spotlightsEyebrow: "Awards de jauge",
      spotlightsTitle: "Qui note, qui encaisse",
      heatmapEyebrow: "Relations de notes",
      heatmapTitle: "Qui note sévèrement qui",
      heatmapEmpty: "Anonymat permanent ou pas assez de notes croisées.",
      rareEyebrow: "Moments de jauge",
      rareTitle: "Les écarts qui font parler",
      rareFallbackTitle: "Jauge stable",
      rareFallbackDetail: "Aucun écart rarissime, mais les moyennes sont enregistrées.",
      recapEyebrow: "Recap jauge",
      recapTitle: "La réputation à retenir",
    };
  }

  return {
    scoreboardEyebrow: "Scoreboard vivant",
    scoreboardTitle: "Podium final",
    scoreboardPill: "live reveal",
    scoreboardEmpty: "Pas encore assez de données pour classer la table.",
    spotlightsEyebrow: "Awards absurdes",
    spotlightsTitle: "Les dossiers de la table",
    heatmapEyebrow: "Heatmap relationnelle",
    heatmapTitle: "Circulation du chaos",
    heatmapEmpty: "Pas assez de relations détectées pour dessiner la carte.",
    rareEyebrow: "Événements rares",
    rareTitle: "Les moments qui font du bruit",
    rareFallbackTitle: "Chaos standard",
    rareFallbackDetail: "Aucun événement rarissime, mais la soirée a laissé des traces.",
    recapEyebrow: "Recap final",
    recapTitle: "À retenir avant de relancer",
  };
}
