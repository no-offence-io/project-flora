import "server-only";
import { orderFromCharge, type SkipReason } from "./stripe-import-map";
import { getStripe } from "@/lib/stripe";
import { getWriteClient } from "@/sanity/lib/write";

/*
 * Bringing the sales from before this shop into the dashboard. The Stripe account is older than the
 * shop: what was sold there earlier is in Stripe and nowhere else. This reads those charges, newest
 * first, and writes each as an order (see stripe-import-map.ts for what one looks like).
 *
 * It runs on the server, because that is where the Stripe key is. A run does a bounded number of
 * pages and remembers where it stopped, so a long history is fetched in stretches rather than in one
 * request that might time out. Once asked for (the button on the Payments page), the background
 * sweep carries it on by itself every few minutes until the whole history is in; nobody has to keep
 * pressing. Removing the imported sales also switches that off, so they do not come straight back. Every write is "create if it isn't there",
 * keyed by the charge, so pressing again, or starting over, never doubles anything. Nothing in
 * Stripe is changed.
 */
const STATE_ID = "private.stripeImport";
const PAGE = 100;

export type ImportState = {
  /** The import has been asked for and not taken back: the sweep carries it on until `done`. */
  wanted?: boolean;
  cursor?: string;
  done: boolean;
  lastRunAt?: string;
  /** Charges looked at so far in this pass. */
  seen?: number;
  skipped: Partial<Record<SkipReason, number>>;
  /** How many charges were in each currency, for the page to say what was converted. */
  currencies?: Record<string, number>;
  /** Why the last run stopped, when it did not finish cleanly. */
  lastError?: string;
};
export type ImportRun = { added: number; seen: number; skipped: Partial<Record<SkipReason, number>>; done: boolean };

const countImported = () => getWriteClient().fetch<number>(`count(*[_type == "order" && imported == true])`);

export async function importStatus(): Promise<ImportState & { imported: number }> {
  const client = getWriteClient();
  const [state, imported] = await Promise.all([client.getDocument<ImportState>(STATE_ID), countImported()]);
  return { wanted: state?.wanted ?? false, cursor: state?.cursor, done: state?.done ?? false, lastRunAt: state?.lastRunAt, seen: state?.seen ?? 0, skipped: state?.skipped ?? {}, currencies: state?.currencies ?? {}, lastError: state?.lastError, imported };
}

/** For the sweep: carries on an import that was asked for and is not finished. Says what it did, or null when there was nothing to do. */
export async function continueImport(): Promise<ImportRun | null> {
  const client = getWriteClient();
  const state = await client.getDocument<ImportState>(STATE_ID);
  if (!state?.wanted || state.done) return null;
  try {
    return await runImport(4);
  } catch (err) {
    const message = err instanceof Error ? err.message.slice(0, 300) : String(err);
    await client.createOrReplace({ ...state, _id: STATE_ID, _type: "stripeImport", lastError: message, lastRunAt: new Date().toISOString() });
    throw err;
  }
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
  const seenBefore = resuming ? (state!.seen ?? 0) : 0;
  const currencies: Record<string, number> = resuming ? { ...(state!.currencies ?? {}) } : {};

  for (let page = 0; page < pages; page++) {
    const list = await stripe.charges.list({ limit: PAGE, ...(cursor ? { starting_after: cursor } : {}), expand: ["data.payment_intent", "data.balance_transaction"] });
    let tx = client.transaction();
    let writes = 0;
    for (const charge of list.data) {
      seen++;
      if (charge.paid) currencies[charge.currency] = (currencies[charge.currency] ?? 0) + 1;
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
    await client.createOrReplace({ _id: STATE_ID, _type: "stripeImport", wanted: true, cursor, done: !list.has_more, lastRunAt: now, seen: seenBefore + seen, skipped, currencies });
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
  // Kept, switched off: otherwise the sweep would bring them straight back.
  await client.createOrReplace({ _id: STATE_ID, _type: "stripeImport", wanted: false, done: false, skipped: {} });
  return removed;
}
