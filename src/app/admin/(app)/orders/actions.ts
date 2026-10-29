"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { adminClient, kronerToOre } from "@/lib/admin/sanity";
import { requireAdmin } from "@/lib/admin/session";
import { ORDER_STATUSES } from "@/lib/order-status";

/** The quick buttons in the order list's preview: change the status, nothing else. */
export async function setOrderStatus(formData: FormData) {
  await requireAdmin();
  const parsed = z.object({ id: z.string().startsWith("order-"), status: z.enum(ORDER_STATUSES) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error("Invalid status change");
  await adminClient().patch(parsed.data.id).set({ status: parsed.data.status }).commit();
  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${parsed.data.id}`);
}

const LINE_SLOTS = 6;

type Product = { _id: string; name?: string; priceOre?: number; sizing?: string };

/**
 * An order Ida adds herself: a PR gift, a sale at a market, a dress paid for by Vipps in person.
 * It sits in the same list as the shop's orders, counts the stock down (unless she says not to)
 * and is marked `manual` so it is never mistaken for a card payment. No email is sent.
 */
export async function createManualOrder(formData: FormData) {
  await requireAdmin();
  const text = (k: string, max: number) => String(formData.get(k) ?? "").trim().slice(0, max);
  const kind = formData.get("kind") === "sale" ? "sale" : "pr";
  const status = z.enum(ORDER_STATUSES).catch("delivered").parse(formData.get("status"));
  const name = text("name", 200);
  if (!name) redirect("/admin/orders/new?error=" + encodeURIComponent("Add the person's name."));

  const client = adminClient();
  const products = await client.fetch<Product[]>(`*[_type == "product" && !(_id in path("drafts.**"))]{ _id, "name": name[_key == "en"][0].value, priceOre, sizing }`);
  const byId = new Map(products.map((p) => [p._id, p]));

  const lines: { productId?: string; name: string; quantity: number; unitPriceOre: number; size?: string }[] = [];
  for (let i = 0; i < LINE_SLOTS; i++) {
    const id = text(`product_${i}`, 100);
    const custom = text(`custom_${i}`, 120);
    const p = id ? byId.get(id) : undefined;
    if (!p && !custom) continue;
    const quantity = Math.min(Math.max(parseInt(text(`qty_${i}`, 3), 10) || 1, 1), 99);
    const typed = kronerToOre(formData.get(`price_${i}`));
    // A gift costs nothing unless she types a price; a sale defaults to the shop price.
    const unitPriceOre = Math.max(0, typed ?? (kind === "pr" ? 0 : (p?.priceOre ?? 0)));
    const size = text(`size_${i}`, 20) || undefined;
    lines.push({ ...(p ? { productId: p._id } : {}), name: p?.name ?? custom, quantity, unitPriceOre, ...(size ? { size } : {}) });
  }
  if (!lines.length) redirect("/admin/orders/new?error=" + encodeURIComponent("Add at least one product."));

  const subtotalOre = lines.reduce((s, l) => s + l.unitPriceOre * l.quantity, 0);
  const shippingOre = Math.max(0, kronerToOre(formData.get("shipping")) ?? 0);
  const totalOre = subtotalOre + shippingOre;
  const day = text("orderedAt", 10);
  const orderedAt = /^\d{4}-\d{2}-\d{2}$/.test(day) ? new Date(`${day}T12:00:00`).toISOString() : new Date().toISOString();
  const ref = randomBytes(4).toString("hex").toUpperCase();
  const docId = `order-manual-${ref.toLowerCase()}`;

  let tx = client.transaction().create({
    _id: docId,
    _type: "order",
    manual: kind,
    orderNumber: `FL-${ref}`,
    status,
    orderedAt,
    language: formData.get("language") === "en" ? "en" : "no",
    customer: { name, email: text("email", 200).toLowerCase(), phone: text("phone", 50), address: text("address", 500), note: text("note", 1000) },
    items: lines.map((l, i) => ({
      _key: `line-${i}`,
      _type: "orderItem",
      ...(l.productId ? { product: { _type: "reference", _ref: l.productId, _weak: true } } : {}),
      name: l.name,
      quantity: l.quantity,
      unitPriceOre: l.unitPriceOre,
      ...(l.size ? { size: l.size } : {}),
      measurements: [],
    })),
    subtotalOre,
    shippingOre,
    vatIncludedOre: Math.round((totalOre * 0.25) / 1.25),
    totalOre,
    currency: "nok",
    paymentProvider: kind === "pr" ? "none" : text("paidWith", 40) || "other",
    origin: { label: kind === "pr" ? "PR / gift" : "Added by hand" },
    internalNote: text("internalNote", 2000),
  });
  if (formData.get("stock") === "on") {
    for (const l of lines) {
      if (!l.productId) continue;
      if (l.size) tx = tx.patch(l.productId, (p) => p.dec({ [`sizes[label=="${l.size!.replace(/"/g, "")}"].stock`]: l.quantity }));
      else tx = tx.patch(l.productId, (p) => p.setIfMissing({ stock: 0 }).dec({ stock: l.quantity }));
    }
  }
  await tx.commit({ autoGenerateArrayKeys: false });
  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  revalidatePath("/admin/products");
  redirect(`/admin/orders/${docId}?saved=1`);
}
