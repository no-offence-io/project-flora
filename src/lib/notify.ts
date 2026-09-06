import "server-only";

/**
 * Order confirmation hook, called from the Stripe webhook once an order exists.
 *
 * No email provider is configured in this project yet, so this only logs. Stripe itself emails a
 * receipt to `receipt_email` in live mode (a dashboard setting), which covers the basics until a
 * provider is chosen. Plug one in here; keep it out of the request path.
 */
export async function sendOrderConfirmation(order: {
  orderNumber: string;
  email: string | null;
  totalOre: number;
  currency: string;
}) {
  console.info(`[order ${order.orderNumber}] confirmation email not configured; would send to ${order.email ?? "(no email)"}`);
}
