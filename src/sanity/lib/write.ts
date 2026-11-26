import "server-only";
import { createClient } from "next-sanity";
import { apiVersion, dataset, projectId } from "./env";

/**
 * The one client allowed to change content. Guarded by `server-only`, so importing it from any
 * client component fails the build rather than leaking the token. Used by the Stripe webhook to
 * record orders; nothing in the request path of a page should ever need it.
 */
export function getWriteClient() {
  const token = process.env.SANITY_TOKEN;
  if (!token) throw new Error("SANITY_TOKEN is not set. It is required to record orders in Sanity.");
  return createClient({ projectId, dataset, apiVersion, token, useCdn: false });
}

/**
 * Can the token actually write? Asked of Sanity itself with a dry run (nothing is stored): a token
 * can exist and still be read-only, for instance after its role was changed in sanity.io/manage,
 * and then orders are paid for but never recorded. The answer is kept for a minute per instance.
 */
let writeCheck: { ok: boolean; reason?: string; at: number } | null = null;
export async function canWrite(): Promise<{ ok: boolean; reason?: string }> {
  if (writeCheck && Date.now() - writeCheck.at < 60_000) return writeCheck;
  try {
    await getWriteClient().createOrReplace({ _id: "notification.write-check", _type: "notification", demo: true }, { dryRun: true });
    writeCheck = { ok: true, at: Date.now() };
  } catch (err) {
    const message = err instanceof Error ? err.message.split("\n")[0] : String(err);
    // Only a refusal is an answer; a network hiccup is not proof of anything and is not remembered.
    if (!/permission|unauthor|forbidden|SANITY_TOKEN/i.test(message)) return { ok: true };
    writeCheck = { ok: false, reason: message.slice(0, 200), at: Date.now() };
  }
  return writeCheck;
}

