import "server-only";
import { parseTransform, type MediaTransform } from "./media-transform";
import { parseVintageCard, type VintageCardSetting } from "./vintage-card-shared";
import { defineQuery } from "next-sanity";
import { client } from "@/sanity/lib/client";
import { sanityFetch } from "@/sanity/lib/live";
import type { DropdownListItem } from "@/components/dropdown-list";
import type { ScrollyValue } from "@/components/values-scrolly";
import type { ProductSize, Sizing } from "./catalog-types";
import { CATEGORIES, type Category, type Product, toImage, type SiteImage } from "./catalog-types";
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
const IMG = (field: string) => `{ "src": ${field}.asset->url, "alt": ${L(`${field}.alt`)}, "scale": ${field}.scale, "x": ${field}.x, "y": ${field}.y }`;

const PRODUCT_FIELDS = `
  "slug": slug.current, category, "name": name[_key == "en"][0].value, priceOre, compareAtPriceOre, stock, sizing, "sizes": sizes[]{ label, stock }, vintage, vintageLayout, "gif": gif.asset->url,
  "description": ${L("description")},
  "colors": colors[]{ hex, "name": ${L("name")}, "image": ${IMG("image")} },
  "images": images[]${IMG("@")},
  "specs": specs[]{ "label": ${L("label")}, "value": ${L("value")}, emphasis, expandable, hideOnMobile }
`;

const PRODUCTS_QUERY = defineQuery(`*[_type == "product" && visible != false && vintage != true && defined(slug.current)] | order(_createdAt asc) { ${PRODUCT_FIELDS} }`);
const VINTAGE_QUERY = defineQuery(`*[_type == "product" && visible != false && vintage == true && defined(slug.current)] | order(_createdAt desc) { ${PRODUCT_FIELDS} }`);
const PRODUCT_QUERY = defineQuery(`*[_type == "product" && slug.current == $slug][0] { ${PRODUCT_FIELDS} }`);

type RawImage = { src?: string | null; alt?: string | null; scale?: number | null; x?: number | null; y?: number | null };
type RawProduct = {
  slug: string; category?: string | null; name?: string | null; priceOre?: number | null; compareAtPriceOre?: number | null; stock?: number | null;
  sizing?: string | null; sizes?: { label?: string | null; stock?: number | null }[] | null; vintage?: boolean | null; vintageLayout?: string | null; gif?: string | null;
  description?: string | null;
  colors?: { hex?: string | null; name?: string | null; image?: RawImage | null }[] | null;
  images?: RawImage[] | null;
  specs?: { label?: string | null; value?: string | null; emphasis?: boolean | null; expandable?: boolean | null; hideOnMobile?: boolean | null }[] | null;
};

function toProduct(raw: RawProduct): Product {
  const images = (raw.images ?? []).filter((i): i is RawImage & { src: string } => Boolean(i?.src)).map((i) => toImage(i, raw.name ?? ""));
  const fallback = images[0] ?? { src: "", alt: "" };
  return {
    slug: raw.slug,
    category: (CATEGORIES.includes(raw.category as Category) ? raw.category : CATEGORIES[0]) as Category,
    name: raw.name ?? "",
    priceOre: raw.priceOre ?? 0,
    compareAtPriceOre: raw.compareAtPriceOre ?? undefined,
    stock: raw.stock ?? 0,
    sizing: raw.sizing === "sizes" || raw.sizing === "none" ? raw.sizing : "measurements",
    sizes: (raw.sizes ?? []).filter((s) => s?.label).map((s) => ({ label: s.label!, stock: s.stock ?? 0 })),
    vintage: raw.vintage === true,
    vintageLayout: raw.vintageLayout === "plain" ? "plain" : "card",
    gif: raw.gif ?? undefined,
    description: raw.description ?? "",
    colors: (raw.colors ?? [])
      .filter((c) => c?.hex)
      .map((c) => ({ hex: c.hex!, name: c.name ?? "", image: c.image?.src ? toImage(c.image, c.name ?? "") : fallback })),
    images,
    specs: (raw.specs ?? []).map((s) => ({ label: s.label ?? "", value: s.value ?? undefined, emphasis: !!s.emphasis, expandable: !!s.expandable, hideOnMobile: !!s.hideOnMobile })),
  };
}

