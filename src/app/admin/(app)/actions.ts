"use server";

import { revalidatePath } from "next/cache";
import { forgetComingSoon } from "@/lib/gate";
import { redirect } from "next/navigation";
import { z } from "zod";
import { readLocalizedBlocks, readLocalizedString } from "@/lib/admin/localized";
import { adminClient, kronerToOre } from "@/lib/admin/sanity";
import { requireAdmin } from "@/lib/admin/session";
import { readImageField, readVideoField, uploadImage, uploadVideo } from "@/lib/admin/media";
import { FONT_CHOICES } from "@/lib/brand-shared";
import { ORDER_STATUSES } from "@/lib/order-status";
import { siteDomain } from "@/lib/email-settings";
import { isEmail, SCENARIO_KEYS, type NotifyScenario } from "@/lib/email-shared";

/*
 * Every action starts with requireAdmin(). Server actions are reachable by anyone who can POST to
 * the site, so the page being behind a login proves nothing about the action.
 */


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

  await adminClient().patch(id).set(fields).commit();
  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${id}`);
  redirect(`/admin/orders/${id}?saved=1`);
}

/**
 * The "Send" button on an order: saves the tracking number, marks the order shipped and emails the
 * customer. Can be pressed again (a corrected number, a lost email); each send is stamped.
 */
export async function sendShippingEmail(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id.startsWith("order-")) throw new Error("Invalid order");
  const trackingNumber = String(formData.get("trackingNumber") ?? "").trim().slice(0, 100);
  const order = await adminClient().fetch<{ orderNumber?: string; language?: string; demo?: boolean; customer?: { email?: string } } | null>(`*[_id == $id][0]{ orderNumber, language, demo, customer }`, { id });
  if (!order) throw new Error("Order not found");
  if (order.demo) {
    // Test-mode order: behave as if sent, without emailing a made-up address.
    await adminClient().patch(id).set({ trackingNumber, status: "shipped", shippingEmailSentAt: new Date().toISOString() }).commit();
    revalidatePath(`/admin/orders/${id}`);
    redirect(`/admin/orders/${id}?sent=1`);
  }

  const { emailConfigured, sendShippingNotification, trackingUrlFor } = await import("@/lib/notify");
  if (!emailConfigured()) redirect(`/admin/orders/${id}?error=${encodeURIComponent("Email isn't connected yet — see Setup.")}`);
  if (!order.customer?.email) redirect(`/admin/orders/${id}?error=${encodeURIComponent("This order has no customer email.")}`);

  await adminClient().patch(id).set({ trackingNumber, status: "shipped" }).commit();
  try {
    await sendShippingNotification({
      orderNumber: order.orderNumber ?? id,
      email: order.customer.email,
      language: order.language === "no" ? "no" : "en",
      trackingNumber,
      trackingUrl: trackingUrlFor(trackingNumber),
    });
  } catch (err) {
    console.error("[admin] shipping email failed", err);
    const { notice } = await import("@/lib/notices");
    await notice({ kind: "error", source: "email", title: `Shipping email for ${order.orderNumber ?? id} failed`, detail: err instanceof Error ? err.message : String(err), href: `/admin/orders/${id}` });
    redirect(`/admin/orders/${id}?error=${encodeURIComponent("The email could not be sent. The order is marked shipped; try again in a moment.")}`);
  }
  await adminClient().patch(id).set({ shippingEmailSentAt: new Date().toISOString() }).commit();
  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${id}`);
  redirect(`/admin/orders/${id}?sent=1`);
}

