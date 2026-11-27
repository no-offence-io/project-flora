import { NextResponse } from "next/server";
import { checkoutMetadata } from "@/lib/checkout-metadata";
import { customerSchema, intentRequestSchema } from "@/lib/checkout-schema";
import { getCustomer } from "@/lib/customer";
import { getLanguage } from "@/lib/language";
import { notice } from "@/lib/notices";
import { quoteCart } from "@/lib/orders";
import { createVippsPayment, newVippsReference, vippsConfigured, vippsEnv, VippsError } from "@/lib/vipps";
import { vippsDocId } from "@/lib/vipps-checkout";
import { holdDiscount, USED_UP } from "@/lib/discounts";
import { allow, overLimit } from "@/lib/rate-limit";
import { getWriteClient } from "@/sanity/lib/write";

/** Same as the card request, but the customer is required: Vipps is the last click, not a quote. */
const vippsRequestSchema = intentRequestSchema.omit({ paymentIntentId: true }).extend({ customer: customerSchema });

const SITE = () => (process.env.NEXT_PUBLIC_SITE_URL || "https://www.prosjectflora.com").replace(/\/$/, "");

/**
 * Where Vipps sends the customer back. Their origin when it is one of ours over https (the site,
 * its www form, or this very deployment's own Vercel address), so the cart in that origin's storage
 * is the one that gets cleared; the configured site otherwise. Never any other host, or a payer
 * could be sent to someone else's page after a real payment. Vipps only accepts https here.
 */
function returnOrigin(req: Request): string {
  const site = new URL(SITE());
  const candidate = req.headers.get("origin") ?? new URL(req.url).origin;
  try {
    const u = new URL(candidate);
    const bare = (h: string) => h.replace(/^www\./, "");
    const ours = [site.hostname, process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL].filter((h): h is string => Boolean(h)).map(bare);
    if (u.protocol === "https:" && ours.includes(bare(u.hostname))) return u.origin;
  } catch {
    /* fall through */
  }
  return site.origin;
}

/**
 * Starts a Vipps payment for the cart: quotes it server-side exactly as the card flow does, keeps
 * the quote and the customer in a `vippsPayment` document, asks Vipps for a payment of that amount
 * and hands back the address to send the customer to. Nothing is an order yet — that happens in
 * settleVippsPayment once Vipps says the money is reserved.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = vippsRequestSchema.safeParse(body);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
    console.warn("[checkout/vipps] rejected:", issues);
    return NextResponse.json({ error: "Invalid request", issues }, { status: 400 });
  }
  if (!vippsConfigured()) return NextResponse.json({ error: "Vipps is not connected", code: "vipps" }, { status: 503 });
  // The live site must never start test payments: a "paid" test order is money that never arrived.
  if (process.env.VERCEL_ENV === "production" && vippsEnv() !== "production") return NextResponse.json({ error: "Vipps is in test mode on this server", code: "vipps" }, { status: 503 });

  // Every start writes a document and calls Vipps, so one visitor gets only so many an hour.
  if (!(await allow("vipps", req.headers))) return NextResponse.json({ error: "Too many payments started from here. Please try again in a little while.", code: "vipps" }, { status: 429 });

  const { items, customer, discountCode, visit } = parsed.data;
  const country = customer.country;
  // A visitor shut out for guessing at codes (see the card route) gets no code looked at here either.
  if (discountCode && (await overLimit("discount", req.headers))) return NextResponse.json({ error: "Too many codes tried from here. Please try again in an hour." }, { status: 429 });
  const quote = await quoteCart(items, { country, discountCode });
  if ("error" in quote) return NextResponse.json({ error: quote.error }, { status: 400 });
  const amountOre = quote.totals.totalOre;
  if (amountOre < 100) return NextResponse.json({ error: "Vipps payments start at 1 kr", code: "vipps" }, { status: 400 });

  const reference = newVippsReference();
  // A code with a limited number of uses: this payment holds one, or stops here. Vipps is the last
  // click, so going on at the full price without saying so is not an option.
  if (quote.discount?.limited) {
    if (await holdDiscount(quote.discount.docId, reference)) quote.discount.holdKey = reference;
    else return NextResponse.json({ error: USED_UP }, { status: 409 });
  }
  const account = await getCustomer();
  const metadata = checkoutMetadata({ quote, lang: await getLanguage(), country, customer, visit, userAgent: req.headers.get("user-agent"), account });
  const client = getWriteClient();
  await client.create({
    _id: vippsDocId(reference),
    _type: "vippsPayment",
    reference,
    status: "created",
    amountOre,
    email: customer.email,
    metadata: JSON.stringify(metadata),
    environment: vippsEnv(),
    createdAt: new Date().toISOString(),
  });

  const phone = `${customer.phonePrefix}${customer.phone}`.replace(/\D/g, "");
  try {
    const { redirectUrl } = await createVippsPayment({
      reference,
      amountOre,
      returnUrl: `${returnOrigin(req)}/order-complete?vipps=${reference}`,
      description: `Flöra · ${quote.lines.map((l) => `${l.quantity} × ${l.name}`).join(", ")}`,
      ...(/^\d{8,15}$/.test(phone) ? { phone } : {}),
    });
    return NextResponse.json({ redirectUrl, reference });
  } catch (err) {
    const detail = err instanceof VippsError ? `${err.message}: ${err.body}` : err instanceof Error ? err.message : String(err);
    console.error("[checkout/vipps]", detail);
    await client.patch(vippsDocId(reference)).set({ status: "failed", error: detail.slice(0, 500) }).commit();
    await notice({ kind: "error", source: "payments", title: "Vipps could not start a payment", detail, href: "/admin/setup", dedupeKey: `vipps-start:${new Date().toISOString().slice(0, 13)}` });
    return NextResponse.json({ error: "Could not start the Vipps payment", code: "vipps" }, { status: 502 });
  }
}

