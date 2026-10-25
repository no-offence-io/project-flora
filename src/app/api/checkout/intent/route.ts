import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { intentRequestSchema, type IntentResponse } from "@/lib/checkout-schema";
import { getLanguage } from "@/lib/language";
import { METADATA_SITE, quoteCart, quoteToMetadata } from "@/lib/orders";
import { assertStripeEnvironment, getStripe, StripeConfigError } from "@/lib/stripe";

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
    const issues = parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
    console.warn("[checkout/intent] rejected:", issues);
    return NextResponse.json({ error: "Invalid request", issues }, { status: 400 });
  }
  const { items, customer, paymentIntentId, discountCode } = parsed.data;
  const country = customer?.country ?? parsed.data.country;

  const quote = await quoteCart(items, { country, discountCode });
  if ("error" in quote) return NextResponse.json({ error: quote.error }, { status: 400 });
  const { lines, totals } = quote;

  // Price as charged, sizes and measurements travel on the intent, so the order record never has
  // to re-derive them later — and the customer's language, so their emails match the site they saw.
  const metadata = quoteToMetadata(quote, { lang: await getLanguage(), country });
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
    // Before anything is created: refuse outright if this deployment's Stripe environment is one
    // that can't complete a payment, or could take one without recording an order.
    assertStripeEnvironment();
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

    const response: IntentResponse = { clientSecret: intent.client_secret, paymentIntentId: intent.id, totals, lines, ...(quote.discountError ? { discountError: quote.discountError } : {}) };
    return NextResponse.json(response);
  } catch (err) {
    console.error("[checkout/intent]", err);
    // A misconfiguration is worth saying plainly in the response: only an operator can act on it,
    // and the alternative is a customer staring at a generic failure that never resolves.
    if (err instanceof StripeConfigError) {
      return NextResponse.json({ error: `Payments are misconfigured on this server. ${err.message}` }, { status: 500 });
    }
    return NextResponse.json({ error: "Could not start payment. Please try again." }, { status: 500 });
  }
}
