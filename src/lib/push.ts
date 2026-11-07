import "server-only";
import { createCipheriv, createECDH, createHash, createPrivateKey, createSign, hkdfSync, randomBytes } from "node:crypto";
import { getWriteClient } from "@/sanity/lib/write";

/*
 * Notifications on Ida's phone, from the installed dashboard app. Standard Web Push, done with
 * Node's own crypto rather than a library: each message is encrypted for the one phone it goes to
 * (RFC 8291, aes128gcm) and signed with the site's VAPID key (RFC 8292), so Apple and Google know
 * it comes from us. Keys: VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY, base64url, server-only.
 * Subscriptions are `pushSubscription` documents; a phone that has gone away is removed.
 */

const b64u = (b: Buffer) => b.toString("base64url");
const fromB64u = (s: string) => Buffer.from(s, "base64url");

export function vapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY || null;
}
export function pushConfigured(): boolean {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

export type PushSubscriptionJSON = { endpoint: string; keys: { p256dh: string; auth: string } };
export type PushMessage = { title: string; body?: string; url?: string };

/** The VAPID signature: a short-lived ES256 token for the push service's own origin. */
export function vapidHeader(endpoint: string): string {
  const pub = fromB64u(process.env.VAPID_PUBLIC_KEY!);
  const key = createPrivateKey({
    key: { kty: "EC", crv: "P-256", d: process.env.VAPID_PRIVATE_KEY!, x: b64u(pub.subarray(1, 33)), y: b64u(pub.subarray(33, 65)) },
    format: "jwk",
  });
  const contact = (process.env.ADMIN_EMAILS ?? "").split(",")[0]?.trim() || "hello@prosjectflora.com";
  const enc = (o: object) => b64u(Buffer.from(JSON.stringify(o)));
  const unsigned = `${enc({ typ: "JWT", alg: "ES256" })}.${enc({ aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: `mailto:${contact}` })}`;
  const sig = createSign("SHA256").update(unsigned).sign({ key, dsaEncoding: "ieee-p1363" });
  return `vapid t=${unsigned}.${b64u(sig)}, k=${process.env.VAPID_PUBLIC_KEY}`;
}

/** Encrypts one payload for one subscription (RFC 8291). */
export function encryptFor(sub: PushSubscriptionJSON, payload: Buffer): Buffer {
  const uaPublic = fromB64u(sub.keys.p256dh);
  const authSecret = fromB64u(sub.keys.auth);
  const ecdh = createECDH("prime256v1");
  const asPublic = ecdh.generateKeys();
  const shared = ecdh.computeSecret(uaPublic);
  const ikm = Buffer.from(hkdfSync("sha256", shared, authSecret, Buffer.concat([Buffer.from("WebPush: info\0"), uaPublic, asPublic]), 32));
  const salt = randomBytes(16);
  const cek = Buffer.from(hkdfSync("sha256", ikm, salt, Buffer.from("Content-Encoding: aes128gcm\0"), 16));
  const nonce = Buffer.from(hkdfSync("sha256", ikm, salt, Buffer.from("Content-Encoding: nonce\0"), 12));
  const cipher = createCipheriv("aes-128-gcm", cek, nonce);
  const body = Buffer.concat([cipher.update(Buffer.concat([payload, Buffer.from([2])])), cipher.final(), cipher.getAuthTag()]);
  const header = Buffer.alloc(21);
  salt.copy(header, 0);
  header.writeUInt32BE(4096, 16);
  header.writeUInt8(asPublic.length, 20);
  return Buffer.concat([header, asPublic, body]);
}

export const subscriptionId = (endpoint: string) => `pushSubscription-${createHash("sha256").update(endpoint).digest("hex").slice(0, 32)}`;

/** Sends to every phone that asked for notifications. Never throws: a notification is a courtesy. */
export async function sendPush(message: PushMessage): Promise<{ sent: number; failed: number }> {
  if (!pushConfigured()) return { sent: 0, failed: 0 };
  let sent = 0;
  let failed = 0;
  try {
    const client = getWriteClient();
    const subs = await client.fetch<{ _id: string; endpoint: string; keys: { p256dh: string; auth: string } }[]>(`*[_type == "pushSubscription"]{ _id, endpoint, keys }`);
    const payload = Buffer.from(JSON.stringify(message));
    await Promise.all(
      subs.map(async (s) => {
        try {
          const res = await fetch(s.endpoint, {
            method: "POST",
            headers: { "Content-Encoding": "aes128gcm", "Content-Type": "application/octet-stream", TTL: "86400", Urgency: "high", Authorization: vapidHeader(s.endpoint) },
            body: new Uint8Array(encryptFor(s, payload)),
          });
          if (res.ok) sent++;
          else {
            failed++;
            // Gone: the app was deleted or notifications turned off. Forget the phone.
            if (res.status === 404 || res.status === 410) await client.delete(s._id);
            else console.error(`[push] ${res.status} from ${new URL(s.endpoint).host}: ${(await res.text()).slice(0, 200)}`);
          }
        } catch (err) {
          failed++;
          console.error("[push] send failed", err);
        }
      }),
    );
  } catch (err) {
    console.error("[push] could not send", err);
  }
  return { sent, failed };
}