const CATEGORIES = ["Tops", "Skirts", "Pants", "Sets", "Accessories"] as const;

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
  const sizingRaw = String(formData.get("sizing") ?? "measurements");
  const sizing = sizingRaw === "sizes" || sizingRaw === "none" ? sizingRaw : "measurements";

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
    sizing,
    vintage: formData.get("vintage") === "on",
    vintageLayout: formData.get("vintageLayout") === "plain" ? "plain" : "card",
    visible: formData.get("visible") === "on",
  };

  // Sizes: numbered slots like the colours below; a blank label drops the slot.
  const sizes = [];
  for (let i = 0; i < (Number(formData.get("sizeCount")) || 0); i++) {
    if (formData.get(`sizeRemove_${i}`) === "on") continue;
    const label = String(formData.get(`sizeLabel_${i}`) ?? "").trim();
    if (!label) continue;
    if (!/^[A-Za-z0-9 ./-]{1,20}$/.test(label)) throw new Error(`Size "${label}" may only use letters, numbers, space, . / -`);
    const sizeStock = Number(formData.get(`sizeStock_${i}`) ?? 0);
    if (!Number.isInteger(sizeStock) || sizeStock < 0) throw new Error(`Stock for size ${label} must be a whole number`);
    sizes.push({ _key: String(formData.get(`sizeKey_${i}`) ?? "") || `z${Date.now().toString(36)}${i}`, _type: "size", label, stock: sizeStock });
  }
  if (sizing === "sizes" && sizes.length === 0) throw new Error("Add at least one size, or choose another way of sizing");

  // Photos: keep the ones not ticked for removal, then append any new uploads.
  const removed = new Set(formData.getAll("removeImage").map(String));
  const kept = JSON.parse(String(formData.get("existingImages") ?? "[]")) as { _key: string; asset: { _ref: string } }[];
  const images: { _key: string; _type: "localizedImage"; asset: { _type: "reference"; _ref: string } }[] = kept
    .filter((img) => !removed.has(img._key))
    .map((img) => ({ _key: img._key, _type: "localizedImage", asset: { _type: "reference", _ref: img.asset._ref } }));
  for (const file of formData.getAll("newImages")) {
    if (!(file instanceof File) || file.size === 0) continue;
    const assetId = await uploadImage(file);
    images.push({ _key: assetId.slice(-8), _type: "localizedImage", asset: { _type: "reference", _ref: assetId } });
  }

  // Colours and detail rows come as numbered slots (see ProductForm); empty or ticked-off slots are dropped.
  const colors = [];
  for (let i = 0; i < (Number(formData.get("colorCount")) || 0); i++) {
    if (formData.get(`colorRemove_${i}`) === "on") continue;
    const name = readLocalizedString(formData, `colorName_${i}`);
    const hex = String(formData.get(`colorHex_${i}`) ?? "").trim().toLowerCase();
    if (!name.some((v) => v._key === "en" && v.value)) continue;
    if (!/^#([0-9a-f]{3}){1,2}$/.test(hex)) throw new Error(`Colour ${i + 1} needs a hex code like #6b7280`);
    colors.push({
      _key: String(formData.get(`colorKey_${i}`) ?? "") || `c${Date.now().toString(36)}${i}`,
      _type: "color",
      name,
      hex,
      image: await readImageField(formData, `colorImage_${i}`),
    });
  }
  const specs = [];
  for (let i = 0; i < (Number(formData.get("specCount")) || 0); i++) {
    if (formData.get(`specRemove_${i}`) === "on") continue;
    const label = readLocalizedString(formData, `specLabel_${i}`);
    if (!label.some((v) => v._key === "en" && v.value)) continue;
    specs.push({
      _key: String(formData.get(`specKey_${i}`) ?? "") || `s${Date.now().toString(36)}${i}`,
      _type: "spec",
      label,
      value: readLocalizedString(formData, `specValue_${i}`),
      emphasis: formData.get(`specEmphasis_${i}`) === "on",
      expandable: formData.get(`specExpandable_${i}`) === "on",
      hideOnMobile: formData.get(`specHideOnMobile_${i}`) === "on",
    });
  }

  let docId = id;
  if (id) {
    await client.patch(id).set({ ...fields, images, colors, specs, sizes }).commit();
  } else {
    const created = await client.create({ _type: "product", ...fields, images, colors, specs, sizes });
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
  const gaMeasurementId = String(formData.get("gaMeasurementId") ?? "").trim().toUpperCase() || null;
  if (gaMeasurementId && !/^G-[A-Z0-9]{4,16}$/.test(gaMeasurementId)) redirect("/admin/settings?error=" + encodeURIComponent("The Google Analytics ID should look like G-AB12CD34EF. Nothing was saved."));
  const gaPropertyId = String(formData.get("gaPropertyId") ?? "").replace(/\s/g, "") || null;
  if (gaPropertyId && !/^\d{6,12}$/.test(gaPropertyId)) redirect("/admin/settings?error=" + encodeURIComponent("The Analytics property ID is digits only, e.g. 561377221. Nothing was saved."));
  const shippingOre = kronerToOre(formData.get("shipping"));
  const freeFrom = kronerToOre(formData.get("freeShippingFrom"));
  const [signUpImage, footerImage] = await Promise.all([readImageField(formData, "signUpImage"), readImageField(formData, "footerImage")]);

  // Emails: the sender must be at the verified domain, or Resend refuses every mail the shop sends.
  const field = (k: string) => String(formData.get(k) ?? "").trim();
  const fail = (msg: string) => redirect("/admin/settings?error=" + encodeURIComponent(msg));
  const fromAddress = field("fromAddress").toLowerCase();
  if (fromAddress && (!isEmail(fromAddress) || !fromAddress.endsWith(`@${siteDomain()}`))) fail(`The sender address has to end with @${siteDomain()}, the domain verified for sending. Nothing was saved.`);
  const replyTo = field("replyTo").toLowerCase();
  if (replyTo && !isEmail(replyTo)) fail("The reply-to address doesn't look like an email address. Nothing was saved.");
  const notifyTo = field("notifyTo").split(/[,\s]+/).map((x) => x.toLowerCase()).filter(Boolean);
  if (notifyTo.some((x) => !isEmail(x))) fail("One of the notification addresses doesn't look like an email address. Nothing was saved.");
  const email = {
    fromName: field("fromName") || null,
    fromAddress: fromAddress || null,
    replyTo: replyTo || null,
    notifyTo: notifyTo.join(", ") || null,
    notifyOn: formData.getAll("notifyOn").map(String).filter((k): k is NotifyScenario => SCENARIO_KEYS.includes(k as NotifyScenario)),
  };

  const measurementFields: Record<string, unknown>[] = [];
  for (let i = 0; i < (Number(formData.get("measureCount")) || 0); i++) {
    if (formData.get(`measureRemove_${i}`) === "on") continue;
    const label = readLocalizedString(formData, `measureLabel_${i}`);
    if (!label.some((v) => v._key === "en" && v.value)) continue;
    measurementFields.push({ _key: String(formData.get(`measureKey_${i}`) ?? "") || `mf${Date.now().toString(36)}${i}`, _type: "measurementField", label, hint: readLocalizedString(formData, `measureHint_${i}`) });
  }
  const num = (name: string, min: number, max: number) => {
    const n = Number(String(formData.get(name) ?? "").replace(",", "."));
    return Number.isFinite(n) && n >= min && n <= max ? n : null;
  };
  const hex = (name: string) => {
    const v = String(formData.get(name) ?? "").trim().toLowerCase();
    return /^#([0-9a-f]{3}){1,2}$/.test(v) ? v : null;
  };
  const fontChoice = (name: string) => {
    const v = String(formData.get(name) ?? "").trim();
    return FONT_CHOICES.includes(v) ? v : null;
  };
  const logo = await readImageField(formData, "brandLogo", "image");
  const brand = {
    logo,
    headingFont: fontChoice("headingFont"),
    bodyFont: fontChoice("bodyFont"),
    headingSizeDesktop: num("headingSizeDesktop", 16, 160),
    headingSizeMobile: num("headingSizeMobile", 12, 80),
    bannerSize: num("bannerSize", 16, 200),
    paragraphSize: num("paragraphSize", 10, 24),
    backgroundColor: hex("backgroundColor"),
    textColor: hex("textColor"),
    photoBackground: hex("photoBackground"),
    vintageBackground: hex("vintageBackground"),
    vintagePhotoBackground: hex("vintagePhotoBackground"),
  };
  const shippingZones: Record<string, unknown>[] = [];
  for (let i = 0; i < (Number(formData.get("zoneCount")) || 0); i++) {
    if (formData.get(`zoneRemove_${i}`) === "on") continue;
    const name = String(formData.get(`zoneName_${i}`) ?? "").trim();
    const countries = String(formData.get(`zoneCountries_${i}`) ?? "").split(/[,\n]/).map((c) => c.trim()).filter(Boolean);
    const price = kronerToOre(formData.get(`zonePrice_${i}`));
    if (!name && countries.length === 0) continue;
    if (!name || countries.length === 0 || price === undefined) throw new Error(`Shipping zone ${i + 1} needs a name, at least one country and a price`);
    shippingZones.push({
      _key: String(formData.get(`zoneKey_${i}`) ?? "") || `zn${Date.now().toString(36)}${i}`,
      _type: "shippingZone",
      name,
      countries,
      shippingOre: price,
      freeShippingFromOre: kronerToOre(formData.get(`zoneFreeFrom_${i}`)) ?? null,
    });
  }
  await adminClient()
    .createIfNotExists({ _id: "siteSettings", _type: "siteSettings" })
    .then(() =>
      adminClient()
        .patch("siteSettings")
        .set({
          // The gate: the proxy reads this (lib/gate.ts). Only the two values the select offers.
          comingSoon: formData.get("comingSoon") === "closed",
          siteName: String(formData.get("siteName") ?? "Flöra").trim(),
          gaMeasurementId,
          gaPropertyId,
          announcement: readLocalizedString(formData, "announcement"),
          signUpTitle: readLocalizedString(formData, "signUpTitle"),
          signUpText: readLocalizedString(formData, "signUpText", "text"),
          signUpButton: readLocalizedString(formData, "signUpButton"),
          footerText: readLocalizedString(formData, "footerText", "text"),
          instagram: String(formData.get("instagram") ?? "").trim() || null,
          contactEmail: String(formData.get("contactEmail") ?? "").trim() || null,
          email,
          shippingOre: shippingOre ?? 0,
          freeShippingFromOre: freeFrom ?? null,
          signUpImage,
          footerImage,
          measurementFields,
          sizeGuide: readLocalizedString(formData, "sizeGuide", "text"),
          shippingZones,
          shipsTo: String(formData.get("shipsTo") ?? "").split(/[,\n]/).map((c) => c.trim()).filter(Boolean),
          // Field by field, so the icon page's own brand fields (favicon, tabIcon…) are left alone.
          ...Object.fromEntries(Object.entries(brand).map(([k, v]) => [`brand.${k}`, v])),
        })
        .commit(),
    );
  forgetComingSoon();
  revalidatePath("/admin/settings");
  redirect("/admin/settings?saved=1");
}

export async function saveFrontPage(formData: FormData) {
  await requireAdmin();
  const video = await readVideoField(formData, "heroVideo");

  // The values: one slot per existing item plus an empty one; a slot with no English title is dropped.
  const count = Number(formData.get("valueCount") ?? 0) || 0;
  const items = [];
  for (let i = 0; i < count; i++) {
    if (formData.get(`valueRemove_${i}`) === "on") continue;
    const title = readLocalizedString(formData, `valueTitle_${i}`);
    if (!title.some((v) => v._key === "en" && v.value)) continue;
    items.push({
      _key: String(formData.get(`valueKey_${i}`) ?? "") || `v${Date.now().toString(36)}${i}`,
      _type: "value",
      title,
      description: readLocalizedString(formData, `valueText_${i}`, "text"),
      image: await readImageField(formData, `valueImage_${i}`),
    });
  }

  await adminClient().createIfNotExists({ _id: "homePage", _type: "homePage" });
  await adminClient()
    .patch("homePage")
    .set({
      "hero.video": video,
      "hero.videoUrl": String(formData.get("videoUrl") ?? "").trim() || null,
      "hero.logoPosition": formData.get("logoPosition") === "center" ? "center" : "left",
      productsTitle: readLocalizedString(formData, "productsTitle"),
      "values.title": readLocalizedString(formData, "valuesTitle"),
      "values.intro": readLocalizedString(formData, "valuesIntro", "text"),
      "values.items": items,
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
    image: await readImageField(formData, "image"),
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

export async function uploadMedia(formData: FormData) {
  await requireAdmin();
  try {
    for (const file of formData.getAll("files")) {
      if (!(file instanceof File) || file.size === 0) continue;
      if (file.type.startsWith("video/")) await uploadVideo(file);
      else await uploadImage(file);
    }
  } catch (err) {
    redirect(`/admin/media?error=${encodeURIComponent(err instanceof Error ? err.message : "Upload failed")}`);
  }
  revalidatePath("/admin/media");
  redirect("/admin/media?saved=1");
}

export async function deleteMedia(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!/^(image|file)-/.test(id)) return;
  // Refuse if anything still points at it: Sanity would refuse too, but with a less readable error.
  const used = await adminClient().fetch<number>(`count(*[references($id)])`, { id });
  if (used > 0) redirect(`/admin/media?error=${encodeURIComponent("That file is still in use. Remove it from its page first.")}`);
  await adminClient().delete(id);
  revalidatePath("/admin/media");
  redirect("/admin/media");
}

export async function saveDiscount(formData: FormData) {
  await requireAdmin();
  const parsed = z
    .object({
      id: z.string().optional(),
      code: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{2,30}$/, "Codes use capital letters, numbers and dashes (2–30 characters)"),
      description: z.string().trim().max(200),
      kind: z.enum(["percent", "amount", "shipping"]),
      value: z.string().trim(),
      freeShipping: z.string().optional(),
      active: z.string().optional(),
      startsAt: z.string().optional(),
      endsAt: z.string().optional(),
      minSubtotal: z.string().optional(),
      maxUses: z.string().optional(),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid discount");
  const d = parsed.data;
  const value = d.kind === "percent" ? Math.min(100, Math.max(0, Number(d.value) || 0)) : d.kind === "amount" ? (kronerToOre(d.value) ?? 0) : 0;
  if (d.kind !== "shipping" && value <= 0) throw new Error("Give the discount a value");
  const toDate = (v?: string) => (v ? new Date(v).toISOString() : null);
  const fields = {
    code: d.code,
    description: d.description,
    kind: d.kind,
    value,
    freeShipping: d.freeShipping === "on",
    active: d.active === "on",
    startsAt: toDate(d.startsAt),
    endsAt: toDate(d.endsAt),
    minSubtotalOre: kronerToOre(d.minSubtotal ?? "") ?? null,
    maxUses: d.maxUses ? Math.max(1, Math.round(Number(d.maxUses))) : null,
  };
  const taken = await adminClient().fetch<string | null>(`*[_type == "discount" && code == $code && _id != $id][0]._id`, { code: d.code, id: d.id ?? "" });
  if (taken) throw new Error(`The code ${d.code} already exists`);
  let docId = d.id ?? "";
  if (docId) await adminClient().patch(docId).set(fields).commit();
  else docId = (await adminClient().create({ _type: "discount", uses: 0, ...fields }))._id;
  revalidatePath("/admin/discounts");
  redirect(`/admin/discounts/${docId}?saved=1`);
}

export async function deleteDiscount(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (id) await adminClient().delete(id);
  revalidatePath("/admin/discounts");
  redirect("/admin/discounts");
}

export async function saveAboutPage(formData: FormData) {
  await requireAdmin();
  const image = await readImageField(formData, "image");
  await adminClient().createIfNotExists({ _id: "aboutPage", _type: "aboutPage" });
  await adminClient()
    .patch("aboutPage")
    .set({ title: readLocalizedString(formData, "title"), intro: readLocalizedString(formData, "intro", "text"), body: readLocalizedBlocks(formData, "body"), image })
    .commit();
  revalidatePath("/admin/pages/about");
  redirect("/admin/pages/about?saved=1");
}

export async function saveVintagePage(formData: FormData) {
  await requireAdmin();
  const image = await readImageField(formData, "image");
  await adminClient().createIfNotExists({ _id: "vintagePage", _type: "vintagePage" });
  await adminClient()
    .patch("vintagePage")
    .set({ title: readLocalizedString(formData, "title"), intro: readLocalizedString(formData, "intro", "text"), emptyText: readLocalizedString(formData, "emptyText", "text"), image })
    .commit();
  revalidatePath("/admin/pages/vintage");
  redirect("/admin/pages/vintage?saved=1");
}

/** Setup page: send every template to the signed-in admin so the key, sender and look can be checked. */
export async function sendTestEmails() {
  const admin = await requireAdmin();
  const notify = await import("@/lib/notify");
  if (!notify.emailConfigured()) redirect(`/admin/setup?error=${encodeURIComponent("RESEND_API_KEY is not set.")}`);
  // Real products, so the sample order looks like one of Ida's.
  const sample = await adminClient().fetch<{ name?: string; priceOre?: number; image?: string }[]>(
    `*[_type == "product" && visible != false] | order(_createdAt asc)[0...2]{ "name": name[_key == "en"][0].value, priceOre, "image": images[0].asset->url }`,
  );
  const [a, b] = [sample[0] ?? {}, sample[1] ?? sample[0] ?? {}];
  try {
    await notify.sendTestEmail(admin.email);
    await notify.sendOrderConfirmation({
      orderNumber: "FL-TEST0001",
      language: "en",
      customer: { name: "Test Customer", email: admin.email, address: "Testveien 1, 0150 Oslo, Norway" },
      lines: [
        { name: a.name ?? "Miss Flow top", quantity: 1, unitPriceOre: a.priceOre ?? 89000, image: a.image, measurements: [{ label: "Bust", value: "88" }, { label: "Waist", value: "70" }, { label: "Hips", value: "94" }, { label: "Height", value: "170" }] },
        { name: b.name ?? "Wrap skirt", quantity: 2, unitPriceOre: b.priceOre ?? 129000, image: b.image, size: "M", measurements: [] },
      ],
      totals: { subtotalOre: 347000, discountOre: 34700, discountCode: "WELCOME10", shippingOre: 0, vatIncludedOre: 62460, totalOre: 312300 },
    });
    await notify.sendShippingNotification({ orderNumber: "FL-TEST0001", email: admin.email, language: "en", trackingNumber: "TESTNO123456789", trackingUrl: notify.trackingUrlFor("TESTNO123456789") });
    await notify.sendNewsletterWelcome(admin.email, "en");
  } catch (err) {
    redirect(`/admin/setup?error=${encodeURIComponent(err instanceof Error ? err.message : "Sending failed")}`);
  }
  redirect(`/admin/setup?sent=${encodeURIComponent(admin.email)}`);
}

/** Setup page: the default lookbook newsletter with the shop's real products, to the signed-in admin. */
export async function sendSampleNewsletter() {
  const admin = await requireAdmin();
  const notify = await import("@/lib/notify");
  if (!notify.emailConfigured()) redirect(`/admin/setup?error=${encodeURIComponent("RESEND_API_KEY is not set.")}`);
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.prosjectflora.com").replace(/\/$/, "");
  const ids = await adminClient().fetch<string[]>(`*[_type == "product" && visible != false && vintage != true] | order(_createdAt asc)[0...4]._id`);
  try {
    const { defaultBlocks } = await import("@/lib/newsletter-blocks");
    const { renderForLang } = await import("@/lib/admin/newsletter");
    const html = await renderForLang(defaultBlocks(base, ids), "en", notify.unsubscribeUrlFor("subscriber-00000000000000000000000000000000"));
    await notify.sendNewsletter({ email: admin.email, subject: "The first collection – Flöra" }, html);
  } catch (err) {
    redirect(`/admin/setup?error=${encodeURIComponent(err instanceof Error ? err.message : "Sending failed")}`);
  }
  redirect(`/admin/setup?newsletter=${encodeURIComponent(admin.email)}`);
}

/** Product page: build the animated GIF from the product's photos and attach it. Takes a few seconds. */
export async function makeGif(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Save the product first");
  const client = adminClient();
  const photos = await client.fetch<{ main?: string | null; colors?: (string | null)[] | null } | null>(`*[_id == $id][0]{ "main": images[0].asset->url, "colors": colors[].image.asset->url }`, { id });
  const sources = [photos?.main, ...(photos?.colors ?? [])].filter((u): u is string => Boolean(u));
  if (!sources.length) redirect(`/admin/products/${id}?error=${encodeURIComponent("Add at least one photo first.")}`);
  const { makeProductGif } = await import("@/lib/admin/gif");
  try {
    const gif = await makeProductGif(sources);
    const asset = await client.assets.upload("file", gif, { filename: `${id}.gif`, contentType: "image/gif" });
    await client.patch(id).set({ gif: { _type: "file", asset: { _type: "reference", _ref: asset._id } } }).commit();
  } catch (err) {
    console.error("[admin] gif failed", err);
    const { notice } = await import("@/lib/notices");
    await notice({ kind: "warning", source: "products", title: "Could not make a product GIF", detail: err instanceof Error ? err.message : String(err), href: `/admin/products/${id}` });
    redirect(`/admin/products/${id}?error=${encodeURIComponent(err instanceof Error ? err.message : "Could not make the GIF")}`);
  }
  revalidatePath(`/admin/products/${id}`);
  redirect(`/admin/products/${id}?gif=1`);
}

export async function removeGif(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (id) await adminClient().patch(id).unset(["gif"]).commit();
  revalidatePath(`/admin/products/${id}`);
  redirect(`/admin/products/${id}`);
}

/** Sidebar switch: fill the admin with made-up data, or remove it again. */
export async function toggleDemoMode() {
  await requireAdmin();
  const { clearDemo, isDemoOn, seedDemo } = await import("@/lib/admin/demo");
  if (await isDemoOn()) await clearDemo();
  else await seedDemo();
  revalidatePath("/admin", "layout");
  redirect("/admin");
}
