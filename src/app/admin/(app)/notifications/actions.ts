"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { adminClient } from "@/lib/admin/sanity";
import { requireAdmin } from "@/lib/admin/session";

export async function markRead(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (id.startsWith("notification-")) await adminClient().patch(id).set({ readAt: new Date().toISOString() }).commit();
  revalidatePath("/admin", "layout");
  redirect("/admin/notifications");
}

export async function markAllRead() {
  await requireAdmin();
  const ids = await adminClient().fetch<string[]>(`*[_type == "notification" && !defined(readAt)]._id`);
  if (ids.length) {
    let tx = adminClient().transaction();
    const now = new Date().toISOString();
    for (const id of ids) tx = tx.patch(id, (p) => p.set({ readAt: now }));
    await tx.commit();
  }
  revalidatePath("/admin", "layout");
  redirect("/admin/notifications");
}

export async function clearRead() {
  await requireAdmin();
  const ids = await adminClient().fetch<string[]>(`*[_type == "notification" && defined(readAt)]._id`);
  if (ids.length) {
    let tx = adminClient().transaction();
    for (const id of ids) tx = tx.delete(id);
    await tx.commit();
  }
  revalidatePath("/admin", "layout");
  redirect("/admin/notifications");
}
