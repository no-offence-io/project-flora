import "server-only";

/**
 * Email hooks. No provider is wired yet (Ida has asked for EmailJS; it needs her service, template
 * and private key, and must be called from here on the server — never from the browser, or anyone
 * could send mail as Flöra). Until then these log what they would have sent.
 */
export async function sendOrderConfirmation(order: { orderNumber: string; email: string | null; totalOre: number; currency: string }) {
  console.info(`[email] order confirmation for ${order.orderNumber} -> ${order.email ?? "(no email)"}: not configured`);
}

export async function sendShippingNotification(order: { orderId: string; trackingNumber: string }) {
  console.info(`[email] shipping notification for ${order.orderId} (tracking ${order.trackingNumber || "none"}): not configured`);
}

export async function sendNewsletterWelcome(email: string) {
  console.info(`[email] newsletter welcome -> ${email}: not configured`);
}
