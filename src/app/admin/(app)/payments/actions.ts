"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { adminClient } from "@/lib/admin/sanity";
import { requireAdmin } from "@/lib/admin/session";
import { getStripe } from "@/lib/stripe";

/**
 * Full refund of one payment, from the confirmation page. Money moves here, so: the admin check,
 * the id shape, the "sure" tick, and Stripe's own refusal if it was already refunded. The order,
 * if there is one, is marked refunded too.
 */
export async function refundPayment(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!/^pi_[A-Za-z0-9]+$/.test(id)) throw new Error("Invalid payment id");
  if (formData.get("sure") !== "on") redirect(`/admin/payments/${id}?error=${encodeURIComponent("Tick the box to confirm the refund.")}`);
  try {
    await getStripe().refunds.create({ payment_intent: id });
  } catch (err) {
    redirect(`/admin/payments/${id}?error=${encodeURIComponent(err instanceof Error ? err.message : "Stripe refused the refund")}`);
  }
  const orderId = `order-${id}`;
  if (await adminClient().getDocument(orderId)) await adminClient().patch(orderId).set({ status: "refunded" }).commit();
  revalidatePath("/admin/payments");
  revalidatePath("/admin/orders");
  redirect(`/admin/payments/${id}?refunded=1`);
}
