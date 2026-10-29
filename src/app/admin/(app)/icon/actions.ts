"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { readImageField } from "@/lib/admin/media";
import { adminClient } from "@/lib/admin/sanity";
import { requireAdmin } from "@/lib/admin/session";
import { CONTENT_TAG } from "@/lib/catalog";
import { parseFaviconStyle } from "@/lib/favicon";

const PLACES = ["tabIcon", "homeIcon", "androidIcon"] as const;
const ALLOWED = ["image/png", "image/jpeg"];

/** The icon page: the colourway of the built-in mark, plus an uploaded picture per place where Ida wants her own. */
export async function saveIcon(formData: FormData) {
  await requireAdmin();
  for (const name of PLACES) {
    const f = formData.get(name);
    if (f instanceof File && f.size > 0 && !ALLOWED.includes(f.type)) redirect(`/admin/icon?error=${encodeURIComponent(`${f.name} is not a PNG or JPG. Nothing was saved.`)}`);
  }
  const uploaded = await Promise.all(PLACES.map((name) => readImageField(formData, name, "image")));
  const set: Record<string, unknown> = { "brand.favicon": parseFaviconStyle(formData.get("favicon")) };
  const unset: string[] = [];
  PLACES.forEach((name, i) => (uploaded[i] ? (set[`brand.${name}`] = uploaded[i]) : unset.push(`brand.${name}`)));

  const client = adminClient();
  await client.createIfNotExists({ _id: "siteSettings", _type: "siteSettings" });
  await client.patch("siteSettings").set(set).unset(unset).commit();
  // The icon routes read the brand through the content tag; the shop's own pages do too. updateTag
  // expires it at once, so the very next request sees the change (revalidateTag would serve stale once).
  updateTag(CONTENT_TAG);
  revalidatePath("/admin/icon");
  redirect("/admin/icon?saved=1");
}
