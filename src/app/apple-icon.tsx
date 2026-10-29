import { getSiteIcons, squarePng } from "@/lib/brand";
import { APPLE_ICON_PNG } from "@/lib/favicon";

/** The iPhone/iPad home-screen icon. iOS rounds the corners itself and wants no transparency, so uploads are flattened onto white. */
export const contentType = "image/png";
export const size = { width: 180, height: 180 };
export const dynamic = "force-dynamic";

const HEADERS = { "Content-Type": "image/png", "Cache-Control": "public, max-age=3600" };

export default async function AppleIcon() {
  const icons = await getSiteIcons();
  if (icons.home) {
    const res = await fetch(squarePng(icons.home, 180, true), { next: { revalidate: 3600 } });
    if (res.ok) return new Response(await res.arrayBuffer(), { headers: HEADERS });
  }
  return new Response(Buffer.from(APPLE_ICON_PNG[icons.style], "base64"), { headers: HEADERS });
}
