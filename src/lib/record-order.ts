import "server-only";
import type Stripe from "stripe";
import { getShippingRules } from "./catalog";
import { linesFromMetadata } from "./orders";
import { computeTotals } from "./pricing";
import { orderReference } from "./money";
import { getWriteClient } from "@/sanity/lib/write";
import { orderDocId } from "@/lib/doc-ids";

export type RecordedLine = { name: string; quantity: number; unitPriceOre: number; size?: string; colour?: string; measurements: { label: string; value: string }[]; /** First product photo, for the confirmation email. */ image?: string };
export type RecordedOrder = {
  orderNumber: string;
  created: boolean;
  docId: string;
  lines: RecordedLine[];
  language: "en" | "no";
  customer: { name: string; email: string; address: string };
  totals: { subtotalOre: number; shippingOre: number; discountOre: number; discountCode?: string; vatIncludedOre: number; totalOre: number };
  /** Lines paid for after the last one had gone: two customers bought it at the same moment. */
  oversold: string[];
};

/** A payment that has gone through, described the same way whoever took it. */
export type PaidPayment = {
  provider: "stripe" | "klarna" | "vipps";
  /** The provider's own id: the PaymentIntent id, or the Vipps reference. */
  id: string;
  docId: string;
  orderNumber: string;
  amountOre: number;
  currency: string;
  /** ISO timestamp of when the payment was made. */
  createdAt: string;
  metadata: Record<string, string>;
  receiptEmail?: string;
  card?: { brand: string; last4: string };
};

/** The Stripe shape of it. The amount Stripe actually captured is the truth. */
export function paymentFromIntent(intent: Stripe.PaymentIntent): PaidPayment {
  return {
    provider: paymentProviderOf(intent),
    id: intent.id,
    docId: orderDocId(intent.id),
    orderNumber: orderReference(intent.id),
    amountOre: intent.amount_received || intent.amount,
    currency: intent.currency,
    createdAt: new Date((intent.created ?? Date.now() / 1000) * 1000).toISOString(),
    metadata: intent.metadata,
    ...(intent.receipt_email ? { receiptEmail: intent.receipt_email } : {}),
    ...paymentCardOf(intent),
  };
}

export const recordOrder = (intent: Stripe.PaymentIntent) => recordPaidOrder(paymentFromIntent(intent));

/**
 * Turns a settled payment into an order document in Sanity, and counts the stock down — once.
 *
 * The document id is derived from the PaymentIntent id and written with `create`, not
 * `createIfNotExists`: inside a transaction, a second attempt fails atomically on the duplicate id,
 * so the stock decrements and the discount's usage count bundled with it can't apply twice either.
 * That is the unique-key guarantee the webhook's metadata check alone couldn't give, and it holds
 * even for two deliveries landing in the same instant. A duplicate is reported as `created: false`
 * and is not an error.
 *
 * Sized products count down the chosen size's own stock (`sizes[label=="M"].stock`); the others
 * count down the product's single number. Made-to-measure lines on a sized product count down nothing.
 */
