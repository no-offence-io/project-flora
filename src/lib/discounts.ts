import "server-only";
import type { AppliedDiscount } from "./pricing";
import { client } from "@/sanity/lib/client";

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
};

export type DiscountCheck = { ok: true; discount: AppliedDiscount; docId: string } | { ok: false; reason: string };

/** Normalise what the customer typed to how codes are stored. */
export const normalizeCode = (raw: string) => raw.trim().toUpperCase().replace(/\s+/g, "");

/**
 * Validate a code against its document, read fresh from the API. Every rule lives here, and the
 * reasons are the customer-facing messages (English; the checkout shows them as-is).
 */
export async function checkDiscount(rawCode: string, subtotalOre: number): Promise<DiscountCheck> {
  const code = normalizeCode(rawCode);
  if (!/^[A-Z0-9-]{2,30}$/.test(code)) return { ok: false, reason: "That code is not valid." };
  const doc = await client.withConfig({ useCdn: false }).fetch<DiscountDoc | null>(`*[_type == "discount" && upper(code) == $code][0]`, { code });
  if (!doc || doc.active === false) return { ok: false, reason: "That code is not valid." };
  const now = Date.now();
  if (doc.startsAt && new Date(doc.startsAt).getTime() > now) return { ok: false, reason: "That code is not active yet." };
  if (doc.endsAt && new Date(doc.endsAt).getTime() < now) return { ok: false, reason: "That code has expired." };
  if (doc.maxUses !== undefined && doc.maxUses !== null && (doc.uses ?? 0) >= doc.maxUses) return { ok: false, reason: "That code has been used up." };
  if (doc.minSubtotalOre && subtotalOre < doc.minSubtotalOre) return { ok: false, reason: `That code needs an order of at least ${Math.round(doc.minSubtotalOre / 100)} kr.` };
  const kind = doc.kind === "amount" || doc.kind === "shipping" ? doc.kind : "percent";
  return { ok: true, docId: doc._id, discount: { code, kind, value: doc.value ?? 0, freeShipping: doc.freeShipping === true } };
}
