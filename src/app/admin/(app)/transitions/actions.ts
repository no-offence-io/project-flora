"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { adminClient } from "@/lib/admin/sanity";
import { requireAdmin } from "@/lib/admin/session";
import { CONTENT_TAG } from "@/lib/catalog";
import { parseLoadingStyle } from "@/lib/loading-shared";
import { parseTransition } from "@/lib/page-transition-shared";

export async function saveTransition(formData: FormData) {
  await requireAdmin();
  const pageTransition = parseTransition({
    type: formData.get("type"),
    direction: formData.get("direction"),
    axis: formData.get("axis"),
    middle: formData.get("middle") === "on",
  });
  const client = adminClient();
  await client.createIfNotExists({ _id: "siteSettings", _type: "siteSettings" });
  await client.patch("siteSettings").set({ pageTransition, loadingStyle: parseLoadingStyle(formData.get("loadingStyle")) }).commit();
  updateTag(CONTENT_TAG);
  revalidatePath("/admin/transitions");
  redirect("/admin/transitions?saved=1");
}
