"use client";

import Link from "next/link";
import { variantLabel } from "@/lib/variant";
import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { setOrderStatus } from "@/app/admin/(app)/orders/actions";
import { StatusPill } from "@/components/admin/ui";
import { paidWith, STATUS_LABEL, type OrderStatus } from "@/lib/order-status";

export type PreviewOrder = {
  _id: string;
  orderNumber?: string;
  status?: string;
  orderedAt?: string;
  manual?: string;
  customer?: { name?: string; email?: string; phone?: string; address?: string; note?: string };
  items?: { _key: string; name?: string; quantity?: number; unitPriceOre?: number; size?: string; colour?: string }[];
  shippingOre?: number;
  totalOre?: number;
  paymentProvider?: string;
  paymentCard?: { brand?: string; last4?: string };
  origin?: { label?: string; device?: string; pageViews?: number };
};

const nok = new Intl.NumberFormat("nb-NO", { style: "currency", currency: "NOK", maximumFractionDigits: 2 });
const kr = (ore?: number) => nok.format((ore ?? 0) / 100);
const subscribe = () => () => {};

/** Where the order goes next with one press. Processing → Shipped goes through the tracking email instead. */
const NEXT: Partial<Record<OrderStatus, OrderStatus>> = { shipped: "delivered" };


/**
 * The eye on an order row: everything about the order in a popup, without leaving the list — who,
 * where to, what, how it was paid — and one button to move it on (Processing → Shipped → Completed).
 */
