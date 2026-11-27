import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { intentRequestSchema, type IntentResponse } from "@/lib/checkout-schema";
import { getCustomer } from "@/lib/customer";
import { getLanguage } from "@/lib/language";
import { getWriteClient } from "@/sanity/lib/write";
import { METADATA_SITE, quoteCart, type CartQuote } from "@/lib/orders";
import { holdDiscount, NOT_VALID, releaseDiscount, TOO_MANY_CODES, USED_UP } from "@/lib/discounts";
import { allow, count, overLimit } from "@/lib/rate-limit";
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

  // Guessing at discount codes: after too many that don't exist, codes from this visitor are not
  // looked at for a while. Only wrong guesses are counted, so a customer with a real code never notices.
  const guessing = discountCode ? await overLimit("discount", req.headers) : false;
  const first = await quoteCart(items, { country, discountCode: guessing ? undefined : discountCode });
  if ("error" in first) return NextResponse.json({ error: first.error }, { status: 400 });
  let quote: CartQuote = guessing ? { ...first, discountError: TOO_MANY_CODES } : first;
  if (!guessing && discountCode && quote.discountError === NOT_VALID) await count("discount", req.headers);

  // Who is paying comes from the signed session cookie, never from the request body.
  const account = await getCustomer();

  try {
    // Before anything is created: refuse outright if this deployment's Stripe environment is one
    // that can't complete a payment, or could take one without recording an order.
    assertStripeEnvironment();
    const stripe = getStripe();

    // The payment being re-priced, if the browser has one of ours that can still change.
    let existing: Stripe.PaymentIntent | null = null;
    if (paymentIntentId) {
      const found = await stripe.paymentIntents.retrieve(paymentIntentId).catch(() => null);
      if (found && found.metadata.site === METADATA_SITE && UPDATABLE.includes(found.status)) existing = found;
    }
    // Starting a payment is what costs something; re-pricing one already started is not counted.
    if (!existing && !(await allow("checkout", req.headers))) {
      return NextResponse.json({ error: "Too many payments started from here. Please try again in a little while." }, { status: 429 });
    }

    // A code with a limited number of uses: this checkout holds one of them while it is alive, or
    // goes on without the discount if the last one went to someone else (see discount-holds.ts).
    const heldBefore = existing?.metadata.discount_hold;
    if (quote.discount?.limited) {
      const key = heldBefore || randomUUID();
      if (await holdDiscount(quote.discount.docId, key)) quote.discount.holdKey = key;
      else {
        const without = await quoteCart(items, { country });
        if ("error" in without) return NextResponse.json({ error: without.error }, { status: 400 });
        quote = { ...without, discountError: USED_UP };
      }
    }
    if (heldBefore && existing?.metadata.discount_doc && quote.discount?.holdKey !== heldBefore) await releaseDiscount(existing.metadata.discount_doc, heldBefore);
    const { lines, totals } = quote;

    // Price as charged, sizes and measurements travel on the intent, so the order record never has
    // to re-derive them later — and the customer's language, so their emails match the site they saw.
    const metadata = checkoutMetadata({ quote, lang: await getLanguage(), country, customer, visit, userAgent: req.headers.get("user-agent"), account });
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
    if (existing) {
      // Stripe merges metadata, so anything the cart no longer has (a discount taken off, the
      // measurements of a line that is gone) is blanked here, or it would ride into the order.
      const gone = Object.fromEntries(Object.keys(existing.metadata).filter((k) => !(k in metadata)).map((k) => [k, ""]));
      intent = await stripe.paymentIntents.update(existing.id, {
        amount: totals.totalOre,
        metadata: { ...gone, ...metadata },
        ...receipt,
        // An intent can gain a customer (signed in mid-checkout) but never change to another one.
        ...(stripeCustomer && !existing.customer ? customerParam : {}),
      });
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
