import "server-only";
import type Stripe from "stripe";
import { computeTotals } from "./pricing";
import { orderReference } from "./money";
import { getWriteClient } from "@/sanity/lib/write";

/** What the intent route stores on the PaymentIntent: product id, quantity, and unit price as charged. */
type MetadataLine = { id: string; qty: number; p: number };

export type RecordedOrder = { orderNumber: string; created: boolean };

/**
 * Turns a paid PaymentIntent into an order document in Sanity, and counts the stock down — once.
 *
 * The document id is derived from the PaymentIntent id and written with `create`, not
 * `createIfNotExists`: inside a transaction, a second attempt fails atomically on the duplicate id,
 * so the stock decrements bundled with it can't apply twice either. That is the unique-key
 * guarantee the webhook's metadata check alone couldn't give, and it holds even for two deliveries
 * landing in the same instant. A duplicate is reported as `created: false` and is not an error.
 *
 * Product references and stock are best-effort until the catalogue lives in Sanity: a line whose
 * product has no document yet is recorded by name and price only.
 */
export async function recordOrder(intent: Stripe.PaymentIntent): Promise<RecordedOrder> {
  const client = getWriteClient();
  const orderNumber = orderReference(intent.id);
  const docId = `order-${intent.id}`;

  if (await client.getDocument(docId)) return { orderNumber, created: false };

  const lines = parseLines(intent.metadata.items);
  const totals = computeTotals(lines.map((l) => ({ unitPriceOre: l.p, quantity: l.qty })));

  const productIds = await client
    .fetch<{ slug?: string; _id?: string }[]>(`*[_type == "product" && slug.current in $slugs]{ "slug": slug.current, _id }`, {
      slugs: lines.map((l) => l.id),
    })
    .then(mapBySlug);

  const m = intent.metadata;
  let tx = client.transaction().create({
    _id: docId,
    _type: "order",
    orderNumber,
    status: "paid",
    orderedAt: new Date((intent.created ?? Date.now() / 1000) * 1000).toISOString(),
    customer: {
      name: m.customer_name ?? "",
      email: intent.receipt_email ?? m.customer_email ?? "",
      phone: m.customer_phone ?? "",
      address: m.customer_address ?? "",
      note: m.customer_note ?? "",
    },
    items: lines.map((l, i) => ({
      _key: `line-${i}`,
      _type: "orderItem",
      ...(productIds[l.id] ? { product: { _type: "reference", _ref: productIds[l.id] } } : {}),
      name: l.id,
      quantity: l.qty,
      unitPriceOre: l.p,
    })),
    subtotalOre: totals.subtotalOre,
    shippingOre: totals.shippingOre,
    vatIncludedOre: totals.vatIncludedOre,
    // The amount Stripe actually captured is the truth; the recomputed total should match it.
    totalOre: intent.amount_received || intent.amount,
    currency: intent.currency,
    paymentProvider: paymentProviderOf(intent),
    stripePaymentIntentId: intent.id,
  });
  for (const l of lines) {
    const id = productIds[l.id];
    if (id) tx = tx.patch(id, (p) => p.setIfMissing({ stock: 0 }).dec({ stock: l.qty }));
  }

  try {
    await tx.commit({ autoGenerateArrayKeys: false });
    return { orderNumber, created: true };
  } catch (err) {
    // A duplicate id means another delivery beat us to it, stock decrements included.
    if (err instanceof Error && /already exists/i.test(err.message)) return { orderNumber, created: false };
    throw err;
  }
}

function parseLines(raw: string | undefined): MetadataLine[] {
  if (!raw) return [];
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter((x): x is MetadataLine => typeof x === "object" && x !== null && "id" in x && "qty" in x)
    .map((x) => ({ id: String(x.id), qty: Number(x.qty) || 0, p: Number(x.p) || 0 }));
}

function mapBySlug(rows: { slug?: string; _id?: string }[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const r of rows) if (r.slug && r._id) out[r.slug] = r._id;
  return out;
}

function paymentProviderOf(intent: Stripe.PaymentIntent): string {
  const types = intent.payment_method_types ?? [];
  if (types.includes("klarna") && !types.includes("card")) return "klarna";
  return "stripe";
}
