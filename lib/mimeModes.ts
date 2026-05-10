// Modes de jeu pour le Mime — chaque mode change la consigne mais pas le moteur de partie.
// L'enforcement est volontairement informel (party game), juste un badge / instruction visible.

export type MimeMode =
  | "classic"
  | "sounds_only"
  | "free"
  | "whisper"
  | "chaos_timer"
  | "teams"
  | "relay"
  | "forbidden"
  | "random_handicap";

export interface MimeModeMeta {
  id: MimeMode;
  label: string;
  emoji: string;
  description: string;
  rule: string;
  timerScale: number;
  adult: boolean;
  highlight?: "danger" | "cyan" | "gold" | "purple" | "green";
}

export const MIME_MODES: MimeModeMeta[] = [
  {
    id: "classic",
    label: "Classique",
    emoji: "🤫",
    description: "Le mode original. Gestes uniquement, aucune voix.",
    rule: "Mime seulement avec les gestes. Pas un son, pas un mot.",
    timerScale: 1,
    adult: false,
    highlight: "cyan",
  },
  {
    id: "sounds_only",
    label: "Sons uniquement",
    emoji: "🎙️",
    description: "Aucun geste, seulement la voix et les bruitages.",
    rule: "Tu peux faire des sons, bruitages, voix — mais tu ne bouges pas.",
    timerScale: 1,
    adult: false,
    highlight: "purple",
  },
  {
    id: "free",
    label: "Libre",
    emoji: "🎉",
    description: "Tout est permis : gestes + sons + bruitages.",
    rule: "Tout est autorisé, sauf prononcer le mot ou un mot de la même famille.",
    timerScale: 1,
    adult: false,
    highlight: "green",
  },
  {
    id: "whisper",
    label: "Chuchoté",
    emoji: "🔇",
    description: "Volume coupé. Que des bruitages faibles, gestes calmes.",
    rule: "Murmures et bruitages discrets uniquement. Pas de gros sons.",
    timerScale: 1,
    adult: false,
    highlight: "cyan",
  },
  {
    id: "chaos_timer",
    label: "Chaos timer",
    emoji: "⚡",
    description: "Timer divisé par deux. Réflexe pur.",
    rule: "Mode rapide : tu n'as quasiment plus le temps. Sors tout en mode panique.",
    timerScale: 0.5,
    adult: false,
    highlight: "danger",
  },
  {
    id: "teams",
    label: "Équipes",
    emoji: "🤝",
    description: "Deux équipes. Seule ton équipe peut deviner.",
    rule: "Mime devant ton équipe uniquement. L'autre équipe regarde et critique.",
    timerScale: 1.1,
    adult: false,
    highlight: "gold",
  },
  {
    id: "relay",
    label: "Relais",
    emoji: "🔁",
    description: "Le mime passe au joueur suivant à mi-chemin. Il finit aveugle.",
    rule: "À la moitié du timer, c'est le joueur suivant qui mime sans rien savoir.",
    timerScale: 1.3,
    adult: false,
    highlight: "purple",
  },
  {
    id: "forbidden",
    label: "Interdit",
    emoji: "🚫",
    description: "Une contrainte aléatoire : pas le droit de pointer, ou pas les mains, etc.",
    rule: "Une règle s'ajoute : pas le droit de pointer, pas les mains, ou immobile.",
    timerScale: 1.2,
    adult: false,
    highlight: "danger",
  },
  {
    id: "random_handicap",
    label: "Chaos IA",
    emoji: "🤖",
    description: "Mime avec un handicap surprise : bourré, ralenti, dramatique, anime, PNJ.",
    rule: "Tu mimes avec un handicap : bourré, au ralenti, en mode anime ou PNJ.",
    timerScale: 1.1,
    adult: false,
    highlight: "purple",
  },
];

const RANDOM_HANDICAPS = [
  "Tu mimes comme si tu étais complètement bourré.",
  "Tu mimes au ralenti, comme dans une matrice.",
  "Tu mimes en mode dramatique, vie ou mort.",
  "Tu mimes comme un personnage d'anime hyper expressif.",
  "Tu mimes comme un PNJ buggé qui répète les mêmes gestes.",
  "Tu mimes comme un mannequin de vitrine cassé.",
  "Tu mimes accéléré x2, en mode cartoon.",
  "Tu mimes comme un robot rouillé.",
  "Tu mimes comme un boomer qui découvre internet.",
  "Tu mimes comme une influenceuse Instagram qui pose pour la photo.",
];

const FORBIDDEN_CONSTRAINTS = [
  "Pas le droit de pointer du doigt.",
  "Pas le droit d'utiliser tes mains.",
  "Pas le droit de bouger les pieds.",
  "Tu dois garder un genou au sol tout le temps.",
  "Pas le droit d'utiliser le visage / les expressions.",
  "Pas le droit d'utiliser plus de 3 gestes.",
  "Pas le droit de tourner sur toi-même.",
  "Pas le droit de te baisser.",
];

export function getMimeModeMeta(id: MimeMode | string | null | undefined): MimeModeMeta {
  return MIME_MODES.find((mode) => mode.id === id) ?? MIME_MODES[0];
}

export function pickModeFlavor(mode: MimeMode, seed: number): string | null {
  if (mode === "random_handicap") return RANDOM_HANDICAPS[seed % RANDOM_HANDICAPS.length] ?? null;
  if (mode === "forbidden") return FORBIDDEN_CONSTRAINTS[seed % FORBIDDEN_CONSTRAINTS.length] ?? null;
  return null;
}

export function isMimeMode(value: unknown): value is MimeMode {
  return typeof value === "string" && MIME_MODES.some((mode) => mode.id === value);
}

export function getMimeModeTimerSeconds(mode: MimeMode, baseSeconds: number): number {
  const meta = getMimeModeMeta(mode);
  const scaled = Math.round(baseSeconds * meta.timerScale);
  return Math.max(6, Math.min(180, scaled));
}
