export type WhoOfUsCategory = "classique" | "trash" | "hot" | "adult" | "insolite" | "brainrot" | "philo" | "couple" | "dark" | "cringe" | "random";

export interface WhoOfUsCategoryMeta {
  id: WhoOfUsCategory;
  label: string;
  emoji: string;
  description: string;
  adult: boolean;
}

export const WHO_OF_US_CATEGORIES: WhoOfUsCategoryMeta[] = [
  {
    id: "classique",
    label: "Classique",
    emoji: "😄",
    adult: false,
    description: "Questions faciles pour lancer la soirée.",
  },
  {
    id: "trash",
    label: "Trash",
    emoji: "🗑️",
    adult: true,
    description: "Sans filtre, à jouer avec un groupe partant.",
  },
  {
    id: "hot",
    label: "Hot",
    emoji: "🔥",
    adult: true,
    description: "Ambiance séduction et révélations.",
  },
  {
    id: "adult",
    label: "+18",
    emoji: "🔞",
    adult: true,
    description: "Réservé aux adultes et aux groupes de confiance.",
  },
  {
    id: "insolite",
    label: "Insolite",
    emoji: "🦄",
    adult: false,
    description: "Bizarre, absurde et très soirée.",
  },
  {
    id: "brainrot",
    label: "Brainrot",
    emoji: "🧠",
    adult: false,
    description: "Mèmes, internet et chaos moderne.",
  },
  {
    id: "philo",
    label: "Philosophique",
    emoji: "🤔",
    adult: false,
    description: "Pour débattre sans sortir du jeu.",
  },
  {
    id: "couple",
    label: "Couple",
    emoji: "💑",
    adult: false,
    description: "Relations, crushs et compatibilités.",
  },
  {
    id: "dark",
    label: "Dark Humor",
    emoji: "💀",
    adult: true,
    description: "Humour noir et questions plus piquantes.",
  },
  {
    id: "cringe",
    label: "Cringe",
    emoji: "😬",
    adult: false,
    description: "Gênance, dossiers et souvenirs honteux.",
  },
  {
    id: "random",
    label: "Random",
    emoji: "🎲",
    adult: false,
    description: "N’importe quoi, mais en mieux.",
  },
];
