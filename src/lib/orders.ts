import "server-only";
import { getCheckoutProducts, getShippingRules } from "./catalog";
import type { QuotedLine } from "./checkout-schema";
import { checkDiscount } from "./discounts";
import { computeTotals, type AppliedDiscount } from "./pricing";
import { cartOverStock, quoteLine, type LineProduct } from "./cart-lines";
import type { Totals } from "./money";

export { METADATA_SITE } from "./order-metadata";

export type CartQuote = {
  lines: QuotedLine[];
  totals: Totals;
  /** `limited`: the code has a maximum number of uses. `holdKey`: this checkout's hold on one of them, once it has it. */
  discount: (AppliedDiscount & { docId: string; limited: boolean; holdKey?: string }) | null;
  discountError?: string;
};

type CartLine = { id: string; quantity: number; size?: string; colour?: string; measurements?: { label: string; value: string }[] };

/**
 * Turn cart lines into priced lines from the catalogue in Sanity, read fresh. The client's copy of
 * the price is never consulted; anything it sent beyond id, quantity, size and measurements was
 * already rejected by the schema. The rules for each line, stock and made to measure included, are
 * in cart-lines.ts.
 */
export async function quoteCart(items: CartLine[], options: { country?: string; discountCode?: string } = {}): Promise<CartQuote | { error: string }> {
  const [products, rules] = await Promise.all([getCheckoutProducts(items.map((i) => i.id)), getShippingRules()]);
  const lines: QuotedLine[] = [];
  const priced: { product: LineProduct; line: QuotedLine }[] = [];
  for (const item of items) {
    const product = products.get(item.id);
    if (!product) return { error: `Unknown product: ${item.id}` };

    const quoted = quoteLine(product, item);
    if ("error" in quoted) return { error: quoted.error };
    lines.push(quoted.line);
    priced.push({ product, line: quoted.line });
  }
  // Each line fits the stock on its own; together they must too.
  const short = cartOverStock(priced);
  if (short) return { error: short };

  const subtotalOre = lines.reduce((sum, l) => sum + l.unitPriceOre * l.quantity, 0);
  let discount: CartQuote["discount"] = null;
  let discountError: string | undefined;
  if (options.discountCode) {
    const check = await checkDiscount(options.discountCode, subtotalOre);
    if (check.ok) discount = { ...check.discount, docId: check.docId, limited: check.limited };
    else discountError = check.reason;
  }

  return { lines, totals: computeTotals(lines, rules, { country: options.country, discount }), discount, ...(discountError ? { discountError } : {}) };
}

export { quoteToMetadata, linesFromMetadata, type MetadataLine } from "./order-metadata";
