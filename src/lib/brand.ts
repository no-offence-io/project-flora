import "server-only";
import { defineQuery } from "next-sanity";
import { FONTS, type Brand } from "./brand-shared";
import { parseFaviconStyle, type FaviconStyle } from "./favicon";
import { parseLoadingStyle, type LoadingStyle } from "./loading-shared";
import { parseTransition, type TransitionSetting } from "./page-transition-shared";
import { CONTENT_TAG } from "./catalog";
import { sanityFetch } from "@/sanity/lib/live";

const BRAND_QUERY = defineQuery(`*[_id == "siteSettings"][0].brand{ "logo": logo.asset->url, headingFont, bodyFont, headingSizeDesktop, headingSizeMobile, bannerSize, paragraphSize, backgroundColor, textColor, favicon, "tabIcon": tabIcon.asset->url, "homeIcon": homeIcon.asset->url, "androidIcon": androidIcon.asset->url }`);

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
    favicon: parseFaviconStyle(d.favicon),
    tabIcon: str("tabIcon"),
    homeIcon: str("homeIcon"),
    androidIcon: str("androidIcon"),
  };
}

/** Which colourway of the bud mark the browser tab and home screen show. */
export async function getFaviconStyle(): Promise<FaviconStyle> {
  return (await getBrand()).favicon ?? "black";
}

/**
 * What each place shows: an uploaded picture where Ida put one, otherwise the built-in mark in the
 * chosen colourway. The home-screen icon falls back to the tab icon, Android to the home-screen one.
 */
export type SiteIcons = { style: FaviconStyle; tab?: string; home?: string; android?: string };
export async function getSiteIcons(): Promise<SiteIcons> {
  const b = await getBrand();
  const tab = b.tabIcon;
  const home = b.homeIcon ?? tab;
  return { style: b.favicon ?? "black", ...(tab ? { tab } : {}), ...(home ? { home } : {}), ...(b.androidIcon ?? home ? { android: b.androidIcon ?? home } : {}) };
}

/** A Sanity image URL resized to a square PNG. `bg` flattens transparency onto white, which home screens want. */
export const squarePng = (url: string, px: number, bg = false) => `${url}?w=${px}&h=${px}&fit=crop&fm=png${bg ? "&bg=ffffff" : ""}`;

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

/** The Google Analytics measurement ID from Settings, or null when analytics is off. */
export async function getAnalyticsId(): Promise<string | null> {
  const { data } = await sanityFetch({ query: `*[_id == "siteSettings"][0].gaMeasurementId`, stega: false, tags: [CONTENT_TAG] });
  return typeof data === "string" && /^G-[A-Z0-9]{4,16}$/.test(data) ? data : null;
}

/** How the shop moves between pages, from the dashboard's Page transitions page. */
export async function getPageTransition(): Promise<TransitionSetting> {
  const { data } = await sanityFetch({ query: `*[_id == "siteSettings"][0].pageTransition`, stega: false, tags: [CONTENT_TAG] });
  return parseTransition(data as Record<string, unknown> | null);
}

/** How photos wait to load, from the same dashboard page. */
export async function getLoadingStyle(): Promise<LoadingStyle> {
  const { data } = await sanityFetch({ query: `*[_id == "siteSettings"][0].loadingStyle`, stega: false, tags: [CONTENT_TAG] });
  return parseLoadingStyle(data);
}
