"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { loadNewsletter, renderForLang, sendNewsletterToAll } from "@/lib/admin/newsletter";
import { uploadImage } from "@/lib/admin/media";
import { adminClient } from "@/lib/admin/sanity";
import { requireAdmin } from "@/lib/admin/session";
import { parseBlocks, titleOf } from "@/lib/newsletter-blocks";
import { emailConfigured, sendNewsletter, unsubscribeUrlFor } from "@/lib/notify";

/*
 * Called from the drag-and-drop editor (a client component), so these return results instead of
 * redirecting, and the editor shows them. Every one starts with requireAdmin().
 */
type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const blocksSchema = z.string().max(400_000);

export async function saveNewsletter(input: { id: string | null; subjectEn: string; subjectNo: string; blocksJson: string }): Promise<Result<{ id: string }>> {
  await requireAdmin();
  const blocksJson = blocksSchema.parse(input.blocksJson);
  const blocks = parseBlocks(blocksJson);
  const fields = {
    subjectEn: input.subjectEn.trim().slice(0, 200),
    subjectNo: input.subjectNo.trim().slice(0, 200),
    title: titleOf(blocks) || input.subjectEn.trim().slice(0, 200),
    blocks: JSON.stringify(blocks),
  };
  let id = input.id;
  if (id) {
    const existing = await adminClient().fetch<{ status?: string } | null>(`*[_type == "newsletter" && _id == $id][0]{ status }`, { id });
    if (!existing) return { ok: false, error: "This newsletter no longer exists" };
    if (existing.status === "sent") return { ok: false, error: "This newsletter was sent; duplicate it to edit a copy" };
    await adminClient().patch(id).set(fields).commit();
  } else {
    id = (await adminClient().create({ _type: "newsletter", status: "draft", ...fields }))._id;
  }
  revalidatePath("/admin/newsletters");
  return { ok: true, id };
}

/** The mail as HTML for the preview pane — rendered by the same code that sends. */
export async function previewNewsletter(input: { blocksJson: string; lang: "en" | "no" }): Promise<Result<{ html: string }>> {
  await requireAdmin();
  try {
    const html = await renderForLang(parseBlocks(blocksSchema.parse(input.blocksJson)), input.lang, "#");
    return { ok: true, html };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not render" };
  }
}

export async function sendNewsletterTest(input: { id: string; lang: "en" | "no" }): Promise<Result<{ email: string }>> {
  const admin = await requireAdmin();
  if (!emailConfigured()) return { ok: false, error: "Email isn't connected — see Setup." };
  const doc = await loadNewsletter(input.id);
  if (!doc) return { ok: false, error: "Save the newsletter first" };
  const blocks = parseBlocks(doc.blocks);
  if (!blocks.length) return { ok: false, error: "The newsletter is empty" };
  const subject = (input.lang === "no" ? doc.subjectNo || doc.subjectEn : doc.subjectEn) || "";
  if (!subject) return { ok: false, error: "Write a subject line first" };
  try {
    const html = await renderForLang(blocks, input.lang, unsubscribeUrlFor("subscriber-00000000000000000000000000000000"));
    await sendNewsletter({ email: admin.email, subject }, html);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Sending failed" };
  }
  await adminClient().patch(input.id).set({ testSentAt: new Date().toISOString() }).commit();
  return { ok: true, email: admin.email };
}

export async function sendNewsletterAll(input: { id: string }): Promise<Result<{ count: number }>> {
  await requireAdmin();
  if (!emailConfigured()) return { ok: false, error: "Email isn't connected — see Setup." };
  const doc = await loadNewsletter(input.id);
  if (!doc) return { ok: false, error: "Save the newsletter first" };
  if (doc.status === "sent") return { ok: false, error: "This newsletter was already sent. Duplicate it to send again." };
  let count = 0;
  try {
    count = await sendNewsletterToAll(doc);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Sending failed" };
  }
  await adminClient().patch(input.id).set({ status: "sent", sentAt: new Date().toISOString(), sentCount: count }).commit();
  revalidatePath("/admin/newsletters");
  return { ok: true, count };
}

export async function deleteNewsletter(input: { id: string }): Promise<Result> {
  await requireAdmin();
  await adminClient().delete(input.id);
  revalidatePath("/admin/newsletters");
  return { ok: true };
}

export async function duplicateNewsletter(input: { id: string }): Promise<Result<{ id: string }>> {
  await requireAdmin();
  const doc = await loadNewsletter(input.id);
  if (!doc) return { ok: false, error: "Newsletter not found" };
  const created = await adminClient().create({ _type: "newsletter", status: "draft", title: `${doc.title ?? ""} (copy)`, subjectEn: doc.subjectEn ?? "", subjectNo: doc.subjectNo ?? "", blocks: doc.blocks ?? "[]" });
  revalidatePath("/admin/newsletters");
  return { ok: true, id: created._id };
}

/** The photo picker: everything in the media library, newest first. */
export async function listImages(): Promise<{ url: string; name: string }[]> {
  await requireAdmin();
  return adminClient().fetch<{ url: string; name: string }[]>(`*[_type == "sanity.imageAsset"] | order(_createdAt desc)[0...200]{ url, "name": coalesce(originalFilename, _id) }`);
}

export async function uploadPickerImage(formData: FormData): Promise<Result<{ url: string }>> {
  await requireAdmin();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Choose a file" };
  try {
    const id = await uploadImage(file);
    const url = await adminClient().fetch<string>(`*[_id == $id][0].url`, { id });
    return { ok: true, url };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Upload failed" };
  }
}
