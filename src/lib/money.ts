/** Client-safe money helpers. Amounts are integer øre (1/100 NOK) everywhere; only formatting divides. */

export type Totals = {
  currency: "nok";
  subtotalOre: number;
  shippingOre: number;
  /** Portion of `totalOre` that is VAT. Informational — VAT is included in listed prices, never added. */
  vatIncludedOre: number;
  totalOre: number;
};

const nok = new Intl.NumberFormat("nb-NO", {
  style: "currency",
  currency: "NOK",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** 129000 → "1 290 kr" */
export function formatNok(ore: number) {
  return nok.format(ore / 100);
}

/**
 * Human order reference derived from the PaymentIntent id. Deterministic on purpose: the webhook
 * uses it as the order number, so a duplicate or concurrent delivery writes the same value rather
 * than minting a second order, and the success page can show the same reference without trusting
 * anything but the id in the URL.
 */
export function orderReference(paymentIntentId: string) {
  return `FL-${paymentIntentId.slice(-8).toUpperCase()}`;
}
