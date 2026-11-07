import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { intentRequestSchema, type IntentResponse } from "@/lib/checkout-schema";
import { getCustomer } from "@/lib/customer";
import { getLanguage } from "@/lib/language";
import { getWriteClient } from "@/sanity/lib/write";
import { METADATA_SITE, quoteCart } from "@/lib/orders";
import { checkoutMetadata } from "@/lib/checkout-metadata";
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
  const { items, customer, paymentIntentId, discountCode, visit } = parsed.data;
  const country = customer?.country ?? parsed.data.country;

  const quote = await quoteCart(items, { country, discountCode });
  if ("error" in quote) return NextResponse.json({ error: quote.error }, { status: 400 });
  const { lines, totals } = quote;

  // Price as charged, sizes and measurements travel on the intent, so the order record never has
  // to re-derive them later — and the customer's language, so their emails match the site they saw.
  // Who is paying comes from the signed session cookie, never from the request body.
  const account = await getCustomer();
  const metadata = checkoutMetadata({ quote, lang: await getLanguage(), country, customer, visit, userAgent: req.headers.get("user-agent"), account });

  try {
    // Before anything is created: refuse outright if this deployment's Stripe environment is one
    // that can't complete a payment, or could take one without recording an order.
    assertStripeEnvironment();
    const stripe = getStripe();
    const receipt = customer ? { receipt_email: customer.email } : {};

    // A signed-in customer gets a Stripe customer record (made once, id kept on their account), so
    // Stripe can save and show their cards. Card details stay entirely inside Stripe.
    let stripeCustomer: string | undefined;
    if (account) {
      stripeCustomer = account.stripeCustomerId;
      if (stripeCustomer) {
        const found = await stripe.customers.retrieve(stripeCustomer).catch(() => null);
        if (!found || ("deleted" in found && found.deleted)) stripeCustomer = undefined;
      }
      if (!stripeCustomer) {
        stripeCustomer = (await stripe.customers.create({ email: account.email, metadata: { site: METADATA_SITE, account: account._id } })).id;
        await getWriteClient().patch(account._id).set({ stripeCustomerId: stripeCustomer }).commit();
      }
    }
    const customerParam = stripeCustomer ? { customer: stripeCustomer } : {};

    let intent: Stripe.PaymentIntent | null = null;
    if (paymentIntentId) {
      const existing = await stripe.paymentIntents.retrieve(paymentIntentId).catch(() => null);
      if (existing && existing.metadata.site === METADATA_SITE && UPDATABLE.includes(existing.status)) {
        intent = await stripe.paymentIntents.update(existing.id, {
          amount: totals.totalOre,
          metadata,
          ...receipt,
          // An intent can gain a customer (signed in mid-checkout) but never change to another one.
          ...(stripeCustomer && !existing.customer ? customerParam : {}),
        });
      }
    }
    if (!intent) {
      intent = await stripe.paymentIntents.create({
        amount: totals.totalOre,
        currency: totals.currency,
        automatic_payment_methods: { enabled: true },
        metadata,
        ...receipt,
        ...customerParam,
      });
    }
    if (!intent.client_secret) throw new Error("PaymentIntent has no client secret");

    // Lets Stripe's form list this customer's saved cards and offer "save for next time".
    let customerSessionClientSecret: string | undefined;
    const intentCustomer = typeof intent.customer === "string" ? intent.customer : intent.customer?.id;
    if (stripeCustomer && intentCustomer === stripeCustomer) {
      const session = await stripe.customerSessions.create({
        customer: stripeCustomer,
        components: {
          payment_element: {
            enabled: true,
            features: { payment_method_redisplay: "enabled", payment_method_save: "enabled", payment_method_save_usage: "on_session", payment_method_remove: "enabled" },
          },
        },
      });
      customerSessionClientSecret = session.client_secret;
    }

    const response: IntentResponse = {
      clientSecret: intent.client_secret,
      paymentIntentId: intent.id,
      totals,
      lines,
      ...(quote.discountError ? { discountError: quote.discountError } : {}),
      ...(customerSessionClientSecret ? { customerSessionClientSecret } : {}),
    };
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
