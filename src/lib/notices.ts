import "server-only";
import { isComingSoon } from "./gate";
import { createHash } from "node:crypto";
import { getWriteClient, canWrite } from "@/sanity/lib/write";
import { getEmailSettings, notifyAddresses } from "./email-settings";
import type { NotifyScenario } from "./email-shared";
import { notificationDocId } from "@/lib/doc-ids";

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
    const id = notificationDocId(createHash("sha256").update(key).digest("hex").slice(0, 24));
    const now = new Date().toISOString();
    const existing = await client.getDocument(id);
    if (existing && existing.createdAt && Date.now() - new Date(String(existing.createdAt)).getTime() < 24 * 3600 * 1000) {
      await client.patch(id).set({ detail: input.detail ?? "", createdAt: now }).unset(["readAt"]).commit();
      return;
    }
    await client.createOrReplace({ _id: id, _type: "notification", kind: input.kind, title: input.title, detail: input.detail ?? "", source: input.source, href: input.href ?? null, createdAt: now });
    // On Ida's phone, if she installed the dashboard app: orders, and anything that went wrong.
    if (input.source === "orders" || input.kind === "error") {
      const { sendPush } = await import("./push");
      await sendPush({ title: input.title, body: input.detail?.slice(0, 160), url: input.href ?? "/admin/notifications" });
    }
    // By email, to the addresses and for the scenarios chosen under Settings & brand → Emails.
    const scenario = scenarioOf(input);
    const to = scenario && process.env.RESEND_API_KEY ? notifyAddresses(await getEmailSettings(), scenario) : [];
    if (to.length) {
      const { sendMail } = await import("./notify");
      const base = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.prosjectflora.com").replace(/\/$/, "");
      await sendMail({
        to,
        subject: scenario === "problems" ? `Flöra needs attention: ${input.title}` : `Flöra: ${input.title}`,
        html: `<p style="font-family:Helvetica,Arial,sans-serif;font-size:13px;color:#000;">${input.title}</p><p style="font-family:Helvetica,Arial,sans-serif;font-size:13px;color:#555;">${(input.detail ?? "").replace(/</g, "&lt;")}</p><p style="font-family:Helvetica,Arial,sans-serif;font-size:13px;"><a href="${base}/admin/notifications">Open notifications</a></p>`,
      }).catch(() => undefined);
    }
  } catch (err) {
    console.error("[notices] could not record a notification", err, input);
  }
}

