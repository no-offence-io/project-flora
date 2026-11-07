import { createDecipheriv, createECDH, hkdfSync, randomBytes } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/sanity/lib/write", () => ({ getWriteClient: () => ({}) }));

/** What a phone does with a push message (RFC 8291), written independently of the sender. */
function decrypt(body: Buffer, uaPrivate: ReturnType<typeof createECDH>, uaPublic: Buffer, auth: Buffer) {
  const salt = body.subarray(0, 16);
  const rs = body.readUInt32BE(16);
  const idLen = body.readUInt8(20);
  const asPublic = body.subarray(21, 21 + idLen);
  const shared = uaPrivate.computeSecret(asPublic);
  const ikm = Buffer.from(hkdfSync("sha256", shared, auth, Buffer.concat([Buffer.from("WebPush: info\0"), uaPublic, asPublic]), 32));
  const cek = Buffer.from(hkdfSync("sha256", ikm, salt, Buffer.from("Content-Encoding: aes128gcm\0"), 16));
  const nonce = Buffer.from(hkdfSync("sha256", ikm, salt, Buffer.from("Content-Encoding: nonce\0"), 12));
  const data = body.subarray(21 + idLen);
  const decipher = createDecipheriv("aes-128-gcm", cek, nonce);
  decipher.setAuthTag(data.subarray(data.length - 16));
  const plain = Buffer.concat([decipher.update(data.subarray(0, data.length - 16)), decipher.final()]);
  return { rs, plain };
}

describe("web push encryption", () => {
  it("produces a message the phone can open, with the padding delimiter", async () => {
    const { encryptFor } = await import("./push");
    const phone = createECDH("prime256v1");
    const uaPublic = phone.generateKeys();
    const auth = randomBytes(16);
    const message = Buffer.from(JSON.stringify({ title: "New order FL-1234", body: "Miss Flow Top · 1 290 kr", url: "/admin/orders" }));
    const body = encryptFor({ endpoint: "https://web.push.apple.com/x", keys: { p256dh: uaPublic.toString("base64url"), auth: auth.toString("base64url") } }, message);
    const { rs, plain } = decrypt(body, phone, uaPublic, auth);
    expect(rs).toBe(4096);
    expect(plain.at(-1)).toBe(2);
    expect(plain.subarray(0, -1).toString()).toBe(message.toString());
  });
});

describe("VAPID signature", () => {
  it("is an ES256 token for the push service's origin that verifies with the public key", async () => {
    const { generateKeyPairSync, createPublicKey, verify } = await import("node:crypto");
    const jwk = generateKeyPairSync("ec", { namedCurve: "prime256v1" }).privateKey.export({ format: "jwk" });
    process.env.VAPID_PRIVATE_KEY = jwk.d;
    process.env.VAPID_PUBLIC_KEY = Buffer.concat([Buffer.from([4]), Buffer.from(jwk.x!, "base64url"), Buffer.from(jwk.y!, "base64url")]).toString("base64url");
    const { vapidHeader } = await import("./push");
    const header = vapidHeader("https://web.push.apple.com/QWERTY/abc");
    const token = header.match(/^vapid t=([^,]+), k=(.+)$/)![1];
    const [h, p, s] = token.split(".");
    expect(JSON.parse(Buffer.from(p, "base64url").toString()).aud).toBe("https://web.push.apple.com");
    const pub = createPublicKey({ key: { kty: "EC", crv: "P-256", x: jwk.x, y: jwk.y }, format: "jwk" });
    expect(verify("SHA256", Buffer.from(`${h}.${p}`), { key: pub, dsaEncoding: "ieee-p1363" }, Buffer.from(s, "base64url"))).toBe(true);
  });
});
