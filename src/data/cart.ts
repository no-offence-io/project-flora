import type { Product } from "@/lib/catalog-types";

export type CartItem = {
  id: string;
  name: string;
  variant: string;
  /** Measurement attributes shown under the name, e.g. "B - Waist" → "32". */
  attributes: { label: string; value: string }[];
  quantity: number;
  /** Unit price in øre, for display only. The server re-derives every amount from the product data. */
  unitPriceOre: number;
  image: { src: string; alt: string };
  /** Product page for this line. */
  href: string;
};

/** Placeholder measurements attached to every line until sizing is captured on the product page. */
export const DEFAULT_ATTRIBUTES = [
  { label: "B - Waist", value: "32" },
  { label: "G - High hips", value: "75" },
  { label: "Height", value: "58" },
];

/** Build a cart line from a product; the colour row of its specs becomes the variant. */
export function cartItemFromProduct(product: Product, quantity = 1): CartItem {
  const variant = product.specs.find((spec) => spec.emphasis)?.label ?? "";
  return {
    id: product.slug,
    name: product.name,
    variant,
    attributes: DEFAULT_ATTRIBUTES,
    quantity,
    unitPriceOre: product.priceOre,
    image: product.images[0],
    href: `/shop/${product.slug}`,
  };
}
