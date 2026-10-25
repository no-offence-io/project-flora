import "server-only";
import type Stripe from "stripe";
import { getShippingRules } from "./catalog";
import { linesFromMetadata } from "./orders";
import { computeTotals } from "./pricing";
import { orderReference } from "./money";
import { getWriteClient } from "@/sanity/lib/write";

export type RecordedLine = { name: string; quantity: number; unitPriceOre: number; size?: string; measurements: { label: string; value: string }[]; /** First product photo, for the confirmation email. */ image?: string };
export type RecordedOrder = {
  orderNumber: string;
  created: boolean;
  docId: string;
  lines: RecordedLine[];
  language: "en" | "no";
  customer: { name: string; email: string; address: string };
  totals: { subtotalOre: number; shippingOre: number; discountOre: number; discountCode?: string; vatIncludedOre: number; totalOre: number };
};

/**
 * Turns a paid PaymentIntent into an order document in Sanity, and counts the stock down — once.
 *
 * The document id is derived from the PaymentIntent id and written with `create`, not
 * `createIfNotExists`: inside a transaction, a second attempt fails atomically on the duplicate id,
 * so the stock decrements and the discount's usage count bundled with it can't apply twice either.
 * That is the unique-key guarantee the webhook's metadata check alone couldn't give, and it holds
 * even for two deliveries landing in the same instant. A duplicate is reported as `created: false`
 * and is not an error.
 *
 * Sized products count down the chosen size's own stock (`sizes[label=="M"].stock`); the others
 * count down the product's single number.
 */
export async function recordOrder(intent: Stripe.PaymentIntent): Promise<RecordedOrder> {
  const client = getWriteClient();
  const orderNumber = orderReference(intent.id);
  const docId = `order-${intent.id}`;
  const m = intent.metadata;
  const language = m.lang === "no" ? "no" : "en";

  const lines = linesFromMetadata(m);
  const productRows = await client.fetch<{ slug?: string; _id?: string; name?: string; image?: string | null }[]>(
    // Product names are English in every language — the brand's choice.
    `*[_type == "product" && slug.current in $slugs]{ "slug": slug.current, _id, "name": name[_key == "en"][0].value, "image": images[0].asset->url }`,
    { slugs: lines.map((l) => l.id) },
  );
  const products: Record<string, { _id: string; name: string; image?: string }> = {};
  for (const r of productRows) if (r.slug && r._id) products[r.slug] = { _id: r._id, name: r.name ?? r.slug, ...(r.image ? { image: r.image } : {}) };

  const recordedLines: RecordedLine[] = lines.map((l) => ({
    name: products[l.id]?.name ?? l.id,
    quantity: l.qty,
    unitPriceOre: l.p,
    ...(l.s ? { size: l.s } : {}),
    measurements: l.measurements,
    ...(products[l.id]?.image ? { image: products[l.id].image } : {}),
  }));
  const discountOre = Number(m.discount_ore ?? 0) || 0;
  const computed = computeTotals(
    lines.map((l) => ({ unitPriceOre: l.p, quantity: l.qty })),
    await getShippingRules(),
    { country: m.country, discount: m.discount ? { code: m.discount, kind: "amount", value: discountOre, freeShipping: false } : null },
  );
  // The amount Stripe actually captured is the truth; the recomputed parts should add up to it.
  const totalOre = intent.amount_received || intent.amount;
  const totals = {
    subtotalOre: computed.subtotalOre,
    shippingOre: Math.max(0, totalOre - (computed.subtotalOre - discountOre)),
    discountOre,
    ...(m.discount ? { discountCode: m.discount } : {}),
    vatIncludedOre: Math.round((totalOre * 0.25) / 1.25),
    totalOre,
  };
  const customer = { name: m.customer_name ?? "", email: intent.receipt_email ?? m.customer_email ?? "", address: m.customer_address ?? "" };
  const base = { orderNumber, docId, lines: recordedLines, language, customer, totals } as const;

  if (await client.getDocument(docId)) return { ...base, created: false };

  let tx = client.transaction().create({
    _id: docId,
    _type: "order",
    orderNumber,
    status: "paid",
    orderedAt: new Date((intent.created ?? Date.now() / 1000) * 1000).toISOString(),
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
      measurements: l.measurements.map((x, j) => ({ _key: `m-${j}`, _type: "measurement", label: x.label, value: x.value })),
    })),
    subtotalOre: totals.subtotalOre,
    shippingOre: totals.shippingOre,
    ...(m.discount ? { discountCode: m.discount, discountOre } : {}),
    vatIncludedOre: totals.vatIncludedOre,
    totalOre,
    currency: intent.currency,
    paymentProvider: paymentProviderOf(intent),
    stripePaymentIntentId: intent.id,
  });
  for (const l of lines) {
    const id = products[l.id]?._id;
    if (!id) continue;
    if (l.s) tx = tx.patch(id, (p) => p.dec({ [`sizes[label=="${l.s!.replace(/"/g, "")}"].stock`]: l.qty }));
    else tx = tx.patch(id, (p) => p.setIfMissing({ stock: 0 }).dec({ stock: l.qty }));
  }
  if (m.discount_doc) tx = tx.patch(m.discount_doc, (p) => p.setIfMissing({ uses: 0 }).inc({ uses: 1 }));

  try {
    await tx.commit({ autoGenerateArrayKeys: false });
    return { ...base, created: true };
  } catch (err) {
    // A duplicate id means another delivery beat us to it, stock decrements included.
    if (err instanceof Error && /already exists/i.test(err.message)) return { ...base, created: false };
    throw err;
  }
}

function paymentProviderOf(intent: Stripe.PaymentIntent): string {
  const types = intent.payment_method_types ?? [];
  if (types.includes("klarna") && !types.includes("card")) return "klarna";
  return "stripe";
}
