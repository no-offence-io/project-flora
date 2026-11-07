import { NextResponse } from "next/server";
import { notice } from "@/lib/notices";
import { verifyVippsWebhook, VippsError, type VippsWebhookEvent } from "@/lib/vipps";
import { settleVippsPayment, VIPPS_REFERENCE, vippsOrderDocId, vippsRefundState } from "@/lib/vipps-checkout";
import { getWriteClient } from "@/sanity/lib/write";

/**
 * Vipps → us. Registered with scripts/vipps-webhook.mjs, which also prints the secret that goes
 * into VIPPS_WEBHOOK_SECRET; deliveries that don't carry a valid signature for it are refused.
 *
 * The event is only a nudge: nothing in its body is trusted beyond the reference. Settling re-reads
 * the payment from Vipps and does the same idempotent work the return page does, so it doesn't
 * matter which of them arrives first, or whether Vipps delivers twice. A 500 makes Vipps retry
 * (for up to a week), which is what we want when our side is the problem.
 */
export async function POST(req: Request) {
  const rawBody = await req.text();
  const url = new URL(req.url);
  const ok = verifyVippsWebhook({
    rawBody,
    method: "POST",
    pathAndQuery: `${url.pathname}${url.search}`,
    host: req.headers.get("host") ?? url.host,
    date: req.headers.get("x-ms-date"),
    contentHash: req.headers.get("x-ms-content-sha256"),
    authorization: req.headers.get("authorization"),
  });
  if (!ok) {
    console.warn("[webhooks/vipps] bad signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: VippsWebhookEvent;
  try {
    event = JSON.parse(rawBody) as VippsWebhookEvent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { reference } = event;
  if (event.msn !== process.env.VIPPS_MSN || !VIPPS_REFERENCE.test(reference)) return NextResponse.json({ received: true, ignored: true });

  switch (event.name) {
    case "AUTHORIZED":
    case "ABORTED":
    case "EXPIRED":
    case "TERMINATED": {
      try {
        const outcome = await settleVippsPayment(reference);
        console.info(`[webhooks/vipps] ${event.name} ${reference} → ${outcome.state}`);
      } catch (err) {
        const detail = err instanceof VippsError ? `${err.message}: ${err.body}` : err instanceof Error ? err.message : String(err);
        await notice({ kind: "error", source: "payments", title: `A Vipps payment came in but could not be settled (${reference})`, detail, href: "/admin/orders", dedupeKey: `vipps-settle:${reference}` });
        return NextResponse.json({ error: "Settle failed" }, { status: 500 }); // → Vipps retries
      }
      break;
    }
    case "REFUNDED": {
      // Refunds made in the Vipps portal too, not only from our dashboard.
      const docId = vippsOrderDocId(reference);
      const order = await getWriteClient().getDocument<{ orderNumber?: string }>(docId);
      if (!order) break;
      const { full, refundedOre } = await vippsRefundState(reference);
      if (full) await getWriteClient().patch(docId).set({ status: "refunded" }).commit();
      const amount = `${(refundedOre / 100).toLocaleString("nb-NO")} kr`;
      await notice({ kind: "info", source: "orders", title: `${order.orderNumber} ${full ? "was refunded" : "was partly refunded"} · ${amount}`, detail: "The stock was not changed. If the piece is back and can be sold again, add it on the product page.", href: `/admin/orders/${docId}`, dedupeKey: `refund:${reference}:${refundedOre}` });
      break;
    }
    default:
      break;
  }
  return NextResponse.json({ received: true });
}
