import "server-only";
import type { AppliedDiscount } from "./pricing";
import { client } from "@/sanity/lib/client";
import { getWriteClient } from "@/sanity/lib/write";
import { isLimited, withHold, type Hold } from "./discount-holds";

type DiscountDoc = {
  _id: string;
  code?: string;
  kind?: "percent" | "amount" | "shipping";
  value?: number;
  freeShipping?: boolean;
  active?: boolean;
  startsAt?: string;
  endsAt?: string;
  minSubtotalOre?: number;
  maxUses?: number;
  uses?: number;
  holds?: Hold[];
};

/** `limited`: the code has a maximum number of uses, so a checkout must hold one before it may charge with it. */
export type DiscountCheck = { ok: true; discount: AppliedDiscount; docId: string; limited: boolean } | { ok: false; reason: string };

export const USED_UP = "That code has been used up.";
export const NOT_VALID = "That code is not valid.";
export const TOO_MANY_CODES = "Too many codes tried from here. Please try again in an hour.";

/** Normalise what the customer typed to how codes are stored. */
export const normalizeCode = (raw: string) => raw.trim().toUpperCase().replace(/\s+/g, "");

/**
 * Validate a code against its document, read fresh from the API. Every rule lives here, and the
 * reasons are the customer-facing messages (English; the checkout shows them as-is).
 */
export async function checkDiscount(rawCode: string, subtotalOre: number): Promise<DiscountCheck> {
  const code = normalizeCode(rawCode);
  if (!/^[A-Z0-9-]{2,30}$/.test(code)) return { ok: false, reason: NOT_VALID };
  const doc = await client.withConfig({ useCdn: false }).fetch<DiscountDoc | null>(`*[_type == "discount" && upper(code) == $code][0]`, { code });
  if (!doc || doc.active === false) return { ok: false, reason: NOT_VALID };
  const now = Date.now();
  if (doc.startsAt && new Date(doc.startsAt).getTime() > now) return { ok: false, reason: "That code is not active yet." };
  if (doc.endsAt && new Date(doc.endsAt).getTime() < now) return { ok: false, reason: "That code has expired." };
  if (doc.maxUses !== undefined && doc.maxUses !== null && (doc.uses ?? 0) >= doc.maxUses) return { ok: false, reason: USED_UP };
  if (doc.minSubtotalOre && subtotalOre < doc.minSubtotalOre) return { ok: false, reason: `That code needs an order of at least ${Math.round(doc.minSubtotalOre / 100)} kr.` };
  const kind = doc.kind === "amount" || doc.kind === "shipping" ? doc.kind : "percent";
  return { ok: true, docId: doc._id, limited: isLimited(doc), discount: { code, kind, value: doc.value ?? 0, freeShipping: doc.freeShipping === true } };
}

/**
 * Puts this checkout's hold on one use of a limited code, or renews the one it has (see
 * discount-holds.ts). False means the last use went to someone else in the meantime, and the
 * checkout must go on without the discount.
 *
 * The write names the revision it read, so two checkouts racing for the last use cannot both get
 * it: the slower one's write is refused, it reads again and finds no room. If the document can't
 * be reached at all the answer is yes: a customer is never refused a code they were just quoted
 * because of a fault on our side.
 */
export async function holdDiscount(docId: string, key: string): Promise<boolean> {
  const write = getWriteClient();
  for (let attempt = 0; attempt < 5; attempt++) {
    let doc: (DiscountDoc & { _rev: string }) | undefined;
    try {
      doc = await write.getDocument<DiscountDoc & { _rev: string }>(docId);
    } catch (err) {
      console.error("[discount] hold unreadable, letting the code through", err);
      return true;
    }
    if (!doc) return false;
    const holds = withHold(doc, key, Date.now());
    if (!holds) return false;
    try {
      await write.patch(docId).ifRevisionId(doc._rev).set({ holds }).commit({ autoGenerateArrayKeys: false });
      return true;
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status !== 409) {
        console.error("[discount] hold not written, letting the code through", err);
        return true;
      }
      // Someone else changed the code between our read and our write: look again.
    }
  }
  return false;
}

/** Lets go of a checkout's hold when it no longer uses the code. Best effort: a hold left behind lapses by itself. */
export async function releaseDiscount(docId: string, key: string): Promise<void> {
  if (!/^[A-Za-z0-9-]{1,64}$/.test(key) || !/^[A-Za-z0-9._-]{1,128}$/.test(docId)) return;
  try {
    await getWriteClient().patch(docId).unset([`holds[key=="${key}"]`]).commit();
  } catch (err) {
    console.warn("[discount] hold not released; it will lapse", err instanceof Error ? err.message : err);
  }
}
