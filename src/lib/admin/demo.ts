import "server-only";
import { createHash } from "node:crypto";
import { adminClient } from "./sanity";
import { orderReference } from "@/lib/money";

/*
 * Test mode for the admin: fills the dashboard with made-up orders, subscribers, notifications and
 * newsletters so every screen can be seen full. Everything it writes carries `demo: true`, and
 * switching it off deletes exactly those documents — nothing real is touched. Demo orders never
 * change stock (weak references, no decrements) and never email anyone (example.com addresses,
 * and the shipping action skips them); demo subscribers are left out of real newsletter sends.
 * Nothing here is visible in the shop: orders, subscribers and newsletters are admin-only.
 */
export async function isDemoOn(): Promise<boolean> {
  try {
    return (await adminClient().fetch<boolean | null>(`*[_id == "siteSettings"][0].demoMode`)) === true;
  } catch {
    return false;
  }
}

const FIRST = ["Ingrid", "Sofie", "Nora", "Emma", "Maja", "Thea", "Ida", "Sara", "Hedda", "Frida", "Astrid", "Live", "Mathilde", "Selma", "Elise", "Johanne", "Tuva", "Aurora", "Signe", "Vilde"];
const LAST = ["Hansen", "Johansen", "Olsen", "Larsen", "Andersen", "Pedersen", "Nilsen", "Kristiansen", "Berg", "Haugen", "Dahl", "Lund", "Solberg", "Bakken", "Strand"];
const PLACES: [string, string, string][] = [
  ["Thorvald Meyers gate 12", "0555", "Oslo"], ["Bryggen 4", "5003", "Bergen"], ["Munkegata 20", "7011", "Trondheim"], ["Kirkegata 8", "4006", "Stavanger"],
  ["Storgata 41", "9008", "Tromsø"], ["Dronningens gate 3", "4610", "Kristiansand"], ["Grünerløkka 7", "0552", "Oslo"], ["Torggata 15", "3110", "Tønsberg"],
];
const NOTES = ["", "", "", "Gift — please no price in the parcel", "Slightly longer sleeves if possible", "", "Leave by the door", ""];

