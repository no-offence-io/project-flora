import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { sendOrderConfirmation } from "@/lib/notify";
import { getStripe } from "@/lib/stripe";
import { METADATA_SITE } from "@/lib/order-metadata";
import { recordOrder } from "@/lib/record-order";
import { getWriteClient } from "@/sanity/lib/write";
import { notice } from "@/lib/notices";

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

      if (order.oversold.length) {
        const what = order.oversold.join(", ");
        await getWriteClient().patch(order.docId).set({ internalNote: `SOLD TWICE: ${what}. Two customers paid at the same moment. Contact this customer and refund if it can't be made.` }).commit();
        await notice({ kind: "error", source: "orders", title: `${orderNumber} was paid for after ${what} had sold out`, detail: `Two customers paid at the same moment. Contact ${order.customer.name} (${order.customer.email}) and refund if it can't be made.`, href: `/admin/orders/${order.docId}`, dedupeKey: `oversold:${orderNumber}` });
      }

      // Stamp the PaymentIntent too, so the order number is visible in the Stripe dashboard.
      await getStripe().paymentIntents.update(intent.id, {
        metadata: { ...intent.metadata, orderNumber, orderedAt: new Date().toISOString() },
      });
      console.info(`[order ${orderNumber}] created from ${intent.id}: ${intent.amount} ${intent.currency}`);

      // Email is best-effort: a provider outage must not make Stripe retry and re-run the order.
      try {
        const sent = await sendOrderConfirmation(order);
        if (sent) await getWriteClient().patch(order.docId).set({ confirmationSentAt: new Date().toISOString() }).commit();
      } catch (err) {
        console.error(`[order ${orderNumber}] confirmation email failed`, err);
        await notice({ kind: "error", source: "email", title: `Confirmation email for ${orderNumber} failed`, detail: err instanceof Error ? err.message : String(err), href: `/admin/orders/${order.docId}`, dedupeKey: `confirm:${orderNumber}` });
      }
      // "Save my details" or a signed-in customer: keep the address (and measurements) on the account.
      try {
        const m = intent.metadata;
        const email = order.customer.email;
        if (email && (m.register === "1" || m.account)) {
          const { upsertCustomer, customerIdFor, makeSignInToken } = await import("@/lib/customer");
          const firstMeasured = order.lines.find((l) => l.measurements.length);
          const existing = await getWriteClient().getDocument<{ measurements?: unknown[] }>(customerIdFor(email));
          await upsertCustomer(email, {
            firstName: m.customer_first, lastName: m.customer_last, phonePrefix: m.customer_prefix, phone: m.customer_phone_only,
            street: m.customer_street, apartment: m.customer_apartment, postcode: m.customer_postcode, city: m.customer_city, country: m.customer_country,
            language: order.language,
            ...(firstMeasured && !(existing?.measurements ?? []).length ? { measurements: firstMeasured.measurements.map((x, i) => ({ ...x, _key: `m${i}`, _type: "measurement" })) as never } : {}),
          });
          if (m.register === "1" && !existing) {
            const { sendAccountWelcome } = await import("@/lib/notify");
            const base = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.prosjectflora.com").replace(/\/$/, "");
            await sendAccountWelcome(email, order.language, `${base}/account/verify?token=${encodeURIComponent(makeSignInToken(email))}&next=/account`);
          }
        }
      } catch (err) {
        console.error(`[order ${orderNumber}] saving account details failed`, err);
        await notice({ kind: "warning", source: "accounts", title: `Couldn't save the customer's details for ${orderNumber}`, detail: err instanceof Error ? err.message : String(err), href: `/admin/orders/${order.docId}` });
      }
      await notice({ kind: "info", source: "orders", title: `New order ${orderNumber} · ${(order.totals.totalOre / 100).toLocaleString("nb-NO")} kr`, detail: `${order.customer.name} · ${order.lines.map((l) => `${l.quantity} × ${l.name}`).join(", ")}`, href: `/admin/orders/${order.docId}`, dedupeKey: `order:${orderNumber}` });
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
      const docId = `order-${intentId}`;
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
