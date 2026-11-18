import type { QuotedLine } from "./checkout-schema";
import type { ProductSize, Sizing } from "./catalog-types";

/*
 * One cart line, priced and checked against the product as it is in the catalogue right now. Pure,
 * so the rules that decide what a customer pays and what stock they may take are tested on their own.
 *
 *   sizes          a size from the list is required, limited by that size's stock;
 *                  or, when the product offers it, made to measure: measurements instead of a size,
 *                  at the price plus the made-to-measure extra, made to order (no stock involved).
 *   measurements   measurements are required; limited by the product's single stock number.
 *   none           limited by the product's single stock number.
 *
 * Stock: a product set not to count stock has no limit, whichever way it is sized.
 *
 * Colour: a product with colours needs one of them (by its English name); with a single colour,
 * that one is taken. A product without colours ignores whatever colour is sent.
 *
 * The client's price is never consulted. Whatever it sent that doesn't belong to the chosen way of
 * sizing is dropped rather than carried into the order.
 */
export type LineProduct = { name: string; priceOre: number; stock: number; sizing: Sizing; sizes: ProductSize[]; tailored: boolean; tailoredExtraOre: number; /** False: stock isn't counted for this product, so nothing limits the quantity. */ trackStock?: boolean; /** English colour names; empty when the product has no colours. */ colours?: string[] };
export type LineRequest = { id: string; quantity: number; size?: string; colour?: string; measurements?: { label: string; value: string }[] };

export function quoteLine(product: LineProduct, item: LineRequest): { line: QuotedLine } | { error: string } {
  const hasMeasurements = Boolean(item.measurements && item.measurements.length > 0);
  const colours = product.colours ?? [];
  let colour: string | undefined;
  if (colours.length === 1) colour = colours[0];
  else if (colours.length > 1) {
    colour = colours.find((c) => c.toLowerCase() === item.colour?.trim().toLowerCase());
    if (!colour) return { error: `Please choose a colour for ${product.name}` };
  }
  const base = { id: item.id, name: product.name, quantity: item.quantity, ...(colour ? { colour } : {}) };
  const counted = product.trackStock !== false;
  const tooMany = (available: number, size?: string) =>
    available === 0 ? `${product.name}${size ? ` (${size})` : ""} is sold out` : `Only ${available} of ${product.name}${size ? ` (${size})` : ""} available`;

  if (product.sizing === "sizes") {
    if (item.size) {
      const size = product.sizes.find((s) => s.label === item.size);
      if (!size) return { error: `Please choose a size for ${product.name}` };
      if (counted && item.quantity > size.stock) return { error: tooMany(size.stock, size.label) };
      return { line: { ...base, unitPriceOre: product.priceOre, size: size.label } };
    }
    if (product.tailored && hasMeasurements) {
      return { line: { ...base, unitPriceOre: product.priceOre + product.tailoredExtraOre, measurements: item.measurements, tailored: true } };
    }
    return { error: product.tailored ? `Please choose a size, or made to measure, for ${product.name}` : `Please choose a size for ${product.name}` };
  }

  if (product.sizing === "measurements" && !hasMeasurements) return { error: `Please add your measurements for ${product.name}` };
  if (counted && item.quantity > product.stock) return { error: tooMany(product.stock) };
  return { line: { ...base, unitPriceOre: product.priceOre, ...(product.sizing === "measurements" ? { measurements: item.measurements } : {}) } };
}
