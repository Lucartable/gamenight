/**
 * Grammaire d'animation centralisée.
 * Utilisée par les primitives UI et les composants jeux.
 * Pour les keyframes, voir app/animations.css et app/tokens.css.
 */

export const DURATION = {
  instant: 90,
  fast: 180,
  normal: 320,
  slow: 520,
  cinematic: 820,
} as const;

export const EASE = {
  out: "cubic-bezier(0.2, 0.9, 0.2, 1)",
  inOut: "cubic-bezier(0.65, 0.04, 0.35, 1)",
  springSoft: "cubic-bezier(0.34, 1.18, 0.64, 1)",
  bounce: "cubic-bezier(0.18, 1.4, 0.4, 1)",
} as const;

export const TRANSITION = {
  fade: `opacity ${DURATION.fast}ms ${EASE.out}`,
  card: `transform ${DURATION.fast}ms ${EASE.out}, box-shadow ${DURATION.fast}ms ${EASE.out}`,
  button: `transform ${DURATION.instant}ms ${EASE.out}, background-color ${DURATION.fast}ms ${EASE.out}, box-shadow ${DURATION.fast}ms ${EASE.out}`,
  modal: `transform ${DURATION.normal}ms ${EASE.springSoft}, opacity ${DURATION.fast}ms ${EASE.out}`,
} as const;

export function staggerDelay(index: number, step = 60, max = 12): number {
  return Math.min(index, max) * step;
}
