import type { MetadataRoute } from "next";
import { client } from "@/sanity/lib/client";

const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.prosjectflora.com").replace(/\/$/, "");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, posts] = await Promise.all([
    client.fetch<{ slug: string; updated: string }[]>(`*[_type == "product" && visible != false && defined(slug.current)]{ "slug": slug.current, "updated": _updatedAt }`),
    client.fetch<{ slug: string; updated: string }[]>(`*[_type == "post" && published == true && defined(slug.current)]{ "slug": slug.current, "updated": _updatedAt }`),
  ]);
  const fixed = ["", "/shop", "/vintage", "/values", "/about", "/journal", "/faq", "/terms", "/refunds-and-exchange", "/privacy", "/shipping"];
  return [
    ...fixed.map((path) => ({ url: `${base}${path}`, changeFrequency: "weekly" as const, priority: path === "" ? 1 : 0.7 })),
    ...products.map((p) => ({ url: `${base}/shop/${p.slug}`, lastModified: p.updated, changeFrequency: "weekly" as const, priority: 0.8 })),
    ...posts.map((p) => ({ url: `${base}/journal/${p.slug}`, lastModified: p.updated, changeFrequency: "monthly" as const, priority: 0.5 })),
  ];
}
