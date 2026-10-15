import "server-only";
import { defineQuery } from "next-sanity";
import { client } from "@/sanity/lib/client";
import { sanityFetch } from "@/sanity/lib/live";
import type { DropdownListItem } from "@/components/dropdown-list";
import type { ScrollyValue } from "@/components/values-scrolly";
import { CATEGORIES, type Category, type Product } from "./catalog-types";
import { getLanguage, type Lang } from "./language";
import { DEFAULT_RULES, type ShippingRules } from "./pricing";

/*
 * Everything the storefront reads from Sanity, in the visitor's language with English as the
 * fallback. Each query projects straight into the shapes the components already take, so the
 * components didn't change when the content moved out of the code.
 */

/** Every read carries this tag; /api/revalidate drops it when Sanity reports a publish. */
export const CONTENT_TAG = "sanity-content";

/** A translated field: the visitor's language if it has a value, otherwise English. */
const L = (field: string) => `coalesce(${field}[_key == $lang][0].value, ${field}[_key == "en"][0].value)`;
const IMG = (field: string) => `{ "src": ${field}.asset->url, "alt": ${L(`${field}.alt`)} }`;

const PRODUCT_FIELDS = `
  "slug": slug.current, category, "name": ${L("name")}, priceOre, compareAtPriceOre, stock,
  "description": ${L("description")},
  "colors": colors[]{ hex, "name": ${L("name")}, "image": ${IMG("image")} },
  "images": images[]${IMG("@")},
  "specs": specs[]{ "label": ${L("label")}, "value": ${L("value")}, emphasis, expandable, hideOnMobile }
`;

const PRODUCTS_QUERY = defineQuery(`*[_type == "product" && visible != false && defined(slug.current)] | order(_createdAt asc) { ${PRODUCT_FIELDS} }`);
const PRODUCT_QUERY = defineQuery(`*[_type == "product" && slug.current == $slug][0] { ${PRODUCT_FIELDS} }`);

type RawImage = { src?: string | null; alt?: string | null };
type RawProduct = {
  slug: string; category?: string | null; name?: string | null; priceOre?: number | null; compareAtPriceOre?: number | null; stock?: number | null;
  description?: string | null;
  colors?: { hex?: string | null; name?: string | null; image?: RawImage | null }[] | null;
  images?: RawImage[] | null;
  specs?: { label?: string | null; value?: string | null; emphasis?: boolean | null; expandable?: boolean | null; hideOnMobile?: boolean | null }[] | null;
};

function toProduct(raw: RawProduct): Product {
  const images = (raw.images ?? []).filter((i): i is RawImage & { src: string } => Boolean(i?.src)).map((i) => ({ src: i.src, alt: i.alt ?? raw.name ?? "" }));
  const fallback = images[0] ?? { src: "", alt: "" };
  return {
    slug: raw.slug,
    category: (CATEGORIES.includes(raw.category as Category) ? raw.category : CATEGORIES[0]) as Category,
    name: raw.name ?? "",
    priceOre: raw.priceOre ?? 0,
    compareAtPriceOre: raw.compareAtPriceOre ?? undefined,
    stock: raw.stock ?? 0,
    description: raw.description ?? "",
    colors: (raw.colors ?? [])
      .filter((c) => c?.hex)
      .map((c) => ({ hex: c.hex!, name: c.name ?? "", image: c.image?.src ? { src: c.image.src, alt: c.image.alt ?? c.name ?? "" } : fallback })),
    images,
    specs: (raw.specs ?? []).map((s) => ({ label: s.label ?? "", value: s.value ?? undefined, emphasis: !!s.emphasis, expandable: !!s.expandable, hideOnMobile: !!s.hideOnMobile })),
  };
}

export async function getProducts(): Promise<Product[]> {
  const lang = await getLanguage();
  const { data } = await sanityFetch({ query: PRODUCTS_QUERY, params: { lang }, stega: false, tags: [CONTENT_TAG] });
  return (data as RawProduct[]).map(toProduct);
}

export async function getProduct(slug: string): Promise<Product | null> {
  const lang = await getLanguage();
  const { data } = await sanityFetch({ query: PRODUCT_QUERY, params: { slug, lang }, stega: false, tags: [CONTENT_TAG] });
  return data ? toProduct(data as RawProduct) : null;
}

/**
 * For pricing a cart: straight from the API, never the CDN, so a stock or price change in the
 * editor is what the next checkout sees. English is fine here; only numbers are used.
 */
export async function getCheckoutProducts(slugs: string[]): Promise<Map<string, { name: string; priceOre: number; stock: number }>> {
  const rows = await client.withConfig({ useCdn: false }).fetch<{ slug: string; name: string | null; priceOre: number | null; stock: number | null }[]>(
    `*[_type == "product" && visible != false && slug.current in $slugs]{ "slug": slug.current, "name": name[_key == "en"][0].value, priceOre, stock }`,
    { slugs },
  );
  return new Map(rows.map((r) => [r.slug, { name: r.name ?? r.slug, priceOre: r.priceOre ?? 0, stock: r.stock ?? 0 }]));
}

export async function getShippingRules(): Promise<ShippingRules> {
  const s = await client.withConfig({ useCdn: false }).fetch<{ shippingOre?: number; freeShippingFromOre?: number | null } | null>(`*[_id == "siteSettings"][0]{ shippingOre, freeShippingFromOre }`);
  return {
    shippingOre: s?.shippingOre ?? DEFAULT_RULES.shippingOre,
    freeShippingFromOre: s?.freeShippingFromOre ?? DEFAULT_RULES.freeShippingFromOre,
  };
}

