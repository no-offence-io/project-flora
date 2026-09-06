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
 * Idempotent by construction. The order number is derived from the PaymentIntent id, so a retry,
 * a replay from the dashboard, or two deliveries racing each other all write the identical value
 * — there is no second order to make. A PaymentIntent that already carries an order number is
 * acknowledged and skipped.
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
      const intent = event.data.object;
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
