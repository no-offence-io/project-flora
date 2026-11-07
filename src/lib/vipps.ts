import "server-only";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/*
 * Vipps MobilePay ePayment, spoken directly (Vipps isn't on the Stripe account). Everything here
 * is a thin, typed layer over their HTTP API: tokens, create / get / capture / refund, the signed
 * webhook check, and the test-only force-approve. Keys come from the environment:
 *
 *   VIPPS_ENV               "test" (apitest.vipps.no, test MSN, test users) or "production"
 *   VIPPS_MSN               the sales unit's merchant serial number
 *   VIPPS_CLIENT_ID, VIPPS_CLIENT_SECRET, VIPPS_SUBSCRIPTION_KEY   from the portal's API keys page
 *   VIPPS_WEBHOOK_SECRET    returned once when the webhook is registered (scripts/vipps-webhook.ts)
 *
 * Amounts are integers in øre, as everywhere else in this codebase.
 */

export const vippsConfigured = () => Boolean(process.env.VIPPS_MSN && process.env.VIPPS_CLIENT_ID && process.env.VIPPS_CLIENT_SECRET && process.env.VIPPS_SUBSCRIPTION_KEY);
export const vippsEnv = (): "test" | "production" => (process.env.VIPPS_ENV === "production" ? "production" : "test");
const base = () => (vippsEnv() === "production" ? "https://api.vipps.no" : "https://apitest.vipps.no");

export class VippsError extends Error {
  constructor(message: string, public readonly status: number, public readonly body: string) {
    super(message);
  }
}

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new VippsError(`${name} is not set`, 0, "");
  return v;
}

/* --- Access token: good for an hour in test, a day in production; kept until shortly before it expires. --- */
let cached: { token: string; expiresAt: number } | null = null;
async function accessToken(): Promise<string> {
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;
  const res = await fetch(`${base()}/accesstoken/get`, {
    method: "POST",
    headers: { client_id: env("VIPPS_CLIENT_ID"), client_secret: env("VIPPS_CLIENT_SECRET"), "Ocp-Apim-Subscription-Key": env("VIPPS_SUBSCRIPTION_KEY"), "Merchant-Serial-Number": env("VIPPS_MSN"), "Content-Length": "0" },
    cache: "no-store",
  });
  const text = await res.text();
  if (!res.ok) throw new VippsError(`Vipps refused the keys (${res.status})`, res.status, text.slice(0, 300));
  const data = JSON.parse(text) as { access_token: string; expires_on: string };
  cached = { token: data.access_token, expiresAt: Number(data.expires_on) * 1000 };
  return cached.token;
}

