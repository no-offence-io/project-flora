import "server-only";
import { getCheckoutProducts, getShippingRules } from "./catalog";
import type { QuotedLine } from "./checkout-schema";
import { computeTotals } from "./pricing";
import type { Totals } from "./money";

/** Marks PaymentIntents as ours, so the intent route only ever updates its own. */
export const METADATA_SITE = "flora";

/**
 * Turn `{ id, quantity }` pairs into priced lines from the catalogue in Sanity, read fresh. The
 * client's copy of the price is never consulted; anything it sent beyond id and quantity was
 * already rejected by the schema.
 */
export async function quoteCart(items: { id: string; quantity: number }[]): Promise<{ lines: QuotedLine[]; totals: Totals } | { error: string }> {
  const [products, rules] = await Promise.all([getCheckoutProducts(items.map((i) => i.id)), getShippingRules()]);
  const lines: QuotedLine[] = [];
  for (const item of items) {
    const product = products.get(item.id);
    if (!product) return { error: `Unknown product: ${item.id}` };
    if (item.quantity > product.stock) {
      return { error: product.stock === 0 ? `${product.name} is sold out` : `Only ${product.stock} of ${product.name} available` };
    }
    lines.push({ id: item.id, name: product.name, quantity: item.quantity, unitPriceOre: product.priceOre });
  }
  return { lines, totals: computeTotals(lines, rules) };
}
