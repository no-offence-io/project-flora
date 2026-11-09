import type { ProductColor, SlideshowProduct } from "@/components/products-slideshow";
import { parseTransform, type MediaTransform } from "./media-transform";
import { formatNok } from "@/lib/money";

/*
 * The catalogue's shape as the components consume it. Content lives in Sanity (see ./catalog.ts for
 * the queries); this file has no server dependencies so client components can share the types.
 */

export type ProductSpec = {
  label: string;
  value?: string;
  /** Render the value in black instead of 50% black (the colour / collection row). */
  emphasis?: boolean;
  /** Mobile shows this row as an expandable accordion item. */
  expandable?: boolean;
  /** The Figma mobile layout omits this row. */
  hideOnMobile?: boolean;
};

/** Must match the `category` list in studio/schemaTypes/documents/product.ts. */
export const CATEGORIES = ["Tops", "Skirts", "Pants", "Sets", "Accessories"] as const;
export type Category = (typeof CATEGORIES)[number];

/** How a product is sized: made to the customer's measurements (the default), a fixed size list, or one size. */
/** A picture the site draws in a box of its own shape, with how it sits there (see media-transform.ts). */
export type SiteImage = { src: string; alt: string } & MediaTransform;
export type ProductImage = SiteImage;

/** From a GROQ image projection (`src`, `alt`, `scale`, `x`, `y`) to a SiteImage; `alt` falls back to the given text. */
export function toImage(raw: { src?: string | null; alt?: string | null; scale?: number | null; x?: number | null; y?: number | null }, alt: string): SiteImage {
  return { src: raw.src ?? "", alt: raw.alt ?? alt, ...parseTransform(raw) };
}

export type Sizing = "measurements" | "sizes" | "none";
export type VintageLayout = "card" | "plain";
export type ProductSize = { label: string; stock: number };

export type Product = {
  slug: string;
  category: Category;
  name: string;
  sizing: Sizing;
  /** Only meaningful when `sizing` is "sizes"; each size carries its own stock. */
  sizes: ProductSize[];
  /** One-of-a-kind pieces shown on the Vintage page instead of the shop. */
  vintage: boolean;
  /** A vintage piece's own page: the turning 3D card at the top, or the normal product layout. */
  vintageLayout: VintageLayout;
  /** Animated GIF made in the admin, for newsletters. */
  gif?: string;
  /** Unit price in øre (1/100 NOK), VAT included. Never sent from the client — checkout re-reads it. */
  priceOre: number;
  /** Previous price in øre for sale items. */
  compareAtPriceOre?: number;
  /** Units available; checkout refuses quantities above this and each paid order counts it down. */
  stock: number;
  description: string;
  colors: ProductColor[];
  images: ProductImage[];
  specs: ProductSpec[];
};

/** Lifestyle photos shown under a product; not editable content, so they stay with the code. */
export const LIFESTYLE_PHOTOS = [
  { src: "/dropdown/related-product.jpg", alt: "Model wearing the yoga wear set in a cave" },
  { src: "/product/lifestyle-fabric-wave.jpg", alt: "Model lifting the fabric of the top" },
  { src: "/menu/menu-bg.jpg", alt: "Model lying on a rock ledge" },
  { src: "/product/lifestyle-lying-tiles.jpg", alt: "Model lying on stone tiles" },
  { src: "/product/lifestyle-cave-doorway.jpg", alt: "Model in a cave doorway" },
];

/** Nothing left to sell: all sizes empty, or the single stock number at zero. */
export function isSoldOut(product: Pick<Product, "sizing" | "sizes" | "stock">): boolean {
  if (product.sizing === "sizes") return product.sizes.every((s) => s.stock <= 0);
  return product.stock <= 0;
}

export function toSlideshowProduct(product: Product): SlideshowProduct {
  return {
    id: product.slug,
    soldOut: isSoldOut(product),
    name: product.name,
    price: formatNok(product.priceOre),
    compareAtPrice: product.compareAtPriceOre !== undefined ? formatNok(product.compareAtPriceOre) : undefined,
    colors: product.colors,
    image: product.images[0],
    images: product.images,
    href: `/shop/${product.slug}`,
  };
}
