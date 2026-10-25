import type { MetadataRoute } from "next";

const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.prosjectflora.com").replace(/\/$/, "");

export default function robots(): MetadataRoute.Robots {
  // While the coming-soon gate is up there is nothing to index yet.
  if (process.env.COMING_SOON === "true") return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/checkout", "/order-complete", "/order", "/account"] },
    sitemap: `${base}/sitemap.xml`,
  };
}
