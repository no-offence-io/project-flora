"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { adminClient } from "@/lib/admin/sanity";
import { requireAdmin } from "@/lib/admin/session";

export async function unsubscribeSubscriber(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (/^subscriber-[a-f0-9]{32}$/.test(id)) await adminClient().patch(id).set({ unsubscribedAt: new Date().toISOString() }).commit();
  revalidatePath("/admin/subscribers");
  redirect("/admin/subscribers");
}

export async function resubscribeSubscriber(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (/^subscriber-[a-f0-9]{32}$/.test(id)) await adminClient().patch(id).unset(["unsubscribedAt"]).commit();
  revalidatePath("/admin/subscribers");
  redirect("/admin/subscribers");
}
