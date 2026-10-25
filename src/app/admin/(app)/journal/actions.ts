"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { readLocalizedBlocks, readLocalizedString } from "@/lib/admin/localized";
import { readImageField } from "@/lib/admin/media";
import { adminClient } from "@/lib/admin/sanity";
import { requireAdmin } from "@/lib/admin/session";

export async function savePost(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "");
  const title = readLocalizedString(formData, "title");
  if (!title.some((v) => v._key === "en" && v.value)) throw new Error("An English title is required");
  if (!slug) throw new Error("A web address is required");
  const taken = await adminClient().fetch<string | null>(`*[_type == "post" && slug.current == $slug && _id != $id][0]._id`, { slug, id });
  if (taken) throw new Error(`The address "${slug}" is already used by another post`);
  const fields = {
    title,
    slug: { _type: "slug", current: slug },
    date: String(formData.get("date") ?? "").trim() || null,
    intro: readLocalizedString(formData, "intro", "text"),
    body: readLocalizedBlocks(formData, "body"),
    image: await readImageField(formData, "image"),
    published: formData.get("published") === "on",
  };
  let docId = id;
  if (id) await adminClient().patch(id).set(fields).commit();
  else docId = (await adminClient().create({ _type: "post", ...fields }))._id;
  revalidatePath("/admin/journal");
  redirect(`/admin/journal/${docId}?saved=1`);
}

export async function deletePost(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (id) await adminClient().delete(id);
  revalidatePath("/admin/journal");
  redirect("/admin/journal");
}
