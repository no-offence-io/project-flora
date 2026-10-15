import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

/**
 * Sanity → us, on every publish. Every storefront read is tagged `sanity-content`; dropping that
 * tag makes the next request re-render with the new content. The Live Content API does the same
 * through any browser that has the site open; this covers the case where none does, so an edit
 * made on a quiet Tuesday is on the site before anyone looks.
 */
export async function POST(req: Request) {
  const secret = process.env.REVALIDATE_SECRET;
  const offered = req.headers.get("x-revalidate-secret") ?? "";
  if (!secret) return NextResponse.json({ error: "Not configured" }, { status: 503 });
  const a = Buffer.from(offered);
  const b = Buffer.from(secret);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  revalidateTag("sanity-content", "max");
  return NextResponse.json({ revalidated: true, at: new Date().toISOString() });
}
