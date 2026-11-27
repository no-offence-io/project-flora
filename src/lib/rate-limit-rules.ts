/*
 * How often one visitor may do the things that cost something: send an email from the shop, start a
 * payment, guess at a discount code or at an order. Pure, so the arithmetic is tested on its own;
 * rate-limit.ts keeps the counts.
 *
 * The numbers are generous on purpose. A pop-up shop's tablet, an office or a family share one
 * address, and a real customer must never meet a limit; a script meets it within seconds.
 */
export type Limit = { max: number; windowMs: number };

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

export const LIMITS = {
  /** Newsletter sign-ups, each of which sends a welcome email. */
  newsletter: { max: 30, windowMs: HOUR },
  /** Sign-in links requested, whatever the addresses. Each address has its own tighter limit as well. */
  signin: { max: 20, windowMs: HOUR },
  /** "Find my order" tries: an order number and an email guessed together. */
  lookup: { max: 20, windowMs: 10 * MINUTE },
  /** New card payments started. Re-pricing one already started is not counted. */
  checkout: { max: 60, windowMs: HOUR },
  /** Vipps payments started. */
  vipps: { max: 20, windowMs: HOUR },
  /** Discount codes that turned out not to exist. */
  discount: { max: 20, windowMs: HOUR },
} as const satisfies Record<string, Limit>;

export type Bucket = keyof typeof LIMITS;

/** The moments still inside the window. */
export const recent = (sent: number[] | undefined, now: number, limit: Limit) => (sent ?? []).filter((t) => typeof t === "number" && now - t < limit.windowMs && t <= now);

/** Is there room for one more, and what the record looks like once it is counted. */
export function decide(sent: number[] | undefined, now: number, limit: Limit): { ok: boolean; sent: number[] } {
  const kept = recent(sent, now, limit);
  return kept.length >= limit.max ? { ok: false, sent: kept } : { ok: true, sent: [...kept, now] };
}
