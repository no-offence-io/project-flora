import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { orderReference } from "@/lib/money";
import { sendOrderConfirmation } from "@/lib/notify";
import { getStripe } from "@/lib/stripe";

/**
 * Stripe → us. This is the only place an order is ever created: the success page displays state,
 * it never writes it, so closing the tab mid-payment cannot leave a half-made order and a forged
 * success URL cannot make one either.
 *
 * Idempotent in two layers. The order number is derived from the PaymentIntent id, so a retry, a
 * replay from the dashboard, or two deliveries racing each other all write the identical value —
 * there is no second order to make. And before doing anything, the handler re-reads the live
 * PaymentIntent and skips if it already carries an order number: that is what stops the side
 * effects (email, later stock) from running twice. The live object, not the event's copy — a retry
 * carries the same snapshot Stripe took before the first delivery stamped the order, so trusting
 * it would record the order again on every retry.
 *
 * Two deliveries arriving in the same instant could still both pass that read. Stripe retries are
 * sequential so this doesn't happen in practice; a datastore with a unique key on the intent id is
 * the real fix once orders live somewhere other than Stripe's metadata.
 *
 * The signature check needs the raw request body; parsing it as JSON first would break it.
 */
export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) return NextResponse.json({ error: "Webhook not configured" }, { status: 400 });

  const rawBody = await req.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    console.warn("[webhooks/stripe] bad signature", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "payment_intent.succeeded": {
      // Re-read, don't trust event.data.object: see the note on idempotency above.
      const intent = await getStripe().paymentIntents.retrieve(event.data.object.id);
      if (intent.metadata.orderNumber) break; // already recorded — a retry or replay

      const orderNumber = orderReference(intent.id);
      // The PaymentIntent is the order record for now (no database in this project — see README).
      // Stamping it with the order number is what makes the order "exist"; everything else about
      // the order (items, customer, amounts) is already on it from the intent route.
      await getStripe().paymentIntents.update(intent.id, {
        metadata: { ...intent.metadata, orderNumber, orderedAt: new Date().toISOString() },
      });
      console.info(`[order ${orderNumber}] created from ${intent.id}: ${intent.amount} ${intent.currency}`);

      // Stock: products live in a static file, so there is nothing durable to decrement here.
      // When a datastore is added, decrement it in this block, in one transaction, keyed on the
      // order number so a replay stays a no-op.

      await sendOrderConfirmation({
        orderNumber,
        email: intent.receipt_email ?? intent.metadata.customer_email ?? null,
        totalOre: intent.amount,
        currency: intent.currency,
      });
      break;
    }
    case "payment_intent.payment_failed": {
      const intent = event.data.object;
      console.warn(`[payment failed] ${intent.id}: ${intent.last_payment_error?.message ?? "unknown reason"}`);
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
