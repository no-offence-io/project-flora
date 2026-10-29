import { getSiteIcons, squarePng } from "@/lib/brand";
import { PWA_ICON_PNG } from "@/lib/favicon";

/** Android home-screen icons for the manifest, 192 or 512 px: the uploaded one, else the bud mark on a white tile. */
export const dynamic = "force-dynamic";

const HEADERS = { "Content-Type": "image/png", "Cache-Control": "public, max-age=3600" };

export async function GET(req: Request) {
  const px = new URL(req.url).searchParams.get("size") === "192" ? 192 : 512;
  const icons = await getSiteIcons();
  if (icons.android) {
    const res = await fetch(squarePng(icons.android, px, true), { next: { revalidate: 3600 } });
    if (res.ok) return new Response(await res.arrayBuffer(), { headers: HEADERS });
  }
  return new Response(Buffer.from(PWA_ICON_PNG[icons.style][px], "base64"), { headers: HEADERS });
}