/** Deterministic pseudo-random, so the demo looks the same every time it is switched on. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

export async function seedDemo(): Promise<void> {
  const client = adminClient();
  const products = await client.fetch<{ _id: string; name?: string; priceOre?: number; sizing?: string; sizes?: { label?: string }[] }[]>(
    `*[_type == "product" && !(_id in path("drafts.**"))]{ _id, "name": name[_key == "en"][0].value, priceOre, sizing, "sizes": sizes[]{ label } }`,
  );
  if (!products.length) throw new Error("Add at least one product before turning on test mode");
  const r = rng(20261027);
  const pick = <T,>(arr: T[]) => arr[Math.floor(r() * arr.length)];
  const now = Date.now();
  const docs: Record<string, unknown>[] = [];

  // Orders: 34 over the last 45 days, more recent ones still to be packed.
  for (let i = 0; i < 34; i++) {
    const daysAgo = Math.floor(r() * 45 * (i < 6 ? 0.08 : 1));
    const orderedAt = new Date(now - daysAgo * 86400000 - Math.floor(r() * 86400000)).toISOString();
    const pi = `pi_demo${createHash("sha1").update(String(i)).digest("hex").slice(0, 16)}`;
    const first = pick(FIRST);
    const last = pick(LAST);
    const [street, postcode, city] = pick(PLACES);
    const lineCount = r() < 0.7 ? 1 : 2;
    const items = Array.from({ length: lineCount }, (_, k) => {
      const p = pick(products);
      const qty = r() < 0.85 ? 1 : 2;
      const sized = p.sizing === "sizes" && (p.sizes ?? []).length > 0;
      const measured = !sized && p.sizing !== "none";
      return {
        _key: `line-${k}`,
        _type: "orderItem",
        product: { _type: "reference", _ref: p._id, _weak: true },
        name: p.name ?? "Piece",
        quantity: qty,
        unitPriceOre: p.priceOre ?? 89000,
        ...(sized ? { size: pick(p.sizes!).label } : {}),
        ...(measured
          ? {
              measurements: [
                ["Bust", 80 + Math.floor(r() * 20)],
                ["Waist", 62 + Math.floor(r() * 18)],
                ["Hips", 86 + Math.floor(r() * 20)],
                ["Height", 158 + Math.floor(r() * 20)],
              ].map(([label, value], j) => ({ _key: `m-${j}`, _type: "measurement", label, value: String(value) })),
            }
          : {}),
      };
    });
    const subtotalOre = items.reduce((t, it) => t + it.unitPriceOre * it.quantity, 0);
    const discountOre = r() < 0.15 ? Math.round(subtotalOre * 0.1) : 0;
    const shippingOre = subtotalOre - discountOre >= 150000 ? 0 : 8900;
    const totalOre = subtotalOre - discountOre + shippingOre;
    const status = daysAgo < 3 ? "paid" : daysAgo < 8 ? pick(["paid", "shipped", "shipped"]) : pick(["shipped", "delivered", "delivered", "delivered", "refunded"]);
    docs.push({
      _id: `order-demo-${i}`,
      _type: "order",
      demo: true,
      orderNumber: orderReference(pi),
      status,
      orderedAt,
      language: r() < 0.65 ? "no" : "en",
      confirmationSentAt: orderedAt,
      ...(status !== "paid" ? { trackingNumber: `70701${Math.floor(r() * 1e10)}`.slice(0, 15), shippingEmailSentAt: new Date(new Date(orderedAt).getTime() + 2 * 86400000).toISOString() } : {}),
      customer: {
        name: `${first} ${last}`,
        email: `${first.toLowerCase()}.${last.toLowerCase()}@example.com`,
        phone: `+47 ${900 + Math.floor(r() * 99)} ${10 + Math.floor(r() * 89)} ${100 + Math.floor(r() * 899)}`,
        address: `${street}, ${postcode} ${city}, Norway`,
        note: pick(NOTES),
      },
      items,
      subtotalOre,
      ...(discountOre ? { discountCode: "WELCOME10", discountOre } : {}),
      shippingOre,
      vatIncludedOre: Math.round((totalOre * 0.25) / 1.25),
      totalOre,
      currency: "nok",
      paymentProvider: r() < 0.2 ? "klarna" : "stripe",
      stripePaymentIntentId: pi,
    });
  }

  // Subscribers: 46, a few unsubscribed.
  for (let i = 0; i < 46; i++) {
    const email = `${pick(FIRST).toLowerCase()}${i}@example.com`;
    docs.push({
      _id: `subscriber-${createHash("sha256").update(`demo:${email}`).digest("hex").slice(0, 32)}`,
      _type: "subscriber",
      demo: true,
      email,
      language: r() < 0.6 ? "no" : "en",
      signedUpAt: new Date(now - Math.floor(r() * 60) * 86400000).toISOString(),
      ...(r() < 0.08 ? { unsubscribedAt: new Date(now - Math.floor(r() * 10) * 86400000).toISOString() } : {}),
    });
  }

  // Notifications: what a normal week looks like.
  const notes: [string, string, string, string, number, boolean][] = [
    ["info", "orders", "New order FL-DEMO0001 · 1 290 kr", "Ingrid Hansen · 1 × Miss Flow Top", 0.1, false],
    ["info", "orders", "New order FL-DEMO0002 · 890 kr", "Sofie Berg · 1 × Wrap Skirt", 0.4, false],
    ["warning", "payments", "A payment attempt failed", "nora.olsen@example.com: Your card was declined.", 1.2, false],
    ["info", "newsletter", 'Newsletter "The first collection" sent to 42 subscribers', "", 3, true],
    ["error", "email", "Confirmation email for FL-DEMO0007 failed", "Resend 429: rate limit reached — sent on retry.", 5, true],
  ];
  notes.forEach(([kind, source, title, detail, daysAgo, read], i) =>
    docs.push({
      _id: `notification-demo-${i}`,
      _type: "notification",
      demo: true,
      kind,
      source,
      title,
      detail,
      createdAt: new Date(now - daysAgo * 86400000).toISOString(),
      ...(read ? { readAt: new Date(now - (daysAgo - 0.1) * 86400000).toISOString() } : {}),
    }),
  );

  // Newsletters: one sent, one draft.
  docs.push(
    { _id: "newsletter-demo-sent", _type: "newsletter", demo: true, title: "The first collection", subjectEn: "The first collection – Flöra", subjectNo: "Den første kolleksjonen – Flöra", blocks: "[]", status: "sent", sentAt: new Date(now - 3 * 86400000).toISOString(), sentCount: 42 },
    { _id: "newsletter-demo-draft", _type: "newsletter", demo: true, title: "Autumn notes", subjectEn: "Autumn notes – Flöra", subjectNo: "Høstnotater – Flöra", blocks: "[]", status: "draft" },
  );

  for (let i = 0; i < docs.length; i += 50) {
    let tx = client.transaction();
    for (const d of docs.slice(i, i + 50)) tx = tx.createOrReplace(d as { _id: string; _type: string });
    await tx.commit({ autoGenerateArrayKeys: false });
  }
  await client.createIfNotExists({ _id: "siteSettings", _type: "siteSettings" });
  await client.patch("siteSettings").set({ demoMode: true }).commit();
}

export async function clearDemo(): Promise<number> {
  const client = adminClient();
  const ids = await client.fetch<string[]>(`*[demo == true]._id`);
  for (let i = 0; i < ids.length; i += 100) {
    let tx = client.transaction();
    for (const id of ids.slice(i, i + 100)) tx = tx.delete(id);
    await tx.commit();
  }
  await client.patch("siteSettings").set({ demoMode: false }).commit();
  return ids.length;
}
