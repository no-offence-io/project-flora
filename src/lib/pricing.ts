import "server-only";
import type { Totals } from "./money";

/**
 * Shipping and VAT rules. Server-only: these decide what a customer is charged, so they must never
 * be derivable from, or overridable by, anything the browser sends.
 *
 * Listed prices INCLUDE 25% Norwegian VAT (confirmed 2026-09-06). VAT is therefore never added on
 * top; `vatIncludedOre` is only the portion of the total that is tax, shown for the receipt.
 */
export const CURRENCY = "nok" as const;
export const VAT_RATE = 0.25;
export const SHIPPING_ORE = 8_900;
/** Matches the shipping policy page: orders over 1 500 kr ship free. */
export const FREE_SHIPPING_THRESHOLD_ORE = 150_000;

export function computeTotals(lines: { unitPriceOre: number; quantity: number }[]): Totals {
  const subtotalOre = lines.reduce((sum, line) => sum + line.unitPriceOre * line.quantity, 0);
  const shippingOre = subtotalOre === 0 || subtotalOre >= FREE_SHIPPING_THRESHOLD_ORE ? 0 : SHIPPING_ORE;
  const totalOre = subtotalOre + shippingOre;
  // Included VAT on a gross amount: gross × rate / (1 + rate)
  const vatIncludedOre = Math.round((totalOre * VAT_RATE) / (1 + VAT_RATE));
  return { currency: CURRENCY, subtotalOre, shippingOre, vatIncludedOre, totalOre };
}
