import "server-only";
import { getCheckoutProducts, getShippingRules } from "./catalog";
import type { QuotedLine } from "./checkout-schema";
import { checkDiscount } from "./discounts";
import { computeTotals, type AppliedDiscount } from "./pricing";
import type { Totals } from "./money";

export { METADATA_SITE } from "./order-metadata";

export type CartQuote = { lines: QuotedLine[]; totals: Totals; discount: (AppliedDiscount & { docId: string }) | null; discountError?: string };

type CartLine = { id: string; quantity: number; size?: string; measurements?: { label: string; value: string }[] };

/**
 * Turn cart lines into priced lines from the catalogue in Sanity, read fresh. The client's copy of
 * the price is never consulted; anything it sent beyond id, quantity, size and measurements was
 * already rejected by the schema. Stock is checked per size for sized products.
 */
export async function quoteCart(items: CartLine[], options: { country?: string; discountCode?: string } = {}): Promise<CartQuote | { error: string }> {
  const [products, rules] = await Promise.all([getCheckoutProducts(items.map((i) => i.id)), getShippingRules()]);
  const lines: QuotedLine[] = [];
  for (const item of items) {
    const product = products.get(item.id);
    if (!product) return { error: `Unknown product: ${item.id}` };

    let available = product.stock;
    if (product.sizing === "sizes") {
      const size = product.sizes.find((s) => s.label === item.size);
      if (!size) return { error: `Please choose a size for ${product.name}` };
      available = size.stock;
    } else if (product.sizing === "measurements" && !(item.measurements && item.measurements.length > 0)) {
      return { error: `Please add your measurements for ${product.name}` };
    }
    if (item.quantity > available) {
      return { error: available === 0 ? `${product.name}${item.size ? ` (${item.size})` : ""} is sold out` : `Only ${available} of ${product.name}${item.size ? ` (${item.size})` : ""} available` };
    }
    lines.push({
      id: item.id,
      name: product.name,
      quantity: item.quantity,
      unitPriceOre: product.priceOre,
      ...(product.sizing === "sizes" && item.size ? { size: item.size } : {}),
      ...(product.sizing === "measurements" && item.measurements ? { measurements: item.measurements } : {}),
    });
  }

  const subtotalOre = lines.reduce((sum, l) => sum + l.unitPriceOre * l.quantity, 0);
  let discount: CartQuote["discount"] = null;
  let discountError: string | undefined;
  if (options.discountCode) {
    const check = await checkDiscount(options.discountCode, subtotalOre);
    if (check.ok) discount = { ...check.discount, docId: check.docId };
    else discountError = check.reason;
  }

  return { lines, totals: computeTotals(lines, rules, { country: options.country, discount }), discount, ...(discountError ? { discountError } : {}) };
}

export { quoteToMetadata, linesFromMetadata, type MetadataLine } from "./order-metadata";
