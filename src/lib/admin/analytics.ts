import "server-only";
import { createSign } from "node:crypto";

/*
 * Google Analytics, read for the dashboard. Authenticates as the `flora-dashboard` service account
 * (its JSON key, base64, in GA_SERVICE_ACCOUNT_B64 — a Vercel sensitive variable, never in the
 * repo) by signing its own JWT with Node's crypto; no Google SDK. The property to read comes from
 * Settings, so Ida can point it elsewhere without a deploy. Everything here is read-only.
 */

type Key = { client_email: string; private_key: string; token_uri?: string };

export function analyticsConfigured(): boolean {
  return Boolean(process.env.GA_SERVICE_ACCOUNT_B64);
}

function readKey(): Key | null {
  const raw = process.env.GA_SERVICE_ACCOUNT_B64;
  if (!raw) return null;
  try {
    const k = JSON.parse(Buffer.from(raw, "base64").toString("utf8")) as Key;
    return k.client_email && k.private_key ? k : null;
  } catch {
    return null;
  }
}

export function serviceAccountEmail(): string | null {
  return readKey()?.client_email ?? null;
}

let cached: { token: string; expiresAt: number } | null = null;

/** An access token for the Data API, kept until a few minutes before it expires. */
async function accessToken(): Promise<string> {
  if (cached && cached.expiresAt > Date.now() + 120_000) return cached.token;
  const key = readKey();
  if (!key) throw new Error("GA_SERVICE_ACCOUNT_B64 is missing or not a valid service-account key");
  const tokenUri = key.token_uri ?? "https://oauth2.googleapis.com/token";
  const now = Math.floor(Date.now() / 1000);
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const unsigned = `${b64({ alg: "RS256", typ: "JWT" })}.${b64({ iss: key.client_email, scope: "https://www.googleapis.com/auth/analytics.readonly", aud: tokenUri, iat: now, exp: now + 3600 })}`;
  const signature = createSign("RSA-SHA256").update(unsigned).sign(key.private_key, "base64url");
  const res = await fetch(tokenUri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${signature}` }),
  });
  const data = (await res.json()) as { access_token?: string; expires_in?: number; error?: string; error_description?: string };
  if (!res.ok || !data.access_token) throw new Error(`Google refused the service account: ${data.error_description ?? data.error ?? res.status}`);
  cached = { token: data.access_token, expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000 };
  return cached.token;
}

type Row = { dimensionValues?: { value: string }[]; metricValues?: { value: string }[] };
type Report = { rows?: Row[]; rowCount?: number };
type ReportRequest = {
  dateRanges: { startDate: string; endDate: string }[];
  dimensions?: { name: string }[];
  metrics: { name: string }[];
  orderBys?: unknown[];
  limit?: number;
  dimensionFilter?: unknown;
};

/** Up to five reports in one round trip. Errors carry Google's own message so the page can show it. */
async function batchRunReports(propertyId: string, requests: ReportRequest[]): Promise<Report[]> {
  const token = await accessToken();
  const res = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${encodeURIComponent(propertyId)}:batchRunReports`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ requests }),
    cache: "no-store",
  });
  const data = (await res.json()) as { reports?: Report[]; error?: { code?: number; message?: string; status?: string } };
  if (!res.ok || !data.reports) {
    const status = data.error?.status ?? String(res.status);
    const hint = status === "PERMISSION_DENIED" ? ` — the service account probably hasn't been given Viewer access to property ${propertyId} in Analytics yet.` : "";
    throw new Error(`${data.error?.message ?? "Google Analytics returned an error"}${hint}`);
  }
  return data.reports;
}