export async function recordPaidOrder(payment: PaidPayment): Promise<RecordedOrder> {
  const client = getWriteClient();
  const { orderNumber, docId } = payment;
  const m = payment.metadata;
  const language = m.lang === "no" ? "no" : "en";

  const lines = linesFromMetadata(m);
  const productRows = await client.fetch<{ slug?: string; _id?: string; name?: string; image?: string | null; trackStock?: boolean | null }[]>(
    // Product names are English in every language — the brand's choice.
    `*[_type == "product" && slug.current in $slugs]{ "slug": slug.current, _id, "name": name[_key == "en"][0].value, "image": images[0].asset->url, trackStock }`,
    { slugs: lines.map((l) => l.id) },
  );
  const products: Record<string, { _id: string; name: string; image?: string }> = {};
  const untracked = new Set(productRows.filter((r) => r.slug && r.trackStock === false).map((r) => r.slug!));
  for (const r of productRows) if (r.slug && r._id) products[r.slug] = { _id: r._id, name: r.name ?? r.slug, ...(r.image ? { image: r.image } : {}) };

  const recordedLines: RecordedLine[] = lines.map((l) => ({
    name: products[l.id]?.name ?? l.id,
    quantity: l.qty,
    unitPriceOre: l.p,
    ...(l.s ? { size: l.s } : {}),
    ...(l.c ? { colour: l.c } : {}),
    measurements: l.measurements,
    ...(products[l.id]?.image ? { image: products[l.id].image } : {}),
  }));
  const discountOre = Number(m.discount_ore ?? 0) || 0;
  const computed = computeTotals(
    lines.map((l) => ({ unitPriceOre: l.p, quantity: l.qty })),
    await getShippingRules(),
    { country: m.country, discount: m.discount ? { code: m.discount, kind: "amount", value: discountOre, freeShipping: false } : null },
  );
  // The amount the provider actually captured is the truth; the recomputed parts should add up to it.
  const totalOre = payment.amountOre;
  const totals = {
    subtotalOre: computed.subtotalOre,
    shippingOre: Math.max(0, totalOre - (computed.subtotalOre - discountOre)),
    discountOre,
    ...(m.discount ? { discountCode: m.discount } : {}),
    vatIncludedOre: Math.round((totalOre * 0.25) / 1.25),
    totalOre,
  };
  const customer = { name: m.customer_name ?? "", email: payment.receiptEmail ?? m.customer_email ?? "", address: m.customer_address ?? "" };
  const base: Omit<RecordedOrder, "created"> = { orderNumber, docId, lines: recordedLines, language, customer, totals, oversold: [] };

  if (await client.getDocument(docId)) return { ...base, created: false };

  // Where to find the payment at the provider, by the field the dashboard knows it under.
  const providerRef: Record<string, string> = payment.provider === "vipps" ? { vippsReference: payment.id } : { stripePaymentIntentId: payment.id };

  let tx = client.transaction().create({
    _id: docId,
    _type: "order",
    orderNumber,
    status: "paid",
    orderedAt: payment.createdAt,
    language,
    customer: {
      name: customer.name,
      email: customer.email,
      phone: m.customer_phone ?? "",
      address: customer.address,
      note: m.customer_note ?? "",
    },
    items: lines.map((l, i) => ({
      _key: `line-${i}`,
      _type: "orderItem",
      ...(products[l.id] ? { product: { _type: "reference", _ref: products[l.id]._id } } : {}),
      name: recordedLines[i].name,
      quantity: l.qty,
      unitPriceOre: l.p,
      ...(l.s ? { size: l.s } : {}),
      ...(l.c ? { colour: l.c } : {}),
      measurements: l.measurements.map((x, j) => ({ _key: `m-${j}`, _type: "measurement", label: x.label, value: x.value })),
    })),
    subtotalOre: totals.subtotalOre,
    shippingOre: totals.shippingOre,
    ...(m.discount ? { discountCode: m.discount, discountOre } : {}),
    vatIncludedOre: totals.vatIncludedOre,
    totalOre,
    currency: payment.currency,
    paymentProvider: payment.provider,
    ...(payment.card ? { paymentCard: payment.card } : {}),
    ...originOf(m.visit),
    ...providerRef,
  });
  for (const l of lines) {
    const id = products[l.id]?._id;
    if (!id) continue;
    // Made to measure is made to order, and some products don't count stock at all: nothing to count down.
    if (l.t || untracked.has(l.id)) continue;
    if (l.s) tx = tx.patch(id, (p) => p.dec({ [`sizes[label=="${l.s!.replace(/"/g, "")}"].stock`]: l.qty }));
    else tx = tx.patch(id, (p) => p.setIfMissing({ stock: 0 }).dec({ stock: l.qty }));
  }
  // The use is counted and this checkout's hold on it let go in the same breath (see discount-holds.ts).
  const hold = /^[A-Za-z0-9-]{1,64}$/.test(m.discount_hold ?? "") ? m.discount_hold : null;
  if (m.discount_doc) tx = tx.patch(m.discount_doc, (p) => (hold ? p.setIfMissing({ uses: 0 }).inc({ uses: 1 }).unset([`holds[key=="${hold}"]`]) : p.setIfMissing({ uses: 0 }).inc({ uses: 1 })));

  try {
    await tx.commit({ autoGenerateArrayKeys: false });
    return { ...base, created: true, oversold: await settleOversold(lines, products, untracked) };
  } catch (err) {
    // A duplicate id means another delivery beat us to it, stock decrements included.
    if (err instanceof Error && /already exists/i.test(err.message)) return { ...base, created: false };
    throw err;
  }
}

/**
 * Stock is checked before payment, so two customers can pay for the last piece at the same moment.
 * Stripe has taken both payments by now, so the second order stands: this finds what went below
 * zero, puts it back to zero so the shop reads sold out, and reports it for a person to resolve.
 */
async function settleOversold(lines: ReturnType<typeof linesFromMetadata>, products: Record<string, { _id: string; name: string }>, untracked: Set<string>): Promise<string[]> {
  const client = getWriteClient();
  const ids = lines.map((l) => products[l.id]?._id).filter(Boolean);
  const rows = await client.fetch<{ _id: string; stock?: number; sizes?: { label?: string; stock?: number }[] }[]>(`*[_id in $ids]{ _id, stock, sizes }`, { ids });
  const oversold: string[] = [];
  for (const l of lines) {
    if (l.t || untracked.has(l.id)) continue;
    const product = products[l.id];
    const row = rows.find((r) => r._id === product?._id);
    if (!row) continue;
    const path = l.s ? `sizes[label=="${l.s.replace(/"/g, "")}"].stock` : "stock";
    const left = l.s ? row.sizes?.find((s) => s.label === l.s)?.stock : row.stock;
    if ((left ?? 0) >= 0) continue;
    oversold.push(`${product.name}${l.s ? ` (${l.s})` : ""}`);
    await client.patch(row._id).set({ [path]: 0 }).commit();
  }
  return oversold;
}

/** "Visa ending in 2560", when the webhook expanded the payment method. Only brand and last four — never more. */
function paymentCardOf(intent: Stripe.PaymentIntent): { paymentCard?: { brand: string; last4: string } } {
  const pm = intent.payment_method;
  if (pm && typeof pm === "object" && pm.card) return { paymentCard: { brand: pm.card.brand, last4: pm.card.last4 } };
  return {};
}

/** The visit the checkout described (see visit-shared.ts), in the order's own words. */
type Origin = { label: string; device?: string; pageViews?: number; landing?: string; referrer?: string; campaign?: string };
function originOf(raw: string | undefined): { origin?: Origin } {
  if (!raw) return {};
  try {
    const v = JSON.parse(raw) as { l?: string; d?: string; v?: number; p?: string; r?: string; c?: string };
    return { origin: { label: String(v.l ?? "Direct"), ...(v.d ? { device: String(v.d) } : {}), ...(v.v ? { pageViews: Number(v.v) } : {}), ...(v.p ? { landing: String(v.p) } : {}), ...(v.r ? { referrer: String(v.r) } : {}), ...(v.c ? { campaign: String(v.c) } : {}) } };
  } catch {
    return {};
  }
}

function paymentProviderOf(intent: Stripe.PaymentIntent): "stripe" | "klarna" {
  const types = intent.payment_method_types ?? [];
  if (types.includes("klarna") && !types.includes("card")) return "klarna";
  return "stripe";
}
