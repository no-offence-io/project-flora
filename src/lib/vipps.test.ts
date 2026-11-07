import { createHash, createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import { newVippsReference, verifyVippsWebhook } from "./vipps";

const SECRET = "test-secret";
const sign = (rawBody: string, pathAndQuery: string, host: string, date: string, secret = SECRET) => {
  const contentHash = createHash("sha256").update(rawBody).digest("base64");
  const signature = createHmac("sha256", secret).update(`POST\n${pathAndQuery}\n${date};${host};${contentHash}`).digest("base64");
  return { contentHash, authorization: `HMAC-SHA256 SignedHeaders=x-ms-date;host;x-ms-content-sha256&Signature=${signature}` };
};

describe("verifyVippsWebhook", () => {
  const body = JSON.stringify({ msn: "537333", reference: "fl-0123456789abcdef01234567", name: "AUTHORIZED" });
  const path = "/api/webhooks/vipps";
  const host = "www.prosjectflora.com";
  const date = "Fri, 07 Nov 2026 10:00:00 GMT";
  beforeEach(() => {
    process.env.VIPPS_WEBHOOK_SECRET = SECRET;
  });
  afterEach(() => {
    delete process.env.VIPPS_WEBHOOK_SECRET;
  });

  it("accepts a delivery signed with the registration secret", () => {
    const { contentHash, authorization } = sign(body, path, host, date);
    expect(verifyVippsWebhook({ rawBody: body, method: "POST", pathAndQuery: path, host, date, contentHash, authorization })).toBe(true);
  });
  it("refuses a changed body, another secret, another host, or a missing header", () => {
    const { contentHash, authorization } = sign(body, path, host, date);
    expect(verifyVippsWebhook({ rawBody: body + " ", method: "POST", pathAndQuery: path, host, date, contentHash, authorization })).toBe(false);
    expect(verifyVippsWebhook({ rawBody: body, method: "POST", pathAndQuery: path, host: "evil.example", date, contentHash, authorization })).toBe(false);
    const other = sign(body, path, host, date, "other-secret");
    expect(verifyVippsWebhook({ rawBody: body, method: "POST", pathAndQuery: path, host, date, contentHash: other.contentHash, authorization: other.authorization })).toBe(false);
    expect(verifyVippsWebhook({ rawBody: body, method: "POST", pathAndQuery: path, host, date: null, contentHash, authorization })).toBe(false);
  });
  it("refuses everything when no secret is configured", () => {
    delete process.env.VIPPS_WEBHOOK_SECRET;
    const { contentHash, authorization } = sign(body, path, host, date);
    expect(verifyVippsWebhook({ rawBody: body, method: "POST", pathAndQuery: path, host, date, contentHash, authorization })).toBe(false);
  });
});

describe("newVippsReference", () => {
  it("fits Vipps' pattern and yields an order number from its tail", () => {
    const ref = newVippsReference();
    expect(ref).toMatch(/^[a-zA-Z0-9-]{8,64}$/);
    expect(ref).toMatch(/^fl-[a-f0-9]{24}$/);
    expect(new Set(Array.from({ length: 50 }, newVippsReference)).size).toBe(50);
  });
});
