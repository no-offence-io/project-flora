"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { readLocalizedBlocks, readLocalizedString } from "@/lib/admin/localized";
import { adminClient, kronerToOre } from "@/lib/admin/sanity";
import { requireAdmin } from "@/lib/admin/session";

/*
 * Every action starts with requireAdmin(). Server actions are reachable by anyone who can POST to
 * the site, so the page being behind a login proves nothing about the action.
 */

const ORDER_STATUSES = ["paid", "shipped", "delivered", "refunded", "cancelled"] as const;

export async function saveOrder(formData: FormData) {
  await requireAdmin();
  const parsed = z
    .object({
      id: z.string().startsWith("order-"),
      status: z.enum(ORDER_STATUSES),
      trackingNumber: z.string().trim().max(100),
      internalNote: z.string().trim().max(2000),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error("Invalid order update");
  const { id, ...fields } = parsed.data;

  const before = await adminClient().getDocument(id);
  await adminClient().patch(id).set(fields).commit();

  // Shipping notification hook: fires once, on the move to "shipped". Sends nothing until the
  // email provider is configured — see src/lib/notify.ts.
  if (fields.status === "shipped" && before?.status !== "shipped") {
    const { sendShippingNotification } = await import("@/lib/notify");
    await sendShippingNotification({ orderId: id, trackingNumber: fields.trackingNumber });
  }
  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${id}`);
}

const CATEGORIES = ["Tops", "Skirts", "Sets", "Accessories"] as const;

export async function saveProduct(formData: FormData) {
  await requireAdmin();
  const client = adminClient();
  const id = String(formData.get("id") ?? "");
  const name = readLocalizedString(formData, "name");
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "");
  const category = String(formData.get("category") ?? "");
  const priceOre = kronerToOre(formData.get("price"));
  const compareAtPriceOre = kronerToOre(formData.get("compareAtPrice"));
  const stock = Number(formData.get("stock") ?? 0);

  if (!name.some((v) => v._key === "en")) throw new Error("An English name is required");
  if (!slug) throw new Error("A web address is required");
  if (!CATEGORIES.includes(category as (typeof CATEGORIES)[number])) throw new Error("Pick a category");
  if (priceOre === undefined || priceOre < 0) throw new Error("A price is required");
  if (!Number.isInteger(stock) || stock < 0) throw new Error("Stock must be a whole number");
  if (compareAtPriceOre !== undefined && compareAtPriceOre <= priceOre) throw new Error("The previous price should be higher than the current price");

  const fields = {
    name,
    slug: { _type: "slug", current: slug },
    category,
    description: readLocalizedString(formData, "description", "text"),
    priceOre,
    compareAtPriceOre: compareAtPriceOre ?? null,
    stock,
    visible: formData.get("visible") === "on",
  };

  // Photos: keep the ones not ticked for removal, then append any new uploads.
  const removed = new Set(formData.getAll("removeImage").map(String));
  const kept = JSON.parse(String(formData.get("existingImages") ?? "[]")) as { _key: string; asset: { _ref: string } }[];
  const images: { _key: string; _type: "localizedImage"; asset: { _type: "reference"; _ref: string } }[] = kept
    .filter((img) => !removed.has(img._key))
    .map((img) => ({ _key: img._key, _type: "localizedImage", asset: { _type: "reference", _ref: img.asset._ref } }));
  for (const file of formData.getAll("newImages")) {
    if (!(file instanceof File) || file.size === 0) continue;
    if (!file.type.startsWith("image/")) throw new Error(`${file.name} is not an image`);
    if (file.size > 15 * 1024 * 1024) throw new Error(`${file.name} is larger than 15 MB`);
    const asset = await client.assets.upload("image", Buffer.from(await file.arrayBuffer()), { filename: file.name, contentType: file.type });
    images.push({ _key: asset._id.slice(-8), _type: "localizedImage", asset: { _type: "reference", _ref: asset._id } });
  }

  let docId = id;
  if (id) {
    await client.patch(id).set({ ...fields, images }).commit();
  } else {
    const created = await client.create({ _type: "product", ...fields, images });
    docId = created._id;
  }
  revalidatePath("/admin");
  revalidatePath("/admin/products");
  redirect(`/admin/products/${docId}?saved=1`);
}

export async function deleteProduct(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await adminClient().delete(id);
  revalidatePath("/admin/products");
  redirect("/admin/products");
}

export async function saveSettings(formData: FormData) {
  await requireAdmin();
  const shippingOre = kronerToOre(formData.get("shipping"));
  const freeFrom = kronerToOre(formData.get("freeShippingFrom"));
  await adminClient()
    .createIfNotExists({ _id: "siteSettings", _type: "siteSettings" })
    .then(() =>
      adminClient()
        .patch("siteSettings")
        .set({
          siteName: String(formData.get("siteName") ?? "Flöra").trim(),
          announcement: readLocalizedString(formData, "announcement"),
          signUpTitle: readLocalizedString(formData, "signUpTitle"),
          signUpText: readLocalizedString(formData, "signUpText", "text"),
          signUpButton: readLocalizedString(formData, "signUpButton"),
          footerText: readLocalizedString(formData, "footerText", "text"),
          instagram: String(formData.get("instagram") ?? "").trim() || null,
          contactEmail: String(formData.get("contactEmail") ?? "").trim() || null,
          shippingOre: shippingOre ?? 0,
          freeShippingFromOre: freeFrom ?? null,
        })
        .commit(),
    );
  revalidatePath("/admin/settings");
  redirect("/admin/settings?saved=1");
}

export async function saveFrontPage(formData: FormData) {
  await requireAdmin();
  await adminClient().createIfNotExists({ _id: "homePage", _type: "homePage" });
  await adminClient()
    .patch("homePage")
    .set({
      "hero.videoUrl": String(formData.get("videoUrl") ?? "").trim() || null,
      "hero.logoPosition": formData.get("logoPosition") === "center" ? "center" : "left",
      productsTitle: readLocalizedString(formData, "productsTitle"),
      "values.title": readLocalizedString(formData, "valuesTitle"),
      "values.intro": readLocalizedString(formData, "valuesIntro", "text"),
    })
    .commit();
  revalidatePath("/admin/pages/front-page");
  redirect("/admin/pages/front-page?saved=1");
}

export async function saveFaq(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const fields = {
    question: readLocalizedString(formData, "question"),
    answer: readLocalizedBlocks(formData, "answer"),
    order: Number(formData.get("order") ?? 100) || 100,
  };
  if (!fields.question.length) throw new Error("A question is required");
  let docId = id;
  if (id) await adminClient().patch(id).set(fields).commit();
  else docId = (await adminClient().create({ _type: "faqItem", ...fields }))._id;
  revalidatePath("/admin/pages/faq");
  redirect(`/admin/pages/faq/${docId}?saved=1`);
}

export async function deleteFaq(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (id) await adminClient().delete(id);
  revalidatePath("/admin/pages/faq");
  redirect("/admin/pages/faq");
}

const POLICY_PAGES = ["terms", "refunds-and-exchange", "privacy", "shipping"] as const;

export async function savePolicy(formData: FormData) {
  await requireAdmin();
  const page = String(formData.get("page") ?? "");
  if (!POLICY_PAGES.includes(page as (typeof POLICY_PAGES)[number])) throw new Error("Unknown page");
  const id = `policy-${page}`;
  await adminClient().createIfNotExists({ _id: id, _type: "policyPage", page });
  await adminClient()
    .patch(id)
    .set({
      page,
      title: readLocalizedString(formData, "title"),
      intro: readLocalizedString(formData, "intro", "text"),
      body: readLocalizedBlocks(formData, "body"),
    })
    .commit();
  revalidatePath(`/admin/pages/policies/${page}`);
  redirect(`/admin/pages/policies/${page}?saved=1`);
}
