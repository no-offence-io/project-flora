import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getWriteClient } from "@/sanity/lib/write";

/*
 * Customer accounts without passwords. A customer proves their email by clicking a link we send
 * to it; that sets a signed session cookie. Both the link and the cookie are HMAC-signed with
 * AUTH_SECRET (never a guessable value), carry an expiry, and are compared in constant time.
 * Nothing about the session is stored server-side, so signing out clears the cookie.
 */
export const SESSION_COOKIE = "flora-account";
const SESSION_DAYS = 60;
const LINK_MINUTES = 30;

export type Measurement = { label: string; value: string };
export type Customer = {
  _id: string;
  stripeCustomerId?: string;
  sessionVersion?: number;
  email: string;
  firstName?: string;
  lastName?: string;
  phonePrefix?: string;
  phone?: string;
  street?: string;
  apartment?: string;
  postcode?: string;
  city?: string;
  country?: string;
  measurements?: Measurement[];
  language?: string;
  createdAt?: string;
};

const secret = () => {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set; customer accounts need it to sign links and sessions.");
  return s;
};
const b64 = (s: string) => Buffer.from(s).toString("base64url");
const unb64 = (s: string) => Buffer.from(s, "base64url").toString();
const sign = (purpose: string, payload: string) => createHmac("sha256", secret()).update(`${purpose}:${payload}`).digest("base64url");
const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

export const normalizeEmail = (email: string) => email.trim().toLowerCase();
export const customerIdFor = (email: string) => `customer-${createHash("sha256").update(normalizeEmail(email)).digest("hex").slice(0, 32)}`;

/** `email.issuedAt.expiresAt.extra.signature`, all signed together. */
function make(purpose: string, email: string, ttlMs: number, extra = "0"): string {
  const iat = Date.now();
  const payload = `${b64(normalizeEmail(email))}.${iat}.${iat + ttlMs}.${extra}`;
  return `${payload}.${sign(purpose, payload)}`;
}
function read(purpose: string, token: string | undefined): { email: string; iat: number; extra: string } | null {
  if (!token || token.length > 1000) return null;
  const parts = token.split(".");
  if (parts.length !== 5) return null;
  const [e, iat, exp, extra, sig] = parts;
  if (!/^\d+$/.test(iat) || !/^\d+$/.test(exp) || Number(exp) < Date.now()) return null;
  try {
    if (!same(sig, sign(purpose, `${e}.${iat}.${exp}.${extra}`))) return null;
    return { email: unb64(e), iat: Number(iat), extra };
  } catch {
    return null;
  }
}

export const makeSignInToken = (email: string) => make("link", email, LINK_MINUTES * 60_000);
/** Valid, unexpired, and not issued before the account's last sign-in (links are single-use). */
export async function readSignInToken(token: string | undefined): Promise<string | null> {
  const t = read("link", token);
  if (!t) return null;
  const doc = await getWriteClient().getDocument<{ lastSignInAt?: string }>(customerIdFor(t.email));
  if (doc?.lastSignInAt && new Date(doc.lastSignInAt).getTime() >= t.iat) return null;
  return t.email;
}

export async function startSession(email: string, version: number) {
  (await cookies()).set(SESSION_COOKIE, make("session", email, SESSION_DAYS * 86_400_000, String(version)), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 86_400,
  });
}

export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

/**
 * The signed-in customer, or null. The session must be signed, unexpired, and carry the account's
 * current session version — "sign out everywhere" bumps it, which ends every other session.
 * A session for a deleted account counts as signed out. Never throws.
 */
export async function getCustomer(): Promise<Customer | null> {
  try {
    const t = read("session", (await cookies()).get(SESSION_COOKIE)?.value);
    if (!t) return null;
    const doc = await getWriteClient().getDocument<Customer & { sessionVersion?: number }>(customerIdFor(t.email));
    if (!doc || String(doc.sessionVersion ?? 0) !== t.extra) return null;
    return doc;
  } catch {
    return null;
  }
}

export async function sessionEmail(): Promise<string | null> {
  return (await getCustomer())?.email ?? null;
}

/**
 * At most one sign-in email a minute and six an hour per address, so the form can't flood anyone's
 * inbox. Kept in a small document per address hash (no email in it), outside the Studio's types.
 */
export async function allowSignInEmail(email: string): Promise<boolean> {
  const client = getWriteClient();
  const id = `ratelimit-signin-${createHash("sha256").update(normalizeEmail(email)).digest("hex").slice(0, 32)}`;
  const doc = await client.getDocument<{ sent?: number[] }>(id);
  const now = Date.now();
  const recent = (doc?.sent ?? []).filter((t) => now - t < 3_600_000);
  if (recent.some((t) => now - t < 60_000) || recent.length >= 6) return false;
  await client.createOrReplace({ _id: id, _type: "rateLimit", sent: [...recent, now] });
  return true;
}

/** Creates the account the first time; later calls only fill in fields that are passed. */
export async function upsertCustomer(email: string, fields: Partial<Omit<Customer, "_id" | "email">> = {}) {
  const client = getWriteClient();
  const id = customerIdFor(email);
  const clean = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined && v !== ""));
  await client.createIfNotExists({ _id: id, _type: "customer", email: normalizeEmail(email), createdAt: new Date().toISOString() });
  if (Object.keys(clean).length) await client.patch(id).set(clean).commit();
  return id;
}

/** Only allow same-site paths as the post-sign-in destination. */
export const safeNext = (next: string | null | undefined) => (next && next.startsWith("/") && !next.startsWith("//") ? next : "/account");
