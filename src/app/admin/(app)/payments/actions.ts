"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { adminClient } from "@/lib/admin/sanity";
import { requireAdmin } from "@/lib/admin/session";
import { getStripe } from "@/lib/stripe";
import { orderDocId } from "@/lib/doc-ids";
import { removeImported, runImport } from "@/lib/admin/stripe-import";

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
  const orderId = orderDocId(id);
  if (await adminClient().getDocument(orderId)) await adminClient().patch(orderId).set({ status: "refunded" }).commit();
  revalidatePath("/admin/payments");
  revalidatePath("/admin/orders");
  redirect(`/admin/payments/${id}?refunded=1`);
}

/** Brings earlier sales in from Stripe, a bounded stretch per press (see lib/admin/stripe-import.ts). Reads Stripe, changes nothing there. */
export async function importStripeHistory() {
  await requireAdmin();
  let query: string;
  try {
    const run = await runImport();
    const left = Object.values(run.skipped).reduce((a, b) => a + (b ?? 0), 0);
    query = `imported=${run.added}&seen=${run.seen}&left=${left}&more=${run.done ? 0 : 1}`;
  } catch (err) {
    console.error("[stripe-import]", err);
    query = `error=${encodeURIComponent(err instanceof Error ? err.message.slice(0, 200) : "The import could not run")}`;
  }
  revalidatePath("/admin", "layout");
  redirect(`/admin/payments?${query}#earlier`);
}

/** Takes the imported sales out again. Needs the tick: reports and customer lists change with it. */
export async function removeStripeHistory(formData: FormData) {
  await requireAdmin();
  if (formData.get("sure") !== "on") redirect(`/admin/payments?error=${encodeURIComponent("Tick the box to remove the imported sales.")}#earlier`);
  const removed = await removeImported();
  revalidatePath("/admin", "layout");
  redirect(`/admin/payments?removed=${removed}#earlier`);
}
