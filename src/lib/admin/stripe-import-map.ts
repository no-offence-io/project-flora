import type Stripe from "stripe";
import { importedOrderDocId } from "@/lib/doc-ids";
import { orderReference } from "@/lib/money";
import { METADATA_SITE } from "@/lib/order-metadata";

/*
 * One Stripe charge from before this shop, turned into an order the dashboard can show and count.
 * Pure, so the mapping is tested on its own; stripe-import.ts does the fetching and writing.
 *
 * An imported order is marked `imported` and `manual: "import"`: it sends no email, counts no stock
 * down, and is "Completed" from the start (or "Refunded" when the whole amount went back). Stripe
 * knows what was paid and by whom, not what was in the parcel, so each has a single line named
 * after the charge's own description.
 */
export type SkipReason = "notPaid" | "otherCurrency" | "thisShop";
export type ImportedOrder = Record<string, unknown> & { _id: string; _type: "order" };

const clean = (s: string | null | undefined, max: number) => (s ?? "").trim().slice(0, max);

function addressOf(a: Stripe.Address | null | undefined): string {
  if (!a) return "";
  return [a.line1, a.line2, [a.postal_code, a.city].filter(Boolean).join(" "), a.country].map((x) => (x ?? "").trim()).filter(Boolean).join(", ").slice(0, 500);
}

/**
 * `ours`: the payments this shop already has an order for. A charge of this shop's own is never
 * imported, whether or not its order exists: if the order is missing, that is a fault to be seen,
 * not something to paper over with an "earlier sale".
 */
export function orderFromCharge(charge: Stripe.Charge, ours: ReadonlySet<string>, importedAt: string): { doc: ImportedOrder } | { skip: SkipReason } {
  if (charge.status !== "succeeded" || !charge.paid || !(charge.amount_captured > 0)) return { skip: "notPaid" };
  if (charge.currency !== "nok") return { skip: "otherCurrency" };
  const intent = charge.payment_intent;
  const intentId = typeof intent === "string" ? intent : (intent?.id ?? null);
  if (intentId && ours.has(intentId)) return { skip: "thisShop" };
  if (intent && typeof intent === "object" && intent.metadata?.site === METADATA_SITE) return { skip: "thisShop" };
  if (charge.metadata?.site === METADATA_SITE) return { skip: "thisShop" };

  const refundedOre = charge.amount_refunded ?? 0;
  const allBack = charge.refunded || refundedOre >= charge.amount_captured;
  // A refunded order keeps what it was worth, like the shop's own; a partly refunded one counts what was kept.
  const totalOre = allBack ? charge.amount_captured : charge.amount_captured - refundedOre;
  const billing = charge.billing_details;
  const card = charge.payment_method_details?.card;
  const method = charge.payment_method_details?.type;
  const name = clean(billing?.name || charge.shipping?.name, 200);
  const email = clean(billing?.email || charge.receipt_email, 200).toLowerCase();
  const description = clean(charge.description, 200);
  const notes = [`Imported from Stripe on ${importedAt.slice(0, 10)}. Stripe charge ${charge.id}.`];
  if (refundedOre > 0 && !allBack) notes.push(`${refundedOre / 100} kr of the original ${charge.amount_captured / 100} kr was refunded.`);

  return {
    doc: {
      _id: importedOrderDocId(charge.id),
      _type: "order",
      imported: true,
      manual: "import",
      orderNumber: orderReference(charge.id),
      status: allBack ? "refunded" : "delivered",
      orderedAt: new Date(charge.created * 1000).toISOString(),
      language: "no",
      customer: { name, email, phone: clean(billing?.phone, 50), address: addressOf(charge.shipping?.address ?? billing?.address), note: "" },
      items: [{ _key: "line-0", _type: "orderItem", name: description || "Earlier sale", quantity: 1, unitPriceOre: totalOre, measurements: [] }],
      subtotalOre: totalOre,
      shippingOre: 0,
      vatIncludedOre: Math.round((totalOre * 0.25) / 1.25),
      totalOre,
      currency: "nok",
      paymentProvider: method === "klarna" ? "klarna" : "stripe",
      ...(card?.last4 ? { paymentCard: { brand: card.brand ?? "", last4: card.last4 } } : {}),
      origin: { label: "Earlier shop" },
      stripeChargeId: charge.id,
      ...(intentId ? { stripePaymentIntentId: intentId } : {}),
      internalNote: notes.join(" "),
    },
  };
}
