"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { adminClient } from "@/lib/admin/sanity";
import { requireAdmin } from "@/lib/admin/session";
import { CONTENT_TAG } from "@/lib/catalog";
import { parseVintageCard } from "@/lib/vintage-card-shared";

export async function saveVintageCard(formData: FormData) {
  await requireAdmin();
  const vintageCard = parseVintageCard({ variant: formData.get("variant"), sheetBack: formData.get("sheetBack"), depth: formData.get("depth"), markColor: formData.get("markColor") });
  const client = adminClient();
  await client.createIfNotExists({ _id: "siteSettings", _type: "siteSettings" });
  await client.patch("siteSettings").set({ vintageCard }).commit();
  updateTag(CONTENT_TAG);
  revalidatePath("/admin/vintage-card");
  redirect("/admin/vintage-card?saved=1");
}
