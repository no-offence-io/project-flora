import type { CSSProperties } from "react";

/*
 * How a photo or video sits in its box, set in the dashboard's media editor. The box (a product
 * card's well, a gallery slide, the top photo on a page, the hero) keeps its own shape; the
 * picture inside is moved and scaled about its centre and the box clips whatever falls outside.
 *
 *   scale  a factor on the usual fit: 1 is exactly what the site did before the editor existed
 *   x, y   the shift, in percent of the box's width and height
 *
 * Nothing set, or the defaults, means the site draws the picture as it always has. Sanity stores
 * the scale as a percent (100 = 1) and the shifts as percents; parseTransform turns that into this.
 */
export type MediaTransform = { scale?: number; x?: number; y?: number };

export const SCALE_MIN = 0.1;
export const SCALE_MAX = 5;
export const SHIFT_MAX = 200;

export function parseTransform(raw: { scale?: number | null; x?: number | null; y?: number | null } | null | undefined): MediaTransform {
  const out: MediaTransform = {};
  if (!raw) return out;
  if (typeof raw.scale === "number" && raw.scale >= SCALE_MIN * 100 && raw.scale <= SCALE_MAX * 100 && Math.round(raw.scale) !== 100) out.scale = raw.scale / 100;
  if (typeof raw.x === "number" && raw.x !== 0 && Math.abs(raw.x) <= SHIFT_MAX) out.x = raw.x;
  if (typeof raw.y === "number" && raw.y !== 0 && Math.abs(raw.y) <= SHIFT_MAX) out.y = raw.y;
  return out;
}

export const isDefaultTransform = (t: MediaTransform | undefined): boolean => !t || ((t.scale === undefined || t.scale === 1) && !t.x && !t.y);

/**
 * The inline style for the layer that holds the picture: a translate in percent of the layer's own
 * box, then a scale about its centre. Undefined when there is nothing to do, so the stylesheet's
 * usual layout stands untouched.
 */
export function mediaStyle(t: MediaTransform | undefined): CSSProperties | undefined {
  if (isDefaultTransform(t)) return undefined;
  const scale = t!.scale ?? 1;
  const x = t!.x ?? 0;
  const y = t!.y ?? 0;
  return { transform: `translate(${round(x)}%, ${round(y)}%) scale(${round(scale)})` };
}

const round = (n: number) => Math.round(n * 1000) / 1000;