/** Which of Ida's email choices a notice falls under; null for the ones she sees in the dashboard only. */
function scenarioOf(n: { kind: NoticeKind; source: string; dedupeKey?: string }): NotifyScenario | null {
  if (n.kind === "error") return "problems";
  if (n.source === "payments") return "payments";
  if (n.source === "orders" && n.dedupeKey?.startsWith("refund:")) return "refunds";
  if (n.source === "newsletter") return "newsletters";
  return null;
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
  if (process.env.VIPPS_MSN && process.env.VERCEL_ENV === "production" && process.env.VIPPS_ENV !== "production") out.push({ kind: "error", title: "Vipps is in test mode on the live site", detail: "The Vipps button refuses to start payments until VIPPS_ENV is production with the live keys.", href: "/admin/setup" });
  if (process.env.VERCEL_ENV === "production" && !process.env.CRON_SECRET) out.push({ kind: "warning", title: "The background check is not running", detail: "Set CRON_SECRET (any long random value) in the hosting settings. Until then a Vipps payment is only recorded when the customer comes back to the site, and old rate-limit counters are not cleared.", href: "/admin/setup" });
  if (process.env.VIPPS_MSN && process.env.VIPPS_ENV === "production" && !process.env.VIPPS_WEBHOOK_SECRET) out.push({ kind: "info", title: "No webhook secret for Vipps", detail: "Orders are recorded when the customer comes back from Vipps, and otherwise within ten minutes by the shop's own check. Registering the webhook (scripts/vipps-webhook.mjs) and setting VIPPS_WEBHOOK_SECRET makes that immediate.", href: "/admin/setup" });
  if (!process.env.RESEND_API_KEY) out.push({ kind: "warning", title: "Email is not connected", detail: "Order confirmations, shipping emails and newsletters are not being sent.", href: "/admin/setup" });
  if (!process.env.SANITY_TOKEN) out.push({ kind: "error", title: "Content token missing", detail: "Orders cannot be recorded and the admin cannot save.", href: "/admin/setup" });
  else if (!(await canWrite()).ok) out.push({ kind: "error", title: "Content token is read-only", detail: "Sanity refuses writes with this token, so paid orders are not recorded and nothing in the dashboard can be saved. Give SANITY_TOKEN a token with Editor rights (sanity.io/manage → API → Tokens) and redeploy.", href: "/admin/setup" });
  if (await isComingSoon()) out.push({ kind: "info", title: "The shop is behind the coming-soon page", detail: "Visitors see the placeholder. Open the shop under Settings → Shop status.", href: "/admin/settings" });

  try {
    const client = getWriteClient();
    const since = new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString();
    const { waiting, low, lowSizes } = await client.fetch<{ waiting: number; low: { _id: string; name?: string; stock?: number; vintage?: boolean }[]; lowSizes: { _id: string; name?: string; sizes?: { label?: string; stock?: number }[] }[] }>(
      `{
        "waiting": count(*[_type == "order" && status == "paid" && orderedAt < $since]),
        "low": *[_type == "product" && visible != false && trackStock != false && sizing != "sizes" && stock <= 1]{ _id, "name": name[_key == "en"][0].value, stock, vintage },
        "lowSizes": *[_type == "product" && visible != false && trackStock != false && sizing == "sizes" && tailored != true && count(sizes[stock <= 1]) > 0]{ _id, "name": name[_key == "en"][0].value, "sizes": sizes[stock <= 1]{ label, stock } }
      }`,
      { since },
    );
    if (waiting > 0) out.push({ kind: "warning", title: `${waiting} paid order${waiting === 1 ? "" : "s"} waiting more than 3 days`, detail: "Still marked as processing. Mark them shipped once they have gone out.", href: "/admin/orders?status=paid" });
    // One line per kind of thing, not per product: a shop with twenty pieces would otherwise bury
    // what matters. A one-of-a-kind piece is always "down to 1", so it is only mentioned once it has sold.
    const named = (rows: { name?: string }[]) => rows.map((p) => p.name ?? "A product").join(", ");
    const one = (rows: { _id: string }[]) => (rows.length === 1 ? `/admin/products/${rows[0]._id}` : "/admin/products");
    const soldOut = low.filter((p) => !p.vintage && (p.stock ?? 0) <= 0);
    const lastOne = low.filter((p) => !p.vintage && p.stock === 1);
    const vintageSold = low.filter((p) => p.vintage && (p.stock ?? 0) <= 0);
    if (soldOut.length) out.push({ kind: "warning", title: soldOut.length === 1 ? `${named(soldOut)} is sold out` : `${soldOut.length} products are sold out`, detail: `${soldOut.length === 1 ? "" : `${named(soldOut)}. `}Add stock, or hide ${soldOut.length === 1 ? "it" : "them"} from the shop.`, href: one(soldOut) });
    if (lastOne.length) out.push({ kind: "info", title: lastOne.length === 1 ? `${named(lastOne)} is down to the last one` : `${lastOne.length} products are down to the last one`, detail: lastOne.length === 1 ? "Add stock if more are coming." : `${named(lastOne)}.`, href: one(lastOne) });
    if (vintageSold.length) out.push({ kind: "info", title: vintageSold.length === 1 ? `${named(vintageSold)} has sold` : `${vintageSold.length} one-of-a-kind pieces have sold`, detail: `${vintageSold.length === 1 ? "" : `${named(vintageSold)}. `}Hide ${vintageSold.length === 1 ? "it" : "them"} when you no longer want ${vintageSold.length === 1 ? "it" : "them"} shown as sold.`, href: one(vintageSold) });
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
