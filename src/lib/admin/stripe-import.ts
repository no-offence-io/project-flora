import "server-only";
import { orderFromCharge, type SkipReason } from "./stripe-import-map";
import { getStripe } from "@/lib/stripe";
import { getWriteClient } from "@/sanity/lib/write";

/*
 * Bringing the sales from before this shop into the dashboard. The Stripe account is older than the
 * shop: what was sold there earlier is in Stripe and nowhere else. This reads those charges, newest
 * first, and writes each as an order (see stripe-import-map.ts for what one looks like).
 *
 * It runs in the dashboard, on the server, because that is where the Stripe key is. A run does a
 * bounded number of pages and remembers where it stopped, so a long history is fetched over a few
 * presses rather than one request that might time out. Every write is "create if it isn't there",
 * keyed by the charge, so pressing again, or starting over, never doubles anything. Nothing in
 * Stripe is changed.
 */
const STATE_ID = "private.stripeImport";
const PAGE = 100;

export type ImportState = { cursor?: string; done: boolean; lastRunAt?: string; skipped: Partial<Record<SkipReason, number>> };
export type ImportRun = { added: number; seen: number; skipped: Partial<Record<SkipReason, number>>; done: boolean };

const countImported = () => getWriteClient().fetch<number>(`count(*[_type == "order" && imported == true])`);

export async function importStatus(): Promise<ImportState & { imported: number }> {
  const client = getWriteClient();
  const [state, imported] = await Promise.all([client.getDocument<ImportState>(STATE_ID), countImported()]);
  return { cursor: state?.cursor, done: state?.done ?? false, lastRunAt: state?.lastRunAt, skipped: state?.skipped ?? {}, imported };
}

export async function runImport(pages = 8): Promise<ImportRun> {
  const stripe = getStripe();
  const client = getWriteClient();
  const state = await client.getDocument<ImportState>(STATE_ID);
  // A finished import starts again from the newest charge: cheap, and it picks up anything new.
  const resuming = Boolean(state && !state.done && state.cursor);
  let cursor = resuming ? state!.cursor : undefined;
  const skipped: Partial<Record<SkipReason, number>> = resuming ? { ...state!.skipped } : {};
  const ours = new Set(await client.fetch<string[]>(`*[_type == "order" && imported != true && defined(stripePaymentIntentId)].stripePaymentIntentId`));
  const before = await countImported();
  const now = new Date().toISOString();
  let seen = 0;
  let done = false;

  for (let page = 0; page < pages; page++) {
    const list = await stripe.charges.list({ limit: PAGE, ...(cursor ? { starting_after: cursor } : {}), expand: ["data.payment_intent"] });
    let tx = client.transaction();
    let writes = 0;
    for (const charge of list.data) {
      seen++;
      const mapped = orderFromCharge(charge, ours, now);
      if ("skip" in mapped) skipped[mapped.skip] = (skipped[mapped.skip] ?? 0) + 1;
      else {
        tx = tx.createIfNotExists(mapped.doc);
        writes++;
      }
    }
    if (writes) await tx.commit({ autoGenerateArrayKeys: false });
    cursor = list.data.at(-1)?.id ?? cursor;
    // Saved after every page, so a run cut short picks up where it was.
    await client.createOrReplace({ _id: STATE_ID, _type: "stripeImport", cursor, done: !list.has_more, lastRunAt: now, skipped });
    if (!list.has_more) {
      done = true;
      break;
    }
  }
  return { added: (await countImported()) - before, seen, skipped, done };
}

/** Takes every imported order out again. The shop's own orders are never touched; Stripe is not changed. */
export async function removeImported(): Promise<number> {
  const client = getWriteClient();
  let removed = 0;
  for (;;) {
    const ids = await client.fetch<string[]>(`*[_type == "order" && imported == true][0...200]._id`);
    if (!ids.length) break;
    let tx = client.transaction();
    for (const id of ids) tx = tx.delete(id);
    await tx.commit();
    removed += ids.length;
  }
  await client.delete(STATE_ID).catch(() => {});
  return removed;
}
