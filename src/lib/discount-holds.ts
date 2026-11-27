/*
 * A discount code with a limited number of uses, kept honest while several customers are at the
 * checkout at once. Pure; discounts.ts does the reading and writing.
 *
 * A use is only counted when an order is paid, so two customers could both be quoted the last use
 * and both pay with it. To stop that, a checkout that is quoted a limited code puts a hold on one
 * use: a small entry on the code's document with a key of its own. Uses already counted plus the
 * holds of other checkouts may not reach the limit. A hold lasts while the checkout is alive (every
 * re-pricing renews it) and lapses by itself when the customer walks away; paying turns it into a
 * counted use and removes it.
 */
export type Hold = { _key: string; key: string; at: string };
export type Limited = { uses?: number | null; maxUses?: number | null; holds?: Hold[] | null };

/** How long a checkout keeps its place without being touched. Long enough for a slow payment (a bank's own approval step, Klarna's form). */
export const HOLD_MS = 45 * 60_000;

export const isLimited = (doc: Limited) => doc.maxUses !== undefined && doc.maxUses !== null;

/** The holds that still count. */
export function liveHolds(holds: Limited["holds"], now: number): Hold[] {
  return (holds ?? []).filter((h) => h && typeof h.key === "string" && now - new Date(h.at).getTime() < HOLD_MS);
}

/**
 * The code's holds once this checkout has its place, or null when there is no use left for it.
 * A checkout that already holds a place keeps it (and renews it), whatever else has happened.
 */
export function withHold(doc: Limited, key: string, now: number): Hold[] | null {
  const live = liveHolds(doc.holds, now);
  const others = live.filter((h) => h.key !== key);
  const mine = live.length !== others.length;
  if (!mine && isLimited(doc) && (doc.uses ?? 0) + others.length >= (doc.maxUses as number)) return null;
  return [...others, { _key: key, key, at: new Date(now).toISOString() }];
}
