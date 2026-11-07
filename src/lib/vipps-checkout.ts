import "server-only";
import { notice } from "./notices";
import { orderReference } from "./money";
import { afterOrderCreated } from "./order-followup";
import { recordPaidOrder } from "./record-order";
import { captureVippsPayment, getVippsPayment, vippsEnv, type VippsPayment } from "./vipps";
import { getWriteClient } from "@/sanity/lib/write";

/*
 * The shop's side of a Vipps payment. The checkout writes a `vippsPayment` document with the quoted
 * cart before sending the customer to Vipps; `settleVippsPayment` is then called from wherever news
 * arrives first — the customer landing back on the site, Vipps' webhook, or a later poll — and does
 * the same thing every time: read the live state from Vipps, capture if authorised, write the
 * order. Every step is idempotent (capture carries an idempotency key, the order id is derived from
 * the reference), so two of these racing each other produce one capture and one order.
 */

export const VIPPS_REFERENCE = /^fl-[a-f0-9]{24}$/;
export const vippsDocId = (reference: string) => `vipps-${reference}`;
export const vippsOrderDocId = (reference: string) => `order-vipps-${reference}`;

export type StoredVippsPayment = { _id: string; reference: string; status: string; amountOre: number; email?: string; metadata: string; environment: string; createdAt: string; orderId?: string };

export type VippsOutcome =
  | { state: "paid"; orderNumber: string; amountOre: number }
  | { state: "pending" }
  | { state: "cancelled" }
  | { state: "failed"; reason: string }
  | { state: "unknown" };

export async function settleVippsPayment(reference: string): Promise<VippsOutcome> {
  if (!VIPPS_REFERENCE.test(reference)) return { state: "unknown" };
  const client = getWriteClient();
  const doc = await client.getDocument<StoredVippsPayment>(vippsDocId(reference));
  if (!doc) return { state: "unknown" };
  const paid = { state: "paid" as const, orderNumber: orderReference(reference), amountOre: doc.amountOre };
  if (doc.orderId) return paid;
  if (doc.status === "aborted" || doc.status === "expired" || doc.status === "terminated") return { state: "cancelled" };
  // Keys from one environment can't read the other's payments; a test payment on the live site stays unknown.
  if (doc.environment !== vippsEnv()) return { state: "unknown" };

  const payment = await getVippsPayment(reference);
  switch (payment.state) {
    case "CREATED":
      return { state: "pending" };
    case "ABORTED":
    case "EXPIRED":
    case "TERMINATED":
      await client.patch(doc._id).set({ status: payment.state.toLowerCase() }).commit();
      return { state: "cancelled" };
    case "AUTHORIZED":
      break;
    default:
      return { state: "failed", reason: `Unexpected state ${String(payment.state)}` };
  }

  if (payment.aggregate.authorizedAmount.value < doc.amountOre) {
    const reason = `Vipps authorised ${payment.aggregate.authorizedAmount.value} øre for a ${doc.amountOre} øre cart`;
    await client.patch(doc._id).set({ status: "failed", error: reason }).commit();
    await notice({ kind: "error", source: "payments", title: `A Vipps payment doesn't match its cart (${reference})`, detail: reason, dedupeKey: `vipps-mismatch:${reference}` });
    return { state: "failed", reason };
  }

  let captured = payment.aggregate.capturedAmount.value;
  if (captured < doc.amountOre) captured = (await captureVippsPayment(reference, doc.amountOre)).capturedAmount.value;
  if (captured < doc.amountOre) throw new Error(`Vipps capture not confirmed for ${reference}: ${captured} of ${doc.amountOre} øre`);

  const metadata = JSON.parse(doc.metadata) as Record<string, string>;
  const order = await recordPaidOrder({
    provider: "vipps",
    id: reference,
    docId: vippsOrderDocId(reference),
    orderNumber: paid.orderNumber,
    amountOre: doc.amountOre,
    currency: "nok",
    createdAt: new Date().toISOString(),
    metadata,
    ...(doc.email ? { receiptEmail: doc.email } : {}),
  });
  await client.patch(doc._id).set({ status: "captured", orderId: order.docId, settledAt: new Date().toISOString() }).commit();
  if (order.created) {
    console.info(`[order ${order.orderNumber}] created from Vipps ${reference}: ${doc.amountOre} øre`);
    await afterOrderCreated(order, metadata);
  }
  return paid;
}

/** For a REFUNDED event: whether the whole amount is now back with the customer. */
export async function vippsRefundState(reference: string): Promise<{ full: boolean; refundedOre: number; payment: VippsPayment }> {
  const payment = await getVippsPayment(reference);
  const refundedOre = payment.aggregate.refundedAmount.value;
  return { full: refundedOre >= payment.aggregate.capturedAmount.value && refundedOre > 0, refundedOre, payment };
}
