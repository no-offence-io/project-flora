import type { SlideshowProduct } from "@/components/products-slideshow";

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
  price: string;
  compareAtPrice?: string;
  description: string;
  colors: string[];
  images: { src: string; alt: string }[];
  specs: ProductSpec[];
};

const SHARED_SPECS: ProductSpec[] = [
  { label: "Size & Fit", value: "Model info, Size recommendation, size guide", expandable: true },
  { label: "Shipping & Returns", value: "Delivery options, return policy, payment options", expandable: true },
  { label: "Availability", value: "Out Of Stock" },
];

export const PRODUCTS: Product[] = [
  {
    slug: "miss-flow-top",
    category: "Tops",
    name: "Miss Flow Top",
    price: "499$",
    description: "Our bestseller and the reason for our sudden success, we owe Miss Flow everything.",
    colors: ["#c7ebff", "#ebffe8", "#ffffff"],
    // Same image twice for now so the gallery swipe and indicator can be tested; swap in real angles later.
    images: [
      { src: "/products/top-grey.png", alt: "Grey Miss Flow top, front" },
      { src: "/products/top-grey.png", alt: "Grey Miss Flow top, back" },
    ],
    specs: [{ label: "Gray", value: "Archive / Miss Flow Top", emphasis: true, hideOnMobile: true }, ...SHARED_SPECS],
  },
  {
    slug: "wrap-skirt",
    category: "Skirts",
    name: "Wrap Skirt",
    price: "299$",
    description: "An asymmetric wrap that moves with you, cut from the same soft jersey as Miss Flow.",
    colors: ["#c7ebff", "#ebffe8", "#ffffff"],
    images: [{ src: "/products/wrap-skirt-light.png", alt: "Light grey wrap skirt" }],
    specs: [{ label: "Light grey", value: "Archive / Wrap Skirt", emphasis: true, hideOnMobile: true }, ...SHARED_SPECS],
  },
  {
    slug: "tie-top",
    category: "Tops",
    name: "Tie Top",
    price: "299$",
    description: "A bandeau with long ties, worn knotted at the front or back.",
    colors: ["#c7ebff", "#ebffe8", "#ffffff"],
    images: [{ src: "/products/tie-top-taupe.png", alt: "Taupe tie top" }],
    specs: [{ label: "Taupe", value: "Archive / Tie Top", emphasis: true, hideOnMobile: true }, ...SHARED_SPECS],
  },
  {
    slug: "long-skirt",
    category: "Skirts",
    name: "Long Skirt",
    price: "299$",
    compareAtPrice: "499$",
    description: "A floor-length skirt with a fold-over waist and a single seam.",
    colors: ["#c7ebff", "#ebffe8", "#ffffff"],
    images: [{ src: "/products/long-skirt-light.png", alt: "Light grey long skirt" }],
    specs: [{ label: "Light grey", value: "Archive / Long Skirt", emphasis: true, hideOnMobile: true }, ...SHARED_SPECS],
  },
];

/** Lifestyle photos shown in the Previous/Next row on the product page. */
export const LIFESTYLE_PHOTOS = [
  { src: "/dropdown/related-product.jpg", alt: "Model wearing the yoga wear set in a cave" },
  { src: "/product/lifestyle-fabric-wave.jpg", alt: "Model lifting the fabric of the top" },
  { src: "/menu/menu-bg.jpg", alt: "Model lying on a rock ledge" },
  { src: "/product/lifestyle-lying-tiles.jpg", alt: "Model lying on stone tiles" },
  { src: "/product/lifestyle-cave-doorway.jpg", alt: "Model in a cave doorway" },
];

export function getProduct(slug: string) {
  return PRODUCTS.find((product) => product.slug === slug);
}

export function toSlideshowProduct(product: Product): SlideshowProduct {
  return {
    id: product.slug,
    name: product.name,
    price: product.price,
    compareAtPrice: product.compareAtPrice,
    colors: product.colors,
    image: product.images[0],
    href: `/shop/${product.slug}`,
  };
}
