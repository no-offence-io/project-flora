import type { Product } from "@/lib/catalog-types";

export type Measurement = { label: string; value: string };

export type CartItem = {
  /** One line per product + size + set of measurements; the same product twice with different measurements is two lines. */
  key: string;
  id: string;
  name: string;
  /** Chosen size, for products with a fixed size list. */
  size?: string;
  /** Chosen colour, by its English name, for products that come in several. */
  colour?: string;
  /** The customer's measurements in cm, for made-to-measure products. Shown under the name, as in the Figma cart. */
  measurements: Measurement[];
  quantity: number;
  /** Unit price in øre, for display only. The server re-derives every amount from the product data. */
  unitPriceOre: number;
  image: { src: string; alt: string };
  /** Product page for this line. */
  href: string;
};

export type LineOptions = { size?: string; colour?: string; measurements?: Measurement[] };

export function lineKey(slug: string, options: LineOptions = {}): string {
  const m = (options.measurements ?? []).map((x) => `${x.label}=${x.value}`).join(";");
  return [slug, options.size ?? "", m, options.colour ?? ""].join("|");
}

export function cartItemFromProduct(product: Product, quantity = 1, options: LineOptions = {}): CartItem {
  return {
    key: lineKey(product.slug, options),
    id: product.slug,
    name: product.name,
    ...(options.size ? { size: options.size } : {}),
    ...(options.colour ? { colour: options.colour } : {}),
    measurements: options.measurements ?? [],
    quantity,
    // Display only (the server prices the order): made to measure on a sized product carries its extra.
    unitPriceOre: product.priceOre + (product.sizing === "sizes" && product.tailored && !options.size && (options.measurements?.length ?? 0) > 0 ? product.tailoredExtraOre : 0),
    image: product.images[0],
    href: `/shop/${product.slug}`,
  };
}
