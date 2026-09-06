import type {
  ProductColor,
  SlideshowProduct,
} from "@/components/products-slideshow";
import { formatNok } from "@/lib/money";

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

export const CATEGORIES = ["Accessories", "Pattern", "Skirts", "Tops"] as const;
export type Category = (typeof CATEGORIES)[number];

export type Product = {
  slug: string;
  category: Category;
  name: string;
  /** Unit price in øre (1/100 NOK), VAT included. Never sent from the client — checkout reads it here. */
  priceOre: number;
  /** Previous price in øre for sale items. */
  compareAtPriceOre?: number;
  /** Units available; checkout refuses quantities above this. Static for now — see README, Payments. */
  stock: number;
  description: string;
  /**
   * Colour options. The first entry's hex is sampled directly from the product's own photo
   * (median of its non-transparent pixels) and reuses that photo. The other two are imagined
   * colourways: their hex is the target shade, and their image is a duotone recolour of the
   * same photo (`scripts` history: PIL `ImageOps.colorize` over the garment's luminance, so
   * folds and shading are preserved) — swap in a real photo if that colourway is ever shot.
   */
  colors: ProductColor[];
  images: { src: string; alt: string }[];
  specs: ProductSpec[];
};

const SHARED_SPECS: ProductSpec[] = [
  {
    label: "Size & Fit",
    value: "Model info, Size recommendation, size guide",
    expandable: true,
  },
  {
    label: "Shipping & Returns",
    value: "Delivery options, return policy, payment options",
    expandable: true,
  },
  { label: "Availability", value: "Out Of Stock" },
];

export const PRODUCTS: Product[] = [
  {
    slug: "miss-flow-top",
    category: "Tops",
    name: "Miss Flow Top",
    priceOre: 129000,
    stock: 12,
    description:
      "Our bestseller and the reason for our sudden success, we owe Miss Flow everything.",
    colors: [
      {
        hex: "#646875",
        name: "Gray",
        image: { src: "/products/top-grey.png", alt: "Grey Miss Flow top" },
      },
      {
        hex: "#c07a52",
        name: "Terracotta",
        image: {
          src: "/products/miss-flow-top-terracotta.png",
          alt: "Terracotta Miss Flow top",
        },
      },
      {
        hex: "#7c7a4e",
        name: "Olive",
        image: {
          src: "/products/miss-flow-top-olive.png",
          alt: "Olive Miss Flow top",
        },
      },
    ],
    // Same image twice for now so the gallery swipe and indicator can be tested; swap in real angles later.
    images: [
      { src: "/products/top-grey.png", alt: "Grey Miss Flow top, front" },
      { src: "/products/top-grey.png", alt: "Grey Miss Flow top, back" },
    ],
    specs: [
      {
        label: "Gray",
        value: "Archive / Miss Flow Top",
        emphasis: true,
        hideOnMobile: true,
      },
      ...SHARED_SPECS,
    ],
  },
  {
    slug: "wrap-skirt",
    category: "Skirts",
    name: "Wrap Skirt",
    priceOre: 89000,
    stock: 8,
    description:
      "An asymmetric wrap that moves with you, cut from the same soft jersey as Miss Flow.",
    colors: [
      {
        hex: "#d3d9e0",
        name: "Light grey",
        image: {
          src: "/products/wrap-skirt-light.png",
          alt: "Light grey wrap skirt",
        },
      },
      {
        hex: "#e8c9c0",
        name: "Blush",
        image: {
          src: "/products/wrap-skirt-blush.png",
          alt: "Blush wrap skirt",
        },
      },
      {
        hex: "#c3cbb8",
        name: "Sage",
        image: { src: "/products/wrap-skirt-sage.png", alt: "Sage wrap skirt" },
      },
    ],
    images: [
      { src: "/products/wrap-skirt-light.png", alt: "Light grey wrap skirt" },
    ],
    specs: [
      {
        label: "Light grey",
        value: "Archive / Wrap Skirt",
        emphasis: true,
        hideOnMobile: true,
      },
      ...SHARED_SPECS,
    ],
  },
  {
    slug: "tie-top",
    category: "Tops",
    name: "Tie Top",
    priceOre: 89000,
    stock: 8,
    description: "A bandeau with long ties, worn knotted at the front or back.",
    colors: [
      {
        hex: "#706663",
        name: "Taupe",
        image: { src: "/products/tie-top-taupe.png", alt: "Taupe tie top" },
      },
      {
        hex: "#a15c3e",
        name: "Rust",
        image: { src: "/products/tie-top-rust.png", alt: "Rust tie top" },
      },
      {
        hex: "#4f5b47",
        name: "Forest",
        image: { src: "/products/tie-top-forest.png", alt: "Forest tie top" },
      },
    ],
    images: [{ src: "/products/tie-top-taupe.png", alt: "Taupe tie top" }],
    specs: [
      {
        label: "Taupe",
        value: "Archive / Tie Top",
        emphasis: true,
        hideOnMobile: true,
      },
      ...SHARED_SPECS,
    ],
  },
  {
    slug: "long-skirt",
    category: "Skirts",
    name: "Long Skirt",
    priceOre: 89000,
    stock: 5,
    compareAtPriceOre: 129000,
    description:
      "A floor-length skirt with a fold-over waist and a single seam.",
    colors: [
      {
        hex: "#d5dae3",
        name: "Light grey",
        image: {
          src: "/products/long-skirt-light.png",
          alt: "Light grey long skirt",
        },
      },
      {
        hex: "#aebdd1",
        name: "Dusty blue",
        image: {
          src: "/products/long-skirt-dusty-blue.png",
          alt: "Dusty blue long skirt",
        },
      },
      {
        hex: "#e8ddc7",
        name: "Cream",
        image: {
          src: "/products/long-skirt-cream.png",
          alt: "Cream long skirt",
        },
      },
    ],
    images: [
      { src: "/products/long-skirt-light.png", alt: "Light grey long skirt" },
    ],
    specs: [
      {
        label: "Light grey",
        value: "Archive / Long Skirt",
        emphasis: true,
        hideOnMobile: true,
      },
      ...SHARED_SPECS,
    ],
  },
];

/** Lifestyle photos shown in the Previous/Next row on the product page. */
export const LIFESTYLE_PHOTOS = [
  {
    src: "/dropdown/related-product.jpg",
    alt: "Model wearing the yoga wear set in a cave",
  },
  {
    src: "/product/lifestyle-fabric-wave.jpg",
    alt: "Model lifting the fabric of the top",
  },
  { src: "/menu/menu-bg.jpg", alt: "Model lying on a rock ledge" },
  {
    src: "/product/lifestyle-lying-tiles.jpg",
    alt: "Model lying on stone tiles",
  },
  {
    src: "/product/lifestyle-cave-doorway.jpg",
    alt: "Model in a cave doorway",
  },
];

export function getProduct(slug: string) {
  return PRODUCTS.find((product) => product.slug === slug);
}

export function toSlideshowProduct(product: Product): SlideshowProduct {
  return {
    id: product.slug,
    name: product.name,
    price: formatNok(product.priceOre),
    compareAtPrice: product.compareAtPriceOre !== undefined ? formatNok(product.compareAtPriceOre) : undefined,
    colors: product.colors,
    image: product.images[0],
    images: product.images,
    href: `/shop/${product.slug}`,
  };
}