async function call<T>(method: "GET" | "POST", path: string, body?: unknown, idempotencyKey?: string): Promise<T> {
  const res = await fetch(`${base()}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${await accessToken()}`,
      "Ocp-Apim-Subscription-Key": env("VIPPS_SUBSCRIPTION_KEY"),
      "Merchant-Serial-Number": env("VIPPS_MSN"),
      "Content-Type": "application/json",
      "Vipps-System-Name": "flora-shop",
      "Vipps-System-Version": "1.0",
      "Vipps-System-Plugin-Name": "flora-nextjs",
      "Vipps-System-Plugin-Version": "1.0",
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const text = await res.text();
  if (!res.ok) throw new VippsError(`Vipps ${method} ${path} failed (${res.status})`, res.status, text.slice(0, 500));
  return (text ? JSON.parse(text) : {}) as T;
}

/* --- Payments --- */
export type VippsState = "CREATED" | "AUTHORIZED" | "ABORTED" | "EXPIRED" | "TERMINATED";
export type VippsAmount = { currency: string; value: number };
export type VippsPayment = {
  reference: string;
  state: VippsState;
  amount: VippsAmount;
  aggregate: { authorizedAmount: VippsAmount; capturedAmount: VippsAmount; refundedAmount: VippsAmount; cancelledAmount: VippsAmount };
  pspReference?: string;
  captureGuaranteedUntil?: string;
};

/** A reference Vipps accepts (letters, digits, hyphens; 8–64 chars) that also yields an order number from its last 8 characters. */
export function newVippsReference(): string {
  return `fl-${randomBytes(12).toString("hex")}`;
}

export async function createVippsPayment(input: { reference: string; amountOre: number; returnUrl: string; description: string; phone?: string }): Promise<{ redirectUrl: string; reference: string }> {
  const body = {
    amount: { currency: "NOK", value: input.amountOre },
    paymentMethod: { type: "WALLET" },
    reference: input.reference,
    userFlow: "WEB_REDIRECT",
    returnUrl: input.returnUrl,
    paymentDescription: input.description.slice(0, 100),
    ...(input.phone ? { customer: { phoneNumber: input.phone } } : {}),
  };
  const r = await call<{ redirectUrl: string; reference?: string }>("POST", "/epayment/v1/payments", body, input.reference);
  return { redirectUrl: r.redirectUrl, reference: r.reference ?? input.reference };
}

export const getVippsPayment = (reference: string) => call<VippsPayment>("GET", `/epayment/v1/payments/${encodeURIComponent(reference)}`);

/** Takes the reserved money. The aggregate is what proves it; the status code alone doesn't. */
export async function captureVippsPayment(reference: string, amountOre: number): Promise<VippsPayment["aggregate"]> {
  const r = await call<{ aggregate: VippsPayment["aggregate"] }>("POST", `/epayment/v1/payments/${encodeURIComponent(reference)}/capture`, { modificationAmount: { currency: "NOK", value: amountOre } }, `capture-${reference}`);
  return r.aggregate;
}

export async function refundVippsPayment(reference: string, amountOre: number, idempotencyKey: string): Promise<VippsPayment["aggregate"]> {
  const r = await call<{ aggregate: VippsPayment["aggregate"] }>("POST", `/epayment/v1/payments/${encodeURIComponent(reference)}/refund`, { modificationAmount: { currency: "NOK", value: amountOre } }, idempotencyKey);
  return r.aggregate;
}

/** Test environment only: approves a payment as the test user would in the app. Vipps rejects it in production. */
export async function forceApproveVippsPayment(reference: string, phone: string, token?: string): Promise<void> {
  if (vippsEnv() === "production") throw new VippsError("force-approve is for the test environment only", 0, "");
  await call("POST", `/epayment/v1/test/payments/${encodeURIComponent(reference)}/approve`, { customer: { phoneNumber: phone }, ...(token ? { token } : {}) });
}

/* --- Webhooks --- */
export const VIPPS_EVENTS = ["epayments.payment.authorized.v1", "epayments.payment.aborted.v1", "epayments.payment.expired.v1", "epayments.payment.terminated.v1", "epayments.payment.cancelled.v1", "epayments.payment.captured.v1", "epayments.payment.refunded.v1"];

export async function registerVippsWebhook(url: string): Promise<{ id: string; secret: string }> {
  return call<{ id: string; secret: string }>("POST", "/webhooks/v1/webhooks", { url, events: VIPPS_EVENTS });
}
export const listVippsWebhooks = () => call<{ webhooks: { id: string; url: string; events: string[] }[] }>("GET", "/webhooks/v1/webhooks");

export type VippsWebhookEvent = { msn: string; reference: string; pspReference?: string; name: "CREATED" | "AUTHORIZED" | "CAPTURED" | "CANCELLED" | "REFUNDED" | "ABORTED" | "EXPIRED" | "TERMINATED"; amount: VippsAmount; timestamp: string; success: boolean };

/**
 * Checks a delivery really comes from Vipps: the body hash and an HMAC over
 * "POST\n<path+query>\n<x-ms-date>;<host>;<x-ms-content-sha256>" with the registration's secret.
 */
export function verifyVippsWebhook(input: { rawBody: string; method: string; pathAndQuery: string; host: string; date: string | null; contentHash: string | null; authorization: string | null }): boolean {
  const secret = process.env.VIPPS_WEBHOOK_SECRET;
  if (!secret || !input.date || !input.contentHash || !input.authorization) return false;
  const expectedHash = createHash("sha256").update(input.rawBody).digest("base64");
  if (!safeEqual(expectedHash, input.contentHash)) return false;
  const stringToSign = `${input.method.toUpperCase()}\n${input.pathAndQuery}\n${input.date};${input.host};${input.contentHash}`;
  const signature = createHmac("sha256", secret).update(stringToSign).digest("base64");
  const expected = `HMAC-SHA256 SignedHeaders=x-ms-date;host;x-ms-content-sha256&Signature=${signature}`;
  return safeEqual(expected, input.authorization);
}

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
