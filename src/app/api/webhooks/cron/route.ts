import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { sweep } from "@/lib/sweep";

/*
 * The scheduler's door. Vercel calls this on the schedule in vercel.json and proves it is Vercel by
 * sending `Authorization: Bearer <CRON_SECRET>`; anyone else gets nothing. Without CRON_SECRET set
 * the route refuses everyone, rather than running for whoever asks.
 *
 * It lives under /api/webhooks because the coming-soon gate lets that path through: the sweep must
 * run whether or not the shop is open to visitors.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET is not set" }, { status: 503 });
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  const wanted = Buffer.from(`Bearer ${secret}`);
  if (given.length !== wanted.length || !timingSafeEqual(given, wanted)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json({ ok: true, ...(await sweep()) }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[cron] sweep failed", err);
    return NextResponse.json({ error: "Sweep failed" }, { status: 500 });
  }
}
