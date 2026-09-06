import "server-only";
import { getProduct } from "@/data/products";
import type { QuotedLine } from "./checkout-schema";
import { computeTotals } from "./pricing";
import type { Totals } from "./money";

/** Marks PaymentIntents as ours, so the intent route only ever updates its own. */
export const METADATA_SITE = "flora";

/**
 * Turn `{ id, quantity }` pairs into priced lines from the product data. The client's copy of the
 * price is never consulted; anything it sent beyond id and quantity was already rejected by the schema.
 */
export function quoteCart(
  items: { id: string; quantity: number }[],
): { lines: QuotedLine[]; totals: Totals } | { error: string } {
  const lines: QuotedLine[] = [];
  for (const item of items) {
    const product = getProduct(item.id);
    if (!product) return { error: `Unknown product: ${item.id}` };
    if (item.quantity > product.stock) {
      return { error: `Only ${product.stock} of ${product.name} available` };
    }
    lines.push({ id: product.slug, name: product.name, quantity: item.quantity, unitPriceOre: product.priceOre });
  }
  return { lines, totals: computeTotals(lines) };
}
