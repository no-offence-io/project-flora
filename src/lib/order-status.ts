/*
 * Order statuses, as the dashboard names and colours them. The stored values never change (the
 * webhook writes "paid"); only what Ida reads does — "Processing" for an order still to be made,
 * "Completed" once it has arrived, the words she already knows from her old shop.
 */
export const ORDER_STATUSES = ["paid", "shipped", "delivered", "returned", "refunded", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const STATUS_LABEL: Record<OrderStatus, string> = {
  paid: "Processing",
  shipped: "Shipped",
  delivered: "Completed",
  returned: "Returned",
  refunded: "Refunded",
  cancelled: "Cancelled",
};

/** Soft fills, one hue each, so a glance down the list tells them apart. Night mode inverts them with the rest. */
export const STATUS_TONE: Record<OrderStatus, string> = {
  paid: "bg-[#dcebd6] text-[#2c5424]",
  shipped: "bg-[#f1e7cf] text-[#6a521b]",
  delivered: "bg-[#d9e3ee] text-[#2c4763]",
  returned: "bg-[#e8def0] text-[#563a6a]",
  refunded: "bg-[#e9e9e9] text-[#4d4d4d]",
  cancelled: "bg-[#f3dede] text-[#842b2b]",
};

export const isStatus = (s: unknown): s is OrderStatus => ORDER_STATUSES.includes(s as OrderStatus);

/** Statuses that count as money in. */
export const COUNTS_AS_SALE: OrderStatus[] = ["paid", "shipped", "delivered"];

/** "Visa ending in 2560", "Klarna", "Nothing — PR / gift". */
export function paidWith(o: { paymentCard?: { brand?: string; last4?: string }; paymentProvider?: string; manual?: string }) {
  if (o.manual === "pr") return "Nothing — PR / gift";
  if (o.paymentCard?.last4) return `${o.paymentCard.brand ? o.paymentCard.brand.charAt(0).toUpperCase() + o.paymentCard.brand.slice(1) : "Card"} ending in ${o.paymentCard.last4}`;
  if (o.paymentProvider === "klarna") return "Klarna";
  if (o.paymentProvider === "vipps") return "Vipps";
  if (o.manual) return o.paymentProvider && o.paymentProvider !== "other" ? o.paymentProvider : "Outside the shop";
  return "Card";
}
