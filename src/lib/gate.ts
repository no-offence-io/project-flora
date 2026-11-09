/*
 * The coming-soon gate's switch. Set on the dashboard (Settings → Shop status) and stored on the
 * siteSettings document; while nothing has been saved there, the COMING_SOON environment variable
 * decides, as it did before the switch existed. Read by the proxy on every request, so the answer
 * is kept in memory for a few seconds: one Sanity read per instance per TTL, not per page view.
 *
 * No Sanity client here: the proxy imports this, and it should stay a plain fetch with no
 * server-only module behind it. The dataset is private, so the read carries the server's token.
 */
const TTL_MS = 15_000;
let cached: { value: boolean | null; at: number } | null = null;

export async function isComingSoon(): Promise<boolean> {
  const fallback = process.env.COMING_SOON === "true";
  const now = Date.now();
  if (!cached || now - cached.at > TTL_MS) cached = { value: await readSetting(), at: now };
  return cached.value ?? fallback;
}

/** Drops the cached answer, so a save on the dashboard shows on this instance at once. */
export function forgetComingSoon(): void {
  cached = null;
}

async function readSetting(): Promise<boolean | null> {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET;
  const token = process.env.SANITY_READ_TOKEN || process.env.SANITY_TOKEN;
  if (!projectId || !dataset || !token) return null;
  try {
    const query = encodeURIComponent(`*[_id == "siteSettings"][0].comingSoon`);
    const res = await fetch(`https://${projectId}.api.sanity.io/v2026-02-01/data/query/${dataset}?query=${query}&perspective=published`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    if (!res.ok) return null;
    const { result } = (await res.json()) as { result?: unknown };
    return typeof result === "boolean" ? result : null;
  } catch {
    return null;
  }
}
