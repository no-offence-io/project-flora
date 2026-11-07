import "server-only";
import { notice } from "./notices";
import { sendOrderConfirmation } from "./notify";
import type { RecordedOrder } from "./record-order";
import { getWriteClient } from "@/sanity/lib/write";

/**
 * What happens once, right after a new order is written — whoever took the payment. Every step is
 * best-effort and reported to the dashboard: an email outage must never make a payment webhook
 * fail and re-run the order.
 */
export async function afterOrderCreated(order: RecordedOrder, m: Record<string, string>): Promise<void> {
  const { orderNumber } = order;
  const client = getWriteClient();

  if (order.oversold.length) {
    const what = order.oversold.join(", ");
    await client.patch(order.docId).set({ internalNote: `SOLD TWICE: ${what}. Two customers paid at the same moment. Contact this customer and refund if it can't be made.` }).commit();
    await notice({ kind: "error", source: "orders", title: `${orderNumber} was paid for after ${what} had sold out`, detail: `Two customers paid at the same moment. Contact ${order.customer.name} (${order.customer.email}) and refund if it can't be made.`, href: `/admin/orders/${order.docId}`, dedupeKey: `oversold:${orderNumber}` });
  }

  try {
    const sent = await sendOrderConfirmation(order);
    if (sent) await client.patch(order.docId).set({ confirmationSentAt: new Date().toISOString() }).commit();
  } catch (err) {
    console.error(`[order ${orderNumber}] confirmation email failed`, err);
    await notice({ kind: "error", source: "email", title: `Confirmation email for ${orderNumber} failed`, detail: err instanceof Error ? err.message : String(err), href: `/admin/orders/${order.docId}`, dedupeKey: `confirm:${orderNumber}` });
  }

  // "Save my details" or a signed-in customer: keep the address (and measurements) on the account.
  try {
    const email = order.customer.email;
    if (email && (m.register === "1" || m.account)) {
      const { upsertCustomer, customerIdFor, makeSignInToken } = await import("./customer");
      const firstMeasured = order.lines.find((l) => l.measurements.length);
      const existing = await client.getDocument<{ measurements?: unknown[] }>(customerIdFor(email));
      await upsertCustomer(email, {
        firstName: m.customer_first, lastName: m.customer_last, phonePrefix: m.customer_prefix, phone: m.customer_phone_only,
        street: m.customer_street, apartment: m.customer_apartment, postcode: m.customer_postcode, city: m.customer_city, country: m.customer_country,
        language: order.language,
        ...(firstMeasured && !(existing?.measurements ?? []).length ? { measurements: firstMeasured.measurements.map((x, i) => ({ ...x, _key: `m${i}`, _type: "measurement" })) as never } : {}),
      });
      if (m.register === "1" && !existing) {
        const { sendAccountWelcome } = await import("./notify");
        const base = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.prosjectflora.com").replace(/\/$/, "");
        await sendAccountWelcome(email, order.language, `${base}/account/verify?token=${encodeURIComponent(makeSignInToken(email))}&next=/account`);
      }
    }
  } catch (err) {
    console.error(`[order ${orderNumber}] saving account details failed`, err);
    await notice({ kind: "warning", source: "accounts", title: `Couldn't save the customer's details for ${orderNumber}`, detail: err instanceof Error ? err.message : String(err), href: `/admin/orders/${order.docId}` });
  }

  await notice({ kind: "info", source: "orders", title: `New order ${orderNumber} · ${(order.totals.totalOre / 100).toLocaleString("nb-NO")} kr`, detail: `${order.customer.name} · ${order.lines.map((l) => `${l.quantity} × ${l.name}`).join(", ")}`, href: `/admin/orders/${order.docId}`, dedupeKey: `order:${orderNumber}` });
}
