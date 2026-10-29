import Link from "next/link";
import OrderPreview, { type PreviewOrder } from "@/components/admin/order-preview";
import { Heading, Muted, StatusPill, Tag } from "@/components/admin/ui";
import { adminClient, kr } from "@/lib/admin/sanity";
import { isStatus, ORDER_STATUSES, STATUS_LABEL } from "@/lib/order-status";

type OrderRow = PreviewOrder & { demo?: boolean };

const ROW = `_id, demo, manual, orderNumber, status, totalOre, shippingOre, orderedAt, customer, paymentProvider, paymentCard, origin, items[]{_key, name, quantity, unitPriceOre, size}`;

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const { status: rawStatus, q: rawQ } = await searchParams;
  const status = isStatus(rawStatus) ? rawStatus : null;
  const q = (rawQ ?? "").trim().slice(0, 80);

  const filters = [`_type == "order"`];
  if (status) filters.push(`coalesce(status, "paid") == $status`);
  if (q) filters.push(`(orderNumber match $q || customer.name match $q || customer.email match $q)`);
  const [orders, counts] = await Promise.all([
    adminClient().fetch<OrderRow[]>(`*[${filters.join(" && ")}] | order(orderedAt desc)[0...300]{${ROW}}`, { status, q: q ? `*${q}*` : "" }),
    adminClient().fetch<string[]>(`*[_type == "order"].status`),
  ]);
  const count = (s: string) => counts.filter((c) => (c ?? "paid") === s).length;
  const tabHref = (s: string | null) => {
    const p = new URLSearchParams();
    if (s) p.set("status", s);
    if (q) p.set("q", q);
    const str = p.toString();
    return `/admin/orders${str ? `?${str}` : ""}`;
  };

  return (
    <>
      <div className="flex flex-col gap-[12px]">
        <div className="flex flex-wrap items-end justify-between gap-[12px]">
          <Heading>Orders</Heading>
          <Link href="/admin/orders/new" className="border border-black px-[18px] py-[10px] font-gotham text-paragraph text-black hover:bg-black hover:text-white transition-colors">
            Add order
          </Link>
        </div>
        <Muted>Newest first. Shop orders appear by themselves when a payment goes through; add one yourself for PR gifts or sales outside the shop.</Muted>
      </div>

      <div className="flex flex-col gap-[24px]">
        <nav aria-label="Filter by status" className="flex flex-wrap gap-x-[18px] gap-y-[8px] font-gotham text-paragraph">
          <Link href={tabHref(null)} className={!status ? "text-black underline underline-offset-4" : "text-black/50 hover:text-black transition-colors"}>
            All <span className="text-black/50">({counts.length})</span>
          </Link>
          {ORDER_STATUSES.map((s) => (
            <Link key={s} href={tabHref(s)} className={status === s ? "text-black underline underline-offset-4" : "text-black/50 hover:text-black transition-colors"}>
              {STATUS_LABEL[s]} <span className="text-black/50">({count(s)})</span>
            </Link>
          ))}
        </nav>
        <form className="flex gap-[12px]" role="search">
          {status && <input type="hidden" name="status" value={status} />}
          <input type="search" name="q" defaultValue={q} placeholder="Search name, email or order number" aria-label="Search orders" className="min-w-0 flex-1 border border-black/20 bg-transparent p-[12px] font-gotham text-paragraph text-black outline-none placeholder:text-black/50 focus:border-black/60 md:max-w-[420px]" />
          <button className="border border-black px-[18px] font-gotham text-paragraph text-black hover:bg-black hover:text-white transition-colors">Search</button>
        </form>
      </div>

      {orders.length === 0 ? (
        <Muted>{q || status ? "No orders match." : "No orders yet."}</Muted>
      ) : (
        <div className="flex flex-col">
          <div className="hidden gap-[12px] border-b border-black/25 px-[12px] pb-[8px] font-gotham text-[11px] text-black/50 md:flex">
            <span className="flex-1">Order</span>
            <span className="w-[28px]" />
            <span className="w-[90px]">Date</span>
            <span className="w-[100px]">Status</span>
            <span className="w-[160px]">Came from</span>
            <span className="w-[90px] text-right">Total</span>
          </div>
          {orders.map((o) => (
            <div key={o._id} className="flex flex-wrap items-center gap-x-[12px] gap-y-[6px] border-b border-black/10 px-[12px] py-[14px] font-gotham text-paragraph text-black transition-colors hover:bg-[#fafbfc] md:flex-nowrap">
              <Link href={`/admin/orders/${o._id}`} className="flex min-w-0 flex-1 basis-full items-baseline gap-[10px] md:basis-0">
                <span className="shrink-0">{o.orderNumber}</span>
                <span className="truncate underline-offset-4 hover:underline">{o.customer?.name || o.customer?.email}</span>
                {o.customer?.note && <span title="The customer left a note" className="shrink-0 border-[0.5px] border-black px-[4px] text-[11px]">note</span>}
                {o.manual === "pr" && <Tag tone="muted">PR</Tag>}
                {o.manual === "sale" && <Tag tone="muted">by hand</Tag>}
                {o.demo && <Tag tone="muted">test</Tag>}
              </Link>
              <OrderPreview order={o} />
              <span className="w-[90px] text-[11px] text-black/50">{o.orderedAt ? new Date(o.orderedAt).toLocaleDateString("nb-NO") : ""}</span>
              <span className="md:w-[100px]"><StatusPill status={o.status} /></span>
              <span className="truncate text-[11px] text-black/50 md:w-[160px]">{o.origin?.label ?? ""}</span>
              <span className="ml-auto md:ml-0 md:w-[90px] md:text-right">{kr(o.totalOre)}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
