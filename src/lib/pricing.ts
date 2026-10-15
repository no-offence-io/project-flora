import "server-only";
import type { Totals } from "./money";

/**
 * Shipping and VAT rules. Server-only: these decide what a customer is charged, so they must never
 * be derivable from, or overridable by, anything the browser sends.
 *
 * Listed prices INCLUDE 25% Norwegian VAT (confirmed 2026-09-06). VAT is therefore never added on
 * top; `vatIncludedOre` is only the portion of the total that is tax, shown for the receipt.
 *
 * The shipping numbers are edited in Site settings (Sanity); these are the values used when that
 * document doesn't exist yet.
 */
export const CURRENCY = "nok" as const;
export const VAT_RATE = 0.25;

export type ShippingRules = { shippingOre: number; freeShippingFromOre: number | null };
export const DEFAULT_RULES: ShippingRules = { shippingOre: 8_900, freeShippingFromOre: 150_000 };

export function computeTotals(lines: { unitPriceOre: number; quantity: number }[], rules: ShippingRules = DEFAULT_RULES): Totals {
  const subtotalOre = lines.reduce((sum, line) => sum + line.unitPriceOre * line.quantity, 0);
  const free = subtotalOre === 0 || (rules.freeShippingFromOre !== null && subtotalOre >= rules.freeShippingFromOre);
  const shippingOre = free ? 0 : rules.shippingOre;
  const totalOre = subtotalOre + shippingOre;
  // Included VAT on a gross amount: gross × rate / (1 + rate)
  const vatIncludedOre = Math.round((totalOre * VAT_RATE) / (1 + VAT_RATE));
  return { currency: CURRENCY, subtotalOre, shippingOre, vatIncludedOre, totalOre };
}