// ---- pages ------------------------------------------------------------------------------------

const HOME_QUERY = defineQuery(`*[_id == "homePage"][0]{
  "hero": { "videoSrc": coalesce(hero.video.asset->url, hero.videoUrl), "logoPosition": hero.logoPosition },
  "productsTitle": ${L("productsTitle")},
  "values": { "title": ${L("values.title")}, "intro": ${L("values.intro")},
    "items": values.items[]{ "title": ${L("title")}, "description": ${L("description")}, "image": ${IMG("image")} } }
}`);

export type HomeHero = { /** An uploaded or linked video; `undefined` means the site's built-in one. */ videoSrc?: string; logoPosition: "left" | "center" };

export async function getHomePage(): Promise<{ hero: HomeHero; productsTitle: string; values: { title: string; intro: string; items: ScrollyValue[] } }> {
  const lang = await getLanguage();
  const { data } = await sanityFetch({ query: HOME_QUERY, params: { lang }, stega: false, tags: [CONTENT_TAG] });
  const d = (data ?? {}) as { hero?: { videoSrc?: string | null; logoPosition?: string | null } | null; productsTitle?: string | null; values?: { title?: string | null; intro?: string | null; items?: { title?: string | null; description?: string | null; image?: RawImage | null }[] | null } | null };
  return {
    hero: { videoSrc: d.hero?.videoSrc ?? undefined, logoPosition: d.hero?.logoPosition === "center" ? "center" : "left" },
    productsTitle: d.productsTitle ?? "All items",
    values: {
      title: d.values?.title ?? "Values",
      intro: d.values?.intro ?? "",
      items: (d.values?.items ?? []).filter((v) => v?.image?.src).map((v) => ({ title: v.title ?? "", description: v.description ?? "", image: { src: v.image!.src!, alt: v.image?.alt ?? v.title ?? "" } })),
    },
  };
}

type Block = { children?: { text?: string }[] };
const paragraphs = (blocks: Block[] | null | undefined) => (blocks ?? []).map((b) => (b.children ?? []).map((c) => c.text ?? "").join("")).filter(Boolean);

const FAQ_QUERY = defineQuery(`*[_type == "faqItem"] | order(order asc){ "title": ${L("question")}, "answer": ${L("answer")}, "image": ${IMG("image")} }`);

export async function getFaq(): Promise<DropdownListItem[]> {
  const lang = await getLanguage();
  const { data } = await sanityFetch({ query: FAQ_QUERY, params: { lang }, stega: false, tags: [CONTENT_TAG] });
  return ((data ?? []) as { title?: string | null; answer?: Block[] | null; image?: RawImage | null }[]).map((f) => ({
    title: f.title ?? "",
    content: paragraphs(f.answer),
    ...(f.image?.src ? { image: { src: f.image.src, alt: f.image.alt ?? "" } } : {}),
  }));
}

const POLICY_QUERY = defineQuery(`*[_type == "policyPage" && page == $page][0]{ "title": ${L("title")}, "intro": ${L("intro")}, "body": ${L("body")} }`);

export type PolicyContent = { title: string; intro: string; items: DropdownListItem[] };

/**
 * Policy text is paragraphs in the editor. A paragraph written as "Heading — text" becomes a
 * collapsible section with that heading, which is how the page has always been laid out.
 */
export async function getPolicy(page: string): Promise<PolicyContent | null> {
  const lang = await getLanguage();
  const { data } = await sanityFetch({ query: POLICY_QUERY, params: { page, lang }, stega: false, tags: [CONTENT_TAG] });
  if (!data) return null;
  const d = data as { title?: string | null; intro?: string | null; body?: Block[] | null };
  const items = paragraphs(d.body).map((p, i) => {
    const m = p.match(/^(.{1,80}?)\s+[—–-]\s+([\s\S]+)$/);
    return m ? { title: m[1], content: m[2] } : { title: `${i + 1}`, content: p };
  });
  return { title: d.title ?? "", intro: d.intro ?? "", items };
}

const SETTINGS_QUERY = defineQuery(`*[_id == "siteSettings"][0]{ siteName, "announcement": ${L("announcement")}, "signUpTitle": ${L("signUpTitle")}, "signUpText": ${L("signUpText")}, "signUpButton": ${L("signUpButton")}, "footerText": ${L("footerText")}, instagram, contactEmail, "signUpImage": signUpImage.asset->url, "footerImage": footerImage.asset->url }`);

export type SiteCopy = {
  siteName: string; announcement: string; signUpTitle: string; signUpText: string; signUpButton: string; footerText: string; instagram: string; contactEmail: string;
  /** Uploaded background photos; `undefined` means the built-in one. */
  signUpImage?: string; footerImage?: string;
};

export async function getSiteCopy(): Promise<SiteCopy> {
  const lang: Lang = await getLanguage();
  const { data } = await sanityFetch({ query: SETTINGS_QUERY, params: { lang }, stega: false, tags: [CONTENT_TAG] });
  const d = (data ?? {}) as Partial<Record<keyof SiteCopy, string | null>>;
  return {
    siteName: d.siteName ?? "Flöra",
    announcement: d.announcement ?? "",
    signUpTitle: d.signUpTitle ?? "Join the family",
    signUpText: d.signUpText ?? "",
    signUpButton: d.signUpButton ?? "Sign up",
    footerText: d.footerText ?? "",
    instagram: d.instagram ?? "",
    contactEmail: d.contactEmail ?? "",
    signUpImage: d.signUpImage ?? undefined,
    footerImage: d.footerImage ?? undefined,
  };
}
