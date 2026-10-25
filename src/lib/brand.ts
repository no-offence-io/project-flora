import "server-only";
import { defineQuery } from "next-sanity";
import { FONTS, type Brand } from "./brand-shared";
import { CONTENT_TAG } from "./catalog";
import { sanityFetch } from "@/sanity/lib/live";

const BRAND_QUERY = defineQuery(`*[_id == "siteSettings"][0].brand{ "logo": logo.asset->url, headingFont, bodyFont, headingSizeDesktop, headingSizeMobile, bannerSize, paragraphSize, backgroundColor, textColor }`);

export const DEFAULT_LOGO = "/footer/flora-logo.svg";

export async function getBrand(): Promise<Brand> {
  const { data } = await sanityFetch({ query: BRAND_QUERY, stega: false, tags: [CONTENT_TAG] });
  const d = (data ?? {}) as Record<string, unknown>;
  const str = (k: string) => (typeof d[k] === "string" && d[k] ? (d[k] as string) : undefined);
  const num = (k: string) => (typeof d[k] === "number" ? (d[k] as number) : undefined);
  return {
    logo: str("logo"),
    headingFont: str("headingFont"),
    bodyFont: str("bodyFont"),
    headingSizeDesktop: num("headingSizeDesktop"),
    headingSizeMobile: num("headingSizeMobile"),
    bannerSize: num("bannerSize"),
    paragraphSize: num("paragraphSize"),
    backgroundColor: str("backgroundColor"),
    textColor: str("textColor"),
  };
}

/** The logo everywhere it appears: the uploaded one, or the site's own file. */
export async function getLogoSrc(): Promise<string> {
  return (await getBrand()).logo ?? DEFAULT_LOGO;
}

/**
 * Brand → CSS variables on <html>. Only what is set is overridden; the built-in design is in the
 * stylesheet and next/font, so an empty brand changes nothing. Google fonts come as one stylesheet link.
 */
export function brandStyle(b: Brand): { style: Record<string, string>; fontHref?: string } {
  const style: Record<string, string> = {};
  const families: string[] = [];
  const font = (key: string | undefined, cssVar: string) => {
    if (!key || key === "americana" || key === "gotham") return;
    const f = FONTS[key];
    if (!f) return;
    style[cssVar] = f.css;
    if (f.google) families.push(f.google);
  };
  font(b.headingFont, "--font-americana");
  font(b.bodyFont, "--font-gotham");
  if (b.headingSizeDesktop) style["--text-big-header-desktop"] = `${b.headingSizeDesktop}px`;
  if (b.headingSizeMobile) style["--text-big-header-mobile"] = `${b.headingSizeMobile}px`;
  if (b.bannerSize) style["--text-banner-title"] = `${b.bannerSize}px`;
  if (b.paragraphSize) style["--text-paragraph"] = `${b.paragraphSize}px`;
  if (b.backgroundColor) style["--background"] = b.backgroundColor;
  if (b.textColor) style["--foreground"] = b.textColor;
  return { style, ...(families.length ? { fontHref: `https://fonts.googleapis.com/css2?${families.map((f) => `family=${f}`).join("&")}&display=swap` } : {}) };
}
