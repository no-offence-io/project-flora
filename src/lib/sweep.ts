import "server-only";
import { notice } from "./notices";
import { settleVippsPayment } from "./vipps-checkout";
import { continueImport } from "./admin/stripe-import";
import { vippsEnv } from "./vipps";
import { getWriteClient } from "@/sanity/lib/write";

/*
 * The shop's housekeeping, run every few minutes by the scheduler (see /api/webhooks/cron).
 *
 * Vipps payments left open. A Vipps payment becomes an order when the customer lands back on the
 * site, or when Vipps' webhook says the money is reserved. A customer who pays in the app and never
 * comes back, on a day the webhook doesn't arrive, would leave money reserved and no order. So
 * every payment still open after a couple of minutes is asked about directly. settleVippsPayment
 * does the rest, the same way as always: an authorised one is captured and becomes an order, one
 * the customer abandoned is marked as such and never asked about again.
 *
 * Old counters. The per-visitor counts behind the rate limits (rate-limit.ts) are deleted once
 * nobody has touched them for two days.
 *
 * Earlier sales. An import from Stripe that has been asked for is carried on, a stretch at a time,
 * until the whole history is in (admin/stripe-import.ts).
 */
const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

export type SweepResult = { vipps: { looked: number; paid: number; closed: number; waiting: number; failed: number }; counters: number; imported: number | null };

export async function sweep(): Promise<SweepResult> {
  const client = getWriteClient();
  const now = Date.now();
  const result: SweepResult = { vipps: { looked: 0, paid: 0, closed: 0, waiting: 0, failed: 0 }, counters: 0, imported: null };

  // Two minutes' grace so the customer's own return gets there first; ten days back covers the longest a reservation lasts.
  const open = await client.fetch<string[]>(
    `*[_type == "vippsPayment" && status == "created" && environment == $env && createdAt < $before && createdAt > $after] | order(createdAt asc)[0...25].reference`,
    { env: vippsEnv(), before: new Date(now - 2 * MINUTE).toISOString(), after: new Date(now - 10 * DAY).toISOString() },
  );
  for (const reference of open) {
    result.vipps.looked++;
    try {
      const outcome = await settleVippsPayment(reference);
      if (outcome.state === "paid") result.vipps.paid++;
      else if (outcome.state === "cancelled") result.vipps.closed++;
      else if (outcome.state === "pending") result.vipps.waiting++;
      else result.vipps.failed++;
    } catch (err) {
      result.vipps.failed++;
      console.error(`[sweep] Vipps ${reference} could not be settled`, err);
      await notice({ kind: "error", source: "payments", title: `A Vipps payment could not be settled (${reference})`, detail: err instanceof Error ? err.message : String(err), href: "/admin/orders", dedupeKey: `vipps-settle:${reference}` });
    }
  }

  const stale = await client.fetch<string[]>(`*[_type == "rateLimit" && _updatedAt < $cutoff][0...200]._id`, { cutoff: new Date(now - 2 * DAY).toISOString() });
  if (stale.length) {
    let tx = client.transaction();
    for (const id of stale) tx = tx.delete(id);
    await tx.commit();
    result.counters = stale.length;
  }

  // Last, and never in the way of the rest: a fault here is reported, not thrown.
  try {
    const run = await continueImport();
    if (run) result.imported = run.added;
  } catch (err) {
    console.error("[sweep] the Stripe import stopped", err);
    await notice({ kind: "error", source: "payments", title: "The import of earlier sales from Stripe stopped", detail: err instanceof Error ? err.message : String(err), href: "/admin/payments#earlier", dedupeKey: `stripe-import:${new Date().toISOString().slice(0, 10)}` });
  }
  return result;
}
