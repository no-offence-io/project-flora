import { NextResponse } from "next/server";
import { VippsError } from "@/lib/vipps";
import { settleVippsPayment, VIPPS_REFERENCE } from "@/lib/vipps-checkout";

/**
 * The order-complete page asks this what became of a Vipps payment. The reference is the random
 * one in the customer's own return address (the same kind of secret as Stripe's client secret in
 * its URL); the answer is a state, an order number and an amount — nothing more. Asking also
 * settles the payment, so a webhook that is slow or lost still ends in an order.
 */
export async function GET(req: Request) {
  const reference = new URL(req.url).searchParams.get("ref") ?? "";
  if (!VIPPS_REFERENCE.test(reference)) return NextResponse.json({ state: "unknown" }, { status: 400 });
  try {
    return NextResponse.json(await settleVippsPayment(reference), { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    // Vipps unreachable or a capture not yet confirmed: keep the customer waiting, don't call it failed.
    console.error("[checkout/vipps/status]", err instanceof VippsError ? `${err.message}: ${err.body}` : err);
    return NextResponse.json({ state: "pending" }, { headers: { "Cache-Control": "no-store" } });
  }
}
