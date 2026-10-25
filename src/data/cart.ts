import type { Product } from "@/lib/catalog-types";

export type Measurement = { label: string; value: string };

export type CartItem = {
  /** One line per product + size + set of measurements; the same product twice with different measurements is two lines. */
  key: string;
  id: string;
  name: string;
  /** Chosen size, for products with a fixed size list. */
  size?: string;
  /** The customer's measurements in cm, for made-to-measure products. Shown under the name, as in the Figma cart. */
  measurements: Measurement[];
  quantity: number;
  /** Unit price in øre, for display only. The server re-derives every amount from the product data. */
  unitPriceOre: number;
  image: { src: string; alt: string };
  /** Product page for this line. */
  href: string;
};

export type LineOptions = { size?: string; measurements?: Measurement[] };

export function lineKey(slug: string, options: LineOptions = {}): string {
  const m = (options.measurements ?? []).map((x) => `${x.label}=${x.value}`).join(";");
  return [slug, options.size ?? "", m].join("|");
}

export function cartItemFromProduct(product: Product, quantity = 1, options: LineOptions = {}): CartItem {
  return {
    key: lineKey(product.slug, options),
    id: product.slug,
    name: product.name,
    ...(options.size ? { size: options.size } : {}),
    measurements: options.measurements ?? [],
    quantity,
    unitPriceOre: product.priceOre,
    image: product.images[0],
    href: `/shop/${product.slug}`,
  };
}