/** Visitors on the site in the last 30 minutes, from the realtime API — the way to check that counting works. */
export async function getActiveNow(propertyId: string): Promise<number> {
  const token = await accessToken();
  const res = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${encodeURIComponent(propertyId)}:runRealtimeReport`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ metrics: [{ name: "activeUsers" }] }),
    cache: "no-store",
  });
  const data = (await res.json()) as Report & { error?: { message?: string } };
  if (!res.ok) throw new Error(data.error?.message ?? "Google Analytics returned an error");
  return Number(data.rows?.[0]?.metricValues?.[0]?.value ?? 0) || 0;
}

const dim = (r: Row, i: number) => r.dimensionValues?.[i]?.value ?? "";
const num = (r: Row, i: number) => Number(r.metricValues?.[i]?.value ?? 0) || 0;

export type Visits = {
  days: number;
  totals: { users: number; sessions: number; views: number; seconds: number };
  previous: { users: number; sessions: number; views: number; seconds: number };
  daily: { date: string; users: number; sessions: number }[];
  sources: { name: string; sessions: number; users: number }[];
  products: { path: string; title: string; views: number }[];
  pages: { path: string; title: string; views: number }[];
  devices: { name: string; users: number }[];
  countries: { name: string; users: number }[];
};

const SOURCE_NAMES: Record<string, string> = { "(direct)": "Direct", ig: "Instagram", instagram: "Instagram", "l.instagram.com": "Instagram", "instagram.com": "Instagram", google: "Google", fb: "Facebook", "m.facebook.com": "Facebook", "facebook.com": "Facebook", tiktok: "TikTok", pinterest: "Pinterest", "pinterest.com": "Pinterest" };
const pretty = (s: string) => SOURCE_NAMES[s.toLowerCase()] ?? s;

/** The dashboard's "Visits" page in one call: the last `days` days against the `days` before them. */
export async function getVisits(propertyId: string, days: number): Promise<Visits> {
  const current = [{ startDate: `${days - 1}daysAgo`, endDate: "today" }];
  const previous = [{ startDate: `${2 * days - 1}daysAgo`, endDate: `${days}daysAgo` }];
  const totals = { name: "activeUsers" };
  const metrics = [totals, { name: "sessions" }, { name: "screenPageViews" }, { name: "userEngagementDuration" }];
  const [a, b] = await Promise.all([
    batchRunReports(propertyId, [
      { dateRanges: current, metrics },
      { dateRanges: previous, metrics },
      { dateRanges: current, dimensions: [{ name: "date" }], metrics: [totals, { name: "sessions" }], orderBys: [{ dimension: { dimensionName: "date" } }], limit: 100 },
      { dateRanges: current, dimensions: [{ name: "sessionSource" }], metrics: [{ name: "sessions" }, totals], orderBys: [{ metric: { metricName: "sessions" }, desc: true }], limit: 10 },
      { dateRanges: current, dimensions: [{ name: "pagePath" }, { name: "pageTitle" }], metrics: [{ name: "screenPageViews" }], orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }], limit: 40 },
    ]),
    batchRunReports(propertyId, [
      { dateRanges: current, dimensions: [{ name: "deviceCategory" }], metrics: [totals], orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }], limit: 5 },
      { dateRanges: current, dimensions: [{ name: "country" }], metrics: [totals], orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }], limit: 8 },
    ]),
  ]);
  const sum = (rep: Report) => {
    const r = rep.rows?.[0];
    return r ? { users: num(r, 0), sessions: num(r, 1), views: num(r, 2), seconds: num(r, 3) } : { users: 0, sessions: 0, views: 0, seconds: 0 };
  };
  const pages = (a[4].rows ?? []).map((r) => ({ path: dim(r, 0), title: dim(r, 1).replace(/\s*[–-]\s*Flöra\s*$/, ""), views: num(r, 0) }));
  return {
    days,
    totals: sum(a[0]),
    previous: sum(a[1]),
    daily: (a[2].rows ?? []).map((r) => ({ date: dim(r, 0), users: num(r, 0), sessions: num(r, 1) })),
    sources: (a[3].rows ?? []).map((r) => ({ name: pretty(dim(r, 0)), sessions: num(r, 0), users: num(r, 1) })),
    products: pages.filter((p) => /^\/shop\/[^/]+/.test(p.path)).slice(0, 8),
    pages: pages.filter((p) => !/^\/shop\/[^/]+/.test(p.path)).slice(0, 8),
    devices: (b[0].rows ?? []).map((r) => ({ name: dim(r, 0).replace(/^\w/, (c) => c.toUpperCase()), users: num(r, 0) })),
    countries: (b[1].rows ?? []).map((r) => ({ name: dim(r, 0), users: num(r, 0) })),
  };
}
