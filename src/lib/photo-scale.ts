/**
 * A product photo's size inside its box, set per photo on the dashboard. The box (card well,
 * gallery slide) keeps its own shape; only the layer the photo is drawn into grows or shrinks
 * about the centre, so the photo stays whole (object-contain) and the box clips any overflow.
 * No factor, or 1, is the usual fit and sets nothing.
 */
export function photoScale(scale?: number): { width: string; height: string } | undefined {
  if (!scale || scale === 1) return undefined;
  const pct = `${Math.round(scale * 1000) / 10}%`;
  return { width: pct, height: pct };
}