export default function OrderPreview({ order }: { order: PreviewOrder }) {
  const [open, setOpen] = useState(false);
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const c = order.customer ?? {};
  const next = NEXT[(order.status ?? "paid") as OrderStatus];

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label={`Preview ${order.orderNumber}`} title="Preview" className="flex h-[28px] w-[28px] shrink-0 items-center justify-center text-black/60 hover:text-black transition-colors">
        <svg width="18" height="12" viewBox="0 0 18 12" fill="none" aria-hidden>
          <path d="M1 6c2-3.3 4.7-5 8-5s6 1.7 8 5c-2 3.3-4.7 5-8 5S3 9.3 1 6Z" stroke="currentColor" strokeWidth="1" />
          <circle cx="9" cy="6" r="2.2" fill="currentColor" />
        </svg>
      </button>
      {mounted &&
        open &&
        // Portalled to <body>: inside the admin wrapper, night mode's filter would pin "fixed" to the wrapper.
        createPortal(
          <div role="dialog" aria-modal="true" aria-label={`Order ${order.orderNumber}`} className="admin-night-portal fixed inset-0 z-50 flex items-end justify-center bg-black/40 md:items-center md:p-[42px]" onClick={() => setOpen(false)}>
            <div onClick={(e) => e.stopPropagation()} className="flex max-h-[90svh] w-full max-w-[760px] flex-col gap-[24px] overflow-y-auto bg-white p-[24px] font-gotham text-paragraph text-black md:p-[42px]">
              <div className="flex items-start justify-between gap-[12px]">
                <div className="flex flex-col gap-[6px]">
                  <h2 className="m-0 font-americana text-[24px] leading-none md:text-[32px]">Order {order.orderNumber}</h2>
                  <span className="text-[11px] text-black/50">{order.orderedAt ? new Date(order.orderedAt).toLocaleString("nb-NO", { dateStyle: "long", timeStyle: "short" }) : ""}</span>
                </div>
                <div className="flex items-center gap-[12px]">
                  <StatusPill status={order.status} />
                  <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="flex h-[28px] w-[28px] items-center justify-center text-black hover:opacity-60 transition-opacity">
                    <svg width="12" height="12" viewBox="0 0 10 10" aria-hidden>
                      <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              </div>

              {c.note && (
                <div className="flex flex-col gap-[6px] border border-black p-[12px]">
                  <span className="text-[11px] uppercase tracking-[0.2em]">Note from customer</span>
                  <p className="m-0 whitespace-pre-wrap">{c.note}</p>
                </div>
              )}

              <div className="grid gap-[24px] md:grid-cols-2">
                <dl className="m-0 flex flex-col gap-[12px]">
                  <div className="flex flex-col gap-[3px]">
                    <dt className="text-[11px] text-black/50">Customer</dt>
                    <dd className="m-0">{c.name}</dd>
                    {c.address && <dd className="m-0 whitespace-pre-line text-black/70">{c.address.split(", ").join("\n")}</dd>}
                  </div>
                  {c.email && (
                    <div className="flex flex-col gap-[3px]">
                      <dt className="text-[11px] text-black/50">Email</dt>
                      <dd className="m-0"><a href={`mailto:${c.email}`} className="break-all underline">{c.email}</a></dd>
                    </div>
                  )}
                  {c.phone && (
                    <div className="flex flex-col gap-[3px]">
                      <dt className="text-[11px] text-black/50">Phone</dt>
                      <dd className="m-0"><a href={`tel:${c.phone.replace(/\s/g, "")}`} className="underline">{c.phone}</a></dd>
                    </div>
                  )}
                </dl>
                <dl className="m-0 flex flex-col gap-[12px]">
                  <div className="flex flex-col gap-[3px]">
                    <dt className="text-[11px] text-black/50">Paid with</dt>
                    <dd className="m-0">{paidWith(order)}</dd>
                  </div>
                  <div className="flex flex-col gap-[3px]">
                    <dt className="text-[11px] text-black/50">Shipping</dt>
                    <dd className="m-0">{order.shippingOre ? kr(order.shippingOre) : "Free"}</dd>
                  </div>
                  {order.origin?.label && (
                    <div className="flex flex-col gap-[3px]">
                      <dt className="text-[11px] text-black/50">Came from</dt>
                      <dd className="m-0">
                        {order.origin.label}
                        {order.origin.device ? ` · ${order.origin.device}` : ""}
                        {order.origin.pageViews ? ` · ${order.origin.pageViews} pages` : ""}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>

              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-black/25 text-[11px] text-black/50">
                    <th className="py-[6px] font-normal">Product</th>
                    <th className="py-[6px] text-right font-normal">Qty</th>
                    <th className="py-[6px] text-right font-normal">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(order.items ?? []).map((it) => (
                    <tr key={it._key} className="border-b border-black/10">
                      <td className="py-[10px] pr-[12px]">{it.name}{variantLabel(it) ? ` – ${variantLabel(it)}` : ""}</td>
                      <td className="py-[10px] text-right">{it.quantity}</td>
                      <td className="py-[10px] text-right">{kr((it.unitPriceOre ?? 0) * (it.quantity ?? 0))}</td>
                    </tr>
                  ))}
                  <tr>
                    <td className="pt-[10px]" colSpan={2}>Order total</td>
                    <td className="pt-[10px] text-right">{kr(order.totalOre)}</td>
                  </tr>
                </tbody>
              </table>

              <div className="flex flex-col gap-[12px] md:flex-row">
                {(order.status ?? "paid") === "paid" && !order.manual && (
                  <Link href={`/admin/orders/${order._id}#send`} className="flex items-center justify-center border border-black p-[12px] font-gotham text-paragraph text-black hover:bg-black hover:text-white transition-colors md:flex-1">
                    Add tracking &amp; send
                  </Link>
                )}
                {next && (
                  <form action={setOrderStatus} onSubmit={() => setOpen(false)} className="md:flex-1">
                    <input type="hidden" name="id" value={order._id} />
                    <input type="hidden" name="status" value={next} />
                    <button className="flex w-full items-center justify-center border border-black p-[12px] font-gotham text-paragraph text-black hover:bg-black hover:text-white transition-colors">
                      Mark as {STATUS_LABEL[next].toLowerCase()}
                    </button>
                  </form>
                )}
                <Link href={`/admin/orders/${order._id}`} className="flex items-center justify-center bg-black p-[12px] font-gotham text-paragraph text-white hover:opacity-80 transition-opacity md:flex-1">
                  Open order
                </Link>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
