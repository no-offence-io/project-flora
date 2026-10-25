import "server-only";
import { createHash } from "node:crypto";
import { getWriteClient } from "@/sanity/lib/write";

/*
 * The owner's notification centre. Anything that goes wrong without a person watching — a failed
 * email, a webhook that could not record an order, a newsletter that half-sent — lands here as a
 * `notification` document, and the admin shows the unread count. `notice()` never throws: a
 * reporting failure must not make the thing it reports about worse. Repeats of the same notice
 * within a day are merged into the existing one rather than piling up.
 */
export type NoticeKind = "error" | "warning" | "info";

export async function notice(input: { kind: NoticeKind; title: string; detail?: string; source: string; href?: string; dedupeKey?: string }): Promise<void> {
  try {
    const client = getWriteClient();
    const key = input.dedupeKey ?? `${input.source}:${input.title}`;
    const id = `notification-${createHash("sha256").update(key).digest("hex").slice(0, 24)}`;
    const now = new Date().toISOString();
    const existing = await client.getDocument(id);
    if (existing && existing.createdAt && Date.now() - new Date(String(existing.createdAt)).getTime() < 24 * 3600 * 1000) {
      await client.patch(id).set({ detail: input.detail ?? "", createdAt: now }).unset(["readAt"]).commit();
      return;
    }
    await client.createOrReplace({ _id: id, _type: "notification", kind: input.kind, title: input.title, detail: input.detail ?? "", source: input.source, href: input.href ?? null, createdAt: now });
    if (input.kind === "error" && process.env.EMAIL_NOTIFY && process.env.RESEND_API_KEY) {
      const { sendMail } = await import("./notify");
      const base = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.prosjectflora.com").replace(/\/$/, "");
      await sendMail({
        to: [process.env.EMAIL_NOTIFY],
        subject: `Flöra needs attention: ${input.title}`,
        html: `<p style="font-family:Helvetica,Arial,sans-serif;font-size:13px;color:#000;">${input.title}</p><p style="font-family:Helvetica,Arial,sans-serif;font-size:13px;color:#555;">${(input.detail ?? "").replace(/</g, "&lt;")}</p><p style="font-family:Helvetica,Arial,sans-serif;font-size:13px;"><a href="${base}/admin/notifications">Open notifications</a></p>`,
      }).catch(() => undefined);
    }
  } catch (err) {
    console.error("[notices] could not record a notification", err, input);
  }
}

export type HealthCheck = { kind: NoticeKind; title: string; detail: string; href?: string };

/**
 * What is wrong right now, computed on each visit rather than stored: configuration that is
 * missing, the shop still hidden, orders waiting too long, pieces about to sell out.
 */
export async function healthChecks(): Promise<HealthCheck[]> {
  const out: HealthCheck[] = [];
  const stripeKey = process.env.STRIPE_SECRET_KEY ?? "";
  const pub = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
  if (!stripeKey) out.push({ kind: "error", title: "Payments are not connected", detail: "STRIPE_SECRET_KEY is missing, so nobody can pay.", href: "/admin/setup" });
  else if ((stripeKey.startsWith("sk_live_") && !pub.startsWith("pk_live_")) || (stripeKey.startsWith("sk_test_") && !pub.startsWith("pk_test_")))
    out.push({ kind: "error", title: "Stripe keys don't match", detail: "The secret and publishable keys are from different modes. Checkout refuses to start until they match.", href: "/admin/setup" });
  else if (stripeKey.startsWith("sk_test_")) out.push({ kind: "info", title: "Payments are in test mode", detail: "Only test cards work. Switch to the live keys before opening the shop.", href: "/admin/setup" });
  if (stripeKey.startsWith("sk_live_") && !process.env.STRIPE_WEBHOOK_SECRET) out.push({ kind: "error", title: "No webhook secret for live payments", detail: "Payments would be taken without orders being recorded. Set STRIPE_WEBHOOK_SECRET.", href: "/admin/setup" });
  if (!process.env.RESEND_API_KEY) out.push({ kind: "warning", title: "Email is not connected", detail: "Order confirmations, shipping emails and newsletters are not being sent.", href: "/admin/setup" });
  if (!process.env.SANITY_TOKEN) out.push({ kind: "error", title: "Content token missing", detail: "Orders cannot be recorded and the admin cannot save.", href: "/admin/setup" });
  if (process.env.COMING_SOON === "true") out.push({ kind: "info", title: "The shop is behind the coming-soon page", detail: "Visitors see the placeholder. Set COMING_SOON to false in Vercel to open.", href: "/admin/setup" });

  try {
    const client = getWriteClient();
    const since = new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString();
    const { waiting, low, lowSizes } = await client.fetch<{ waiting: number; low: { _id: string; name?: string; stock?: number }[]; lowSizes: { _id: string; name?: string; sizes?: { label?: string; stock?: number }[] }[] }>(
      `{
        "waiting": count(*[_type == "order" && status == "paid" && orderedAt < $since]),
        "low": *[_type == "product" && visible != false && sizing != "sizes" && stock <= 1]{ _id, "name": name[_key == "en"][0].value, stock },
        "lowSizes": *[_type == "product" && visible != false && sizing == "sizes" && count(sizes[stock <= 1]) > 0]{ _id, "name": name[_key == "en"][0].value, "sizes": sizes[stock <= 1]{ label, stock } }
      }`,
      { since },
    );
    if (waiting > 0) out.push({ kind: "warning", title: `${waiting} paid order${waiting === 1 ? "" : "s"} waiting more than 3 days`, detail: "They are still marked as paid, not shipped.", href: "/admin/orders" });
    for (const p of low) out.push({ kind: p.stock === 0 ? "warning" : "info", title: `${p.name ?? "A product"} is ${p.stock === 0 ? "sold out" : "down to 1"}`, detail: "Add stock or hide it from the shop.", href: `/admin/products/${p._id}` });
    for (const p of lowSizes) out.push({ kind: "info", title: `${p.name ?? "A product"}: ${(p.sizes ?? []).map((s) => `${s.label} (${s.stock})`).join(", ")} nearly gone`, detail: "Sizes at one or none.", href: `/admin/products/${p._id}` });
  } catch (err) {
    out.push({ kind: "error", title: "Could not read the content database", detail: err instanceof Error ? err.message : String(err) });
  }
  return out;
}

export type StoredNotice = { _id: string; kind: NoticeKind; title: string; detail?: string; source?: string; href?: string; createdAt: string; readAt?: string };

export async function listNotices(limit = 100): Promise<StoredNotice[]> {
  return getWriteClient().fetch<StoredNotice[]>(`*[_type == "notification"] | order(createdAt desc)[0...$limit]{ _id, kind, title, detail, source, href, createdAt, readAt }`, { limit });
}

export async function unreadCount(): Promise<number> {
  try {
    return await getWriteClient().fetch<number>(`count(*[_type == "notification" && !defined(readAt)])`);
  } catch {
    return 0;
  }
}
