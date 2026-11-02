/** How the shop moves from page to page, chosen on the dashboard's Page transitions page. */
export const TRANSITION_TYPES = ["fade", "push", "blink", "blur", "none"] as const;
export const TRANSITION_DIRECTIONS = ["left", "right", "up", "down"] as const;
export const BLINK_AXES = ["vertical", "horizontal"] as const;

export type TransitionType = (typeof TRANSITION_TYPES)[number];
export type TransitionDirection = (typeof TRANSITION_DIRECTIONS)[number];
export type BlinkAxis = (typeof BLINK_AXES)[number];
export type TransitionSetting = { type: TransitionType; direction: TransitionDirection; middle: boolean; axis: BlinkAxis };

export const DEFAULT_TRANSITION: TransitionSetting = { type: "fade", direction: "left", middle: false, axis: "vertical" };

const oneOf = <T extends string>(list: readonly T[], value: unknown, fallback: T): T => (list.includes(value as T) ? (value as T) : fallback);

/** Anything stored or posted → a setting that is safe to use; unknown values fall back to the default. */
export function parseTransition(v: { type?: unknown; direction?: unknown; middle?: unknown; axis?: unknown } | null | undefined): TransitionSetting {
  return {
    type: oneOf(TRANSITION_TYPES, v?.type, DEFAULT_TRANSITION.type),
    direction: oneOf(TRANSITION_DIRECTIONS, v?.direction, DEFAULT_TRANSITION.direction),
    middle: v?.middle === true,
    axis: oneOf(BLINK_AXES, v?.axis, DEFAULT_TRANSITION.axis),
  };
}
