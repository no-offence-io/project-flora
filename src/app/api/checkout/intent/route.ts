import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { intentRequestSchema, type IntentResponse } from "@/lib/checkout-schema";
import { METADATA_SITE, quoteCart } from "@/lib/orders";
import { getStripe } from "@/lib/stripe";

/** A PaymentIntent can only have its amount changed before the customer has confirmed it. */
const UPDATABLE: Stripe.PaymentIntent.Status[] = ["requires_payment_method", "requires_confirmation"];

/**
 * Quote the cart and create or update the PaymentIntent for it.
 *
 * Amounts come exclusively from the product data and the server-side pricing rules; the request
 * may only name products and quantities. Card details never pass through here — the browser hands
 * them straight to Stripe inside the Payment Element, and this route only ever sees the intent's
 * client secret, which is safe to return.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = intentRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })) },
      { status: 400 },
    );
  }
  const { items, customer, paymentIntentId } = parsed.data;

  const quote = quoteCart(items);
  if ("error" in quote) return NextResponse.json({ error: quote.error }, { status: 400 });
  const { lines, totals } = quote;

  const metadata: Record<string, string> = {
    site: METADATA_SITE,
    items: JSON.stringify(lines.map((l) => ({ id: l.id, qty: l.quantity }))),
  };
  if (customer) {
    metadata.customer_email = customer.email;
    metadata.customer_name = `${customer.firstName} ${customer.lastName}`;
    metadata.customer_phone = `${customer.phonePrefix} ${customer.phone}`;
    metadata.customer_address = [customer.street, customer.apartment, `${customer.postcode} ${customer.city}`, customer.country]
      .filter(Boolean)
      .join(", ")
      .slice(0, 500);
    if (customer.note) metadata.customer_note = customer.note.slice(0, 500);
  }

  try {
    const stripe = getStripe();
    const receipt = customer ? { receipt_email: customer.email } : {};

    let intent: Stripe.PaymentIntent | null = null;
    if (paymentIntentId) {
      const existing = await stripe.paymentIntents.retrieve(paymentIntentId).catch(() => null);
      if (existing && existing.metadata.site === METADATA_SITE && UPDATABLE.includes(existing.status)) {
        intent = await stripe.paymentIntents.update(existing.id, { amount: totals.totalOre, metadata, ...receipt });
      }
    }
    if (!intent) {
      intent = await stripe.paymentIntents.create({
        amount: totals.totalOre,
        currency: totals.currency,
        automatic_payment_methods: { enabled: true },
        metadata,
        ...receipt,
      });
    }
    if (!intent.client_secret) throw new Error("PaymentIntent has no client secret");

    const response: IntentResponse = { clientSecret: intent.client_secret, paymentIntentId: intent.id, totals, lines };
    return NextResponse.json(response);
  } catch (err) {
    console.error("[checkout/intent]", err);
    const notConfigured = err instanceof Error && err.message.startsWith("STRIPE_SECRET_KEY");
    return NextResponse.json(
      { error: notConfigured ? "Payments are not configured on this server." : "Could not start payment. Please try again." },
      { status: 500 },
    );
  }
}