export async function getProducts(): Promise<Product[]> {
  const lang = await getLanguage();
  const { data } = await sanityFetch({ query: PRODUCTS_QUERY, params: { lang }, stega: false, tags: [CONTENT_TAG] });
  return (data as RawProduct[]).map(toProduct);
}

export async function getVintageProducts(): Promise<Product[]> {
  const lang = await getLanguage();
  const { data } = await sanityFetch({ query: VINTAGE_QUERY, params: { lang }, stega: false, tags: [CONTENT_TAG] });
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
export type CheckoutProduct = { name: string; priceOre: number; stock: number; sizing: Sizing; sizes: ProductSize[] };

export async function getCheckoutProducts(slugs: string[]): Promise<Map<string, CheckoutProduct>> {
  const rows = await client
    .withConfig({ useCdn: false })
    .fetch<{ slug: string; name: string | null; priceOre: number | null; stock: number | null; sizing?: string | null; sizes?: { label?: string | null; stock?: number | null }[] | null }[]>(
      `*[_type == "product" && visible != false && slug.current in $slugs]{ "slug": slug.current, "name": name[_key == "en"][0].value, priceOre, stock, sizing, "sizes": sizes[]{ label, stock } }`,
      { slugs },
    );
  return new Map(
    rows.map((r) => [
      r.slug,
      {
        name: r.name ?? r.slug,
        priceOre: r.priceOre ?? 0,
        stock: r.stock ?? 0,
        sizing: (r.sizing === "sizes" || r.sizing === "none" ? r.sizing : "measurements") as Sizing,
        sizes: (r.sizes ?? []).filter((s) => s?.label).map((s) => ({ label: s.label!, stock: s.stock ?? 0 })),
      },
    ]),
  );
}

type RawRules = {
  shippingOre?: number | null;
  freeShippingFromOre?: number | null;
  shippingZones?: { name?: string | null; countries?: string[] | null; shippingOre?: number | null; freeShippingFromOre?: number | null }[] | null;
  shipsTo?: string[] | null;
};

export async function getShippingRules(): Promise<ShippingRules> {
  const s = await client.withConfig({ useCdn: false }).fetch<RawRules | null>(`*[_id == "siteSettings"][0]{ shippingOre, freeShippingFromOre, shippingZones, shipsTo }`);
  return {
    shippingOre: s?.shippingOre ?? DEFAULT_RULES.shippingOre,
    freeShippingFromOre: s?.freeShippingFromOre ?? DEFAULT_RULES.freeShippingFromOre,
    zones: (s?.shippingZones ?? [])
      .filter((z) => z && typeof z.shippingOre === "number" && (z.countries ?? []).length > 0)
      .map((z) => ({ name: z.name ?? "", countries: (z.countries ?? []).map((c) => c.trim()).filter(Boolean), shippingOre: z.shippingOre!, freeShippingFromOre: z.freeShippingFromOre ?? null })),
    shipsTo: (s?.shipsTo ?? []).map((c) => c.trim()).filter(Boolean),
  };
}

/** The countries offered in the checkout: from settings, else the built-in list. */
export const DEFAULT_SHIPS_TO = ["Norway", "Sweden", "Denmark", "Finland", "Germany", "United Kingdom"];
export async function getShipsTo(): Promise<string[]> {
  const { data } = await sanityFetch({ query: SHIPS_TO_QUERY, stega: false, tags: [CONTENT_TAG] });
  const list = ((data ?? []) as string[]).map((c) => c.trim()).filter(Boolean);
  return list.length ? list : DEFAULT_SHIPS_TO;
}
const SHIPS_TO_QUERY = defineQuery(`*[_id == "siteSettings"][0].shipsTo`);

/** What a made-to-measure product asks the customer for, and the size guide under it. */
export type SizingSettings = { fields: { label: string; hint: string }[]; sizeGuide: string };
export const DEFAULT_MEASUREMENTS = { en: ["Bust", "Waist", "Hips", "Height"], no: ["Byste", "Midje", "Hofter", "Høyde"] };
const SIZING_QUERY = defineQuery(`*[_id == "siteSettings"][0]{ "fields": measurementFields[]{ "label": ${L("label")}, "hint": ${L("hint")} }, "sizeGuide": ${L("sizeGuide")} }`);

export async function getSizingSettings(): Promise<SizingSettings> {
  const lang = await getLanguage();
  const { data } = await sanityFetch({ query: SIZING_QUERY, params: { lang }, stega: false, tags: [CONTENT_TAG] });
  const d = (data ?? {}) as { fields?: { label?: string | null; hint?: string | null }[] | null; sizeGuide?: string | null };
  const fields = (d.fields ?? []).filter((f) => f?.label).map((f) => ({ label: f.label!, hint: f.hint ?? "" }));
  return { fields: fields.length ? fields : DEFAULT_MEASUREMENTS[lang].map((label) => ({ label, hint: "" })), sizeGuide: d.sizeGuide ?? "" };
}

// ---- pages ------------------------------------------------------------------------------------

const HOME_QUERY = defineQuery(`*[_id == "homePage"][0]{
  "hero": { "videoSrc": coalesce(hero.video.asset->url, hero.videoUrl), "logoPosition": hero.logoPosition, "videoFit": { "scale": hero.videoScale, "x": hero.videoX, "y": hero.videoY } },
  "productsTitle": ${L("productsTitle")},
  "values": { "title": ${L("values.title")}, "intro": ${L("values.intro")},
    "items": values.items[]{ "title": ${L("title")}, "description": ${L("description")}, "image": ${IMG("image")} } }
}`);

export type HomeHero = { /** An uploaded or linked video; `undefined` means the site's built-in one. */ videoSrc?: string; /** How the uploaded video sits in the hero, from the media editor. */ videoFit?: MediaTransform; logoPosition: "left" | "center" };

export async function getHomePage(): Promise<{ hero: HomeHero; productsTitle: string; values: { title: string; intro: string; items: ScrollyValue[] } }> {
  const lang = await getLanguage();
  const { data } = await sanityFetch({ query: HOME_QUERY, params: { lang }, stega: false, tags: [CONTENT_TAG] });
  const d = (data ?? {}) as { hero?: { videoSrc?: string | null; logoPosition?: string | null; videoFit?: { scale?: number | null; x?: number | null; y?: number | null } | null } | null; productsTitle?: string | null; values?: { title?: string | null; intro?: string | null; items?: { title?: string | null; description?: string | null; image?: RawImage | null }[] | null } | null };
  return {
    hero: { videoSrc: d.hero?.videoSrc ?? undefined, videoFit: d.hero?.videoSrc ? parseTransform(d.hero?.videoFit) : undefined, logoPosition: d.hero?.logoPosition === "center" ? "center" : "left" },
    productsTitle: d.productsTitle ?? "All items",
    values: {
      title: d.values?.title ?? "Values",
      intro: d.values?.intro ?? "",
      items: (d.values?.items ?? []).filter((v) => v?.image?.src).map((v) => ({ title: v.title ?? "", description: v.description ?? "", image: toImage(v.image!, v.title ?? "") })),
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
    ...(f.image?.src ? { image: toImage(f.image, "") } : {}),
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

const SETTINGS_QUERY = defineQuery(`*[_id == "siteSettings"][0]{ siteName, "announcement": ${L("announcement")}, "signUpTitle": ${L("signUpTitle")}, "signUpText": ${L("signUpText")}, "signUpButton": ${L("signUpButton")}, "footerText": ${L("footerText")}, instagram, contactEmail, "signUpImage": signUpImage.asset->url, "footerImage": footerImage.asset->url, "signUpImageFit": signUpImage{ scale, x, y }, "footerImageFit": footerImage{ scale, x, y } }`);

export type SiteCopy = {
  siteName: string; announcement: string; signUpTitle: string; signUpText: string; signUpButton: string; footerText: string; instagram: string; contactEmail: string;
  /** Uploaded background photos; `undefined` means the built-in one. */
  signUpImage?: string; footerImage?: string;
  /** How the uploaded photos sit in their banners, from the media editor. */
  signUpImageFit?: MediaTransform; footerImageFit?: MediaTransform;
};

export async function getSiteCopy(): Promise<SiteCopy> {
  const lang: Lang = await getLanguage();
  const { data } = await sanityFetch({ query: SETTINGS_QUERY, params: { lang }, stega: false, tags: [CONTENT_TAG] });
  const d = (data ?? {}) as Partial<Record<Exclude<keyof SiteCopy, "signUpImageFit" | "footerImageFit">, string | null>> & { signUpImageFit?: RawImage | null; footerImageFit?: RawImage | null };
  return {
    siteName: d.siteName ?? "Flöra",
    announcement: d.announcement ?? "",
    signUpTitle: d.signUpTitle ?? "Join the family",
    signUpText: d.signUpText ?? "",
    signUpButton: d.signUpButton ?? "Sign up",
    footerText: d.footerText ?? "",
    instagram: d.instagram ?? "https://www.instagram.com/prosject.flora",
    contactEmail: d.contactEmail ?? "",
    signUpImage: d.signUpImage ?? undefined,
    footerImage: d.footerImage ?? undefined,
    signUpImageFit: d.signUpImage ? parseTransform(d.signUpImageFit) : undefined,
    footerImageFit: d.footerImage ? parseTransform(d.footerImageFit) : undefined,
  };
}

// ---- about & vintage --------------------------------------------------------------------------

const ABOUT_QUERY = defineQuery(`*[_id == "aboutPage"][0]{ "title": ${L("title")}, "intro": ${L("intro")}, "body": ${L("body")}, "image": ${IMG("image")} }`);
export type AboutContent = { title: string; intro: string; paragraphs: string[]; image?: SiteImage };

export async function getAboutPage(): Promise<AboutContent | null> {
  const lang = await getLanguage();
  const { data } = await sanityFetch({ query: ABOUT_QUERY, params: { lang }, stega: false, tags: [CONTENT_TAG] });
  const d = data as { title?: string | null; intro?: string | null; body?: Block[] | null; image?: RawImage | null } | null;
  if (!d) return null;
  return { title: d.title ?? "About", intro: d.intro ?? "", paragraphs: paragraphs(d.body), ...(d.image?.src ? { image: toImage(d.image, "") } : {}) };
}

const VINTAGE_CARD_QUERY = defineQuery(`*[_id == "siteSettings"][0].vintageCard`);
/** How the vintage product page shows the piece (see vintage-card-shared.ts); set on the dashboard. */
export async function getVintageCard(): Promise<VintageCardSetting> {
  const { data } = await sanityFetch({ query: VINTAGE_CARD_QUERY, stega: false, tags: [CONTENT_TAG] });
  return parseVintageCard((data ?? null) as { variant?: unknown; sheetBack?: unknown; depth?: unknown } | null);
}

const VINTAGE_PAGE_QUERY = defineQuery(`*[_id == "vintagePage"][0]{ "title": ${L("title")}, "intro": ${L("intro")}, "emptyText": ${L("emptyText")}, "image": ${IMG("image")} }`);
export type VintageContent = { title: string; intro: string; emptyText: string; image?: SiteImage };

export async function getVintagePage(): Promise<VintageContent> {
  const lang = await getLanguage();
  const { data } = await sanityFetch({ query: VINTAGE_PAGE_QUERY, params: { lang }, stega: false, tags: [CONTENT_TAG] });
  const d = (data ?? {}) as { title?: string | null; intro?: string | null; emptyText?: string | null; image?: RawImage | null };
  return {
    title: d.title ?? "Vintage",
    intro: d.intro ?? "",
    emptyText: d.emptyText ?? (lang === "no" ? "Ingen vintageplagg til salgs akkurat nå." : "No vintage pieces for sale right now."),
    ...(d.image?.src ? { image: toImage(d.image, "") } : {}),
  };
}
