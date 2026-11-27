import "server-only";
import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { rateLimitDocId } from "./doc-ids";
import { decide, LIMITS, recent, type Bucket } from "./rate-limit-rules";
import { getWriteClient } from "@/sanity/lib/write";

/*
 * Counts per visitor, kept in a small private document each (`ratelimit.<what>-<who>`), so they hold
 * across every server instance. "Who" is the visitor's address run through a keyed hash: the
 * address itself is never stored. The nightly sweep deletes counts nobody has touched for a while.
 *
 * Every function here fails open. If the count can't be read or written, the visitor is let
 * through: a limit that is down must never be the reason a customer can't pay.
 */

type Source = Headers | { get(name: string): string | null };

/** The visitor's address as the platform reports it. On Vercel these headers are set by the edge and can't be forged by the caller. */
function addressOf(source: Source): string {
  return source.get("x-real-ip")?.trim() || source.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

function idFor(bucket: Bucket, source: Source): string {
  const who = createHmac("sha256", process.env.AUTH_SECRET || "flora-rate-limit").update(addressOf(source)).digest("hex").slice(0, 32);
  return rateLimitDocId(`${bucket}-${who}`);
}

const sourceOr = async (source?: Source) => source ?? (await headers());

/** Counts this attempt and says whether it is within the limit. For things that cost something whenever they are tried. */
export async function allow(bucket: Bucket, source?: Source): Promise<boolean> {
  try {
    const client = getWriteClient();
    const id = idFor(bucket, await sourceOr(source));
    const doc = await client.getDocument<{ sent?: number[] }>(id);
    const verdict = decide(doc?.sent, Date.now(), LIMITS[bucket]);
    if (verdict.ok) await client.createOrReplace({ _id: id, _type: "rateLimit", sent: verdict.sent });
    return verdict.ok;
  } catch (err) {
    console.error(`[rate-limit] ${bucket} unavailable, letting the request through`, err);
    return true;
  }
}

/** Whether the visitor is over the limit already, without counting anything. Pair with `count` to count only failures. */
export async function overLimit(bucket: Bucket, source?: Source): Promise<boolean> {
  try {
    const doc = await getWriteClient().getDocument<{ sent?: number[] }>(idFor(bucket, await sourceOr(source)));
    return recent(doc?.sent, Date.now(), LIMITS[bucket]).length >= LIMITS[bucket].max;
  } catch (err) {
    console.error(`[rate-limit] ${bucket} unavailable, letting the request through`, err);
    return false;
  }
}

/** Counts one, whatever the total. For failures: a wrong discount code, an order that wasn't found. */
export async function count(bucket: Bucket, source?: Source): Promise<void> {
  try {
    const client = getWriteClient();
    const id = idFor(bucket, await sourceOr(source));
    const doc = await client.getDocument<{ sent?: number[] }>(id);
    const now = Date.now();
    await client.createOrReplace({ _id: id, _type: "rateLimit", sent: [...recent(doc?.sent, now, LIMITS[bucket]).slice(-LIMITS[bucket].max), now] });
  } catch (err) {
    console.error(`[rate-limit] ${bucket} could not be counted`, err);
  }
}
