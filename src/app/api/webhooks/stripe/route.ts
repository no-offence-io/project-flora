import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { afterOrderCreated } from "@/lib/order-followup";
import { getStripe } from "@/lib/stripe";
import { METADATA_SITE } from "@/lib/order-metadata";
import { recordOrder } from "@/lib/record-order";
import { getWriteClient } from "@/sanity/lib/write";
import { notice } from "@/lib/notices";
import { orderDocId } from "@/lib/doc-ids";

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
 * The Stripe account is shared with the old shop, so every event arrives here: payments not marked
 * as ours are ignored, and a refund only counts if it belongs to an order we have.
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
      if (event.data.object.metadata.site !== METADATA_SITE) break;
      // Re-read, don't trust event.data.object: see the note on idempotency above.
      const intent = await getStripe().paymentIntents.retrieve(event.data.object.id, { expand: ["payment_method"] });

      // The order document in Sanity is the record; it is written first and is the unique key.
      // If this throws (say SANITY_TOKEN is missing on the server), the 500 below makes Stripe
      // retry for days, and the retry succeeds once the server is fixed — nothing is lost.
      let order;
      try {
        order = await recordOrder(intent);
      } catch (err) {
        await notice({ kind: "error", source: "payments", title: `A payment came in but the order could not be recorded (${intent.id})`, detail: err instanceof Error ? err.message : String(err), href: "/admin/orders", dedupeKey: `record:${intent.id}` });
        throw err; // 500 → Stripe retries
      }
      const { orderNumber, created } = order;
      if (!created) break; // a retry or replay: the order, and its stock, are already recorded

      // Stamp the PaymentIntent too, so the order number is visible in the Stripe dashboard.
      await getStripe().paymentIntents.update(intent.id, {
        metadata: { ...intent.metadata, orderNumber, orderedAt: new Date().toISOString() },
      });
      console.info(`[order ${orderNumber}] created from ${intent.id}: ${intent.amount} ${intent.currency}`);
      await afterOrderCreated(order, intent.metadata);
      break;
    }
    case "payment_intent.payment_failed": {
      const intent = event.data.object;
      if (intent.metadata.site !== METADATA_SITE) break;
      console.warn(`[payment failed] ${intent.id}: ${intent.last_payment_error?.message ?? "unknown reason"}`);
      await notice({ kind: "warning", source: "payments", title: "A payment attempt failed", detail: `${intent.receipt_email ?? intent.metadata.customer_email ?? "unknown customer"}: ${intent.last_payment_error?.message ?? "unknown reason"}`, dedupeKey: `failed:${intent.id}` });
      break;
    }
    case "charge.refunded": {
      // Refunds made in Stripe's own dashboard too, not only from ours.
      const charge = event.data.object;
      const intentId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
      if (!intentId) break;
      const docId = orderDocId(intentId);
      const order = await getWriteClient().getDocument<{ orderNumber?: string }>(docId);
      if (!order) break; // the old shop, or a payment from before this one
      const amount = `${(charge.amount_refunded / 100).toLocaleString("nb-NO")} kr`;
      if (charge.refunded) await getWriteClient().patch(docId).set({ status: "refunded" }).commit();
      await notice({ kind: "info", source: "orders", title: `${order.orderNumber} ${charge.refunded ? "was refunded" : "was partly refunded"} · ${amount}`, detail: "The stock was not changed. If the piece is back and can be sold again, add it on the product page.", href: `/admin/orders/${docId}`, dedupeKey: `refund:${intentId}:${charge.amount_refunded}` });
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
