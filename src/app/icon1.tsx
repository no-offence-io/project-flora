import { getSiteIcons, squarePng } from "@/lib/brand";
import { faviconSvg } from "@/lib/favicon";

/**
 * The favicon as a vector, which Chrome, Firefox and Edge prefer over the PNG. An uploaded tab icon
 * is wrapped in an SVG so this route stays an SVG whatever Ida uploads.
 */
export const contentType = "image/svg+xml";
export const dynamic = "force-dynamic";

const HEADERS = { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=3600" };

export default async function Icon() {
  const icons = await getSiteIcons();
  if (icons.tab) {
    const res = await fetch(squarePng(icons.tab, 128), { next: { revalidate: 3600 } });
    if (res.ok) {
      const b64 = Buffer.from(await res.arrayBuffer()).toString("base64");
      return new Response(`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 128 128"><image width="128" height="128" xlink:href="data:image/png;base64,${b64}"/></svg>`, { headers: HEADERS });
    }
  }
  return new Response(faviconSvg(icons.style), { headers: HEADERS });
}
