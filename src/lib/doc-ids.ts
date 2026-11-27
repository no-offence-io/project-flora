/*
 * Ids for the documents that hold private data: orders, customers, subscribers, discount codes,
 * payments in progress, newsletters and the dashboard's own notes.
 *
 * Sanity hands a document to an anonymous reader only when its id has no dot in it. Anything under
 * a path ("order.x", "customer.x") needs a token, whatever the dataset's own visibility is set to.
 * So every private document's id is its kind, a dot, then the rest, and even a public dataset shows
 * a stranger nothing but the catalogue and the pages.
 *
 * Every private kind gets its id from this file. A new kind of private document belongs here too:
 * an id made anywhere else, or left for Sanity to generate, is public.
 */

export const ORDER_PREFIX = "order.";
/** Stripe orders: the PaymentIntent id. One payment, one id, so a repeated webhook cannot make a second order. */
export const orderDocId = (paymentId: string) => `${ORDER_PREFIX}${paymentId}`;
export const vippsOrderDocId = (reference: string) => `${ORDER_PREFIX}vipps-${reference}`;
export const VIPPS_ORDER_DOC_ID = /^order\.vipps-fl-[a-f0-9]{24}$/;
export const manualOrderDocId = (ref: string) => `${ORDER_PREFIX}manual-${ref}`;
export const demoOrderDocId = (n: number) => `${ORDER_PREFIX}demo-${n}`;
/** A sale from before this shop, brought in from Stripe: one per charge, so importing twice adds nothing. */
export const importedOrderDocId = (chargeId: string) => `${ORDER_PREFIX}import-${chargeId}`;

/** The quote kept while a customer is away at Vipps. */
export const vippsPaymentDocId = (reference: string) => `vipps.${reference}`;

export const customerDocId = (emailHash: string) => `customer.${emailHash}`;

export const subscriberDocId = (emailHash: string) => `subscriber.${emailHash}`;
export const SUBSCRIBER_DOC_ID = /^subscriber\.[a-f0-9]{32}$/;
/** For previews of a newsletter, where the unsubscribe link must look real and lead nowhere. */
export const NOBODY_SUBSCRIBER_ID = subscriberDocId("0".repeat(32));
/** Links in newsletters sent before ids had a dot used a hyphen; they keep working. */
export const subscriberDocIdFromLink = (id: string | undefined): string | null => {
  const m = /^subscriber[.-]([a-f0-9]{32})$/.exec(id ?? "");
  return m ? subscriberDocId(m[1]) : null;
};

export const NOTIFICATION_PREFIX = "notification.";
export const notificationDocId = (key: string) => `${NOTIFICATION_PREFIX}${key}`;

export const rateLimitDocId = (key: string) => `ratelimit.${key}`;

export const pushSubscriptionDocId = (endpointHash: string) => `pushSubscription.${endpointHash}`;

/** For kinds that have no natural key. */
export const newPrivateDocId = (kind: "discount" | "newsletter") => `${kind}.${crypto.randomUUID()}`;
export const demoNewsletterDocId = (name: string) => `newsletter.demo-${name}`;
