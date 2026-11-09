import type { MetadataRoute } from "next";
import { isComingSoon } from "@/lib/gate";

const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.prosjectflora.com").replace(/\/$/, "");

export default async function robots(): Promise<MetadataRoute.Robots> {
  // While the coming-soon gate is up there is nothing to index yet.
  if (await isComingSoon()) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/checkout", "/order-complete", "/order", "/account"] },
    sitemap: `${base}/sitemap.xml`,
  };
}
