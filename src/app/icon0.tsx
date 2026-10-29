import { getSiteIcons, squarePng } from "@/lib/brand";
import { FAVICON_PNG } from "@/lib/favicon";

/** The favicon as a PNG, for Safari and older browsers: the uploaded tab icon if there is one, else the bud mark. */
export const contentType = "image/png";
export const size = { width: 32, height: 32 };
export const dynamic = "force-dynamic";

const HEADERS = { "Content-Type": "image/png", "Cache-Control": "public, max-age=3600" };

export default async function Icon() {
  const icons = await getSiteIcons();
  if (icons.tab) {
    const res = await fetch(squarePng(icons.tab, 64), { next: { revalidate: 3600 } });
    if (res.ok) return new Response(await res.arrayBuffer(), { headers: HEADERS });
  }
  return new Response(Buffer.from(FAVICON_PNG[icons.style], "base64"), { headers: HEADERS });
}
