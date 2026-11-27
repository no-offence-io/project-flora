import Link from "next/link";
import OrderPreview, { type PreviewOrder } from "@/components/admin/order-preview";
import RangePicker, { type Filter } from "@/components/admin/range-picker";
import ShowMore, { parseShow } from "@/components/admin/show-more";
import { Heading, Muted, StatusPill, Tag } from "@/components/admin/ui";
import { bySource, dayKey, instantsOf, parseRange, parseSource, rangeParams, SOURCE_FILTER, SOURCES } from "@/lib/admin/reports";
import { adminClient, kr } from "@/lib/admin/sanity";
import { COUNTS_AS_SALE, isStatus, ORDER_STATUSES, STATUS_LABEL } from "@/lib/order-status";
import { requireAdmin } from "@/lib/admin/session";

type OrderRow = PreviewOrder & { demo?: boolean };

const ROW = `_id, demo, manual, orderNumber, status, totalOre, shippingOre, orderedAt, customer, paymentProvider, paymentCard, origin, items[]{_key, name, quantity, unitPriceOre, size, colour}`;

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; range?: string; from?: string; to?: string; source?: string; show?: string }> }) {
  await requireAdmin();
  const params = await searchParams;
  const status = isStatus(params.status) ? params.status : null;
  const q = (params.q ?? "").trim().slice(0, 80);
  const today = dayKey(new Date());
  const range = parseRange(params, today, "all");
  const source = parseSource(params.source);
  const show = parseShow(params.show);

  // The period and the search narrow everything; the shop and the status are counted within that,
  // so the numbers on the choices always describe the orders the list would show.
  const within = [`_type == "order"`];
  const vars: Record<string, string> = { q: q ? `*${q}*` : "", status: status ?? "" };
  if (range.preset !== "all") {
    const { from, before } = instantsOf(range);
    within.push("dateTime(orderedAt) >= dateTime($from) && dateTime(orderedAt) < dateTime($before)");
    vars.from = from.toISOString();
    vars.before = before.toISOString();
  }
  if (q) within.push("(orderNumber match $q || customer.name match $q || customer.email match $q)");
  const listed = [...within, ...(SOURCE_FILTER[source] ? [`(${SOURCE_FILTER[source]})`] : []), ...(status ? [`coalesce(status, "paid") == $status`] : [])].join(" && ");
  const [orders, facts] = await Promise.all([
    adminClient().fetch<OrderRow[]>(`*[${listed}] | order(orderedAt desc)[0...${show}]{${ROW}}`, vars),
    adminClient().fetch<{ status: string; manual?: string | null; totalOre?: number | null }[]>(`*[${within.join(" && ")}]{ "status": coalesce(status, "paid"), manual, totalOre }`, vars),
  ]);
  const ofSource = bySource(facts, source);
  const matching = status ? ofSource.filter((o) => o.status === status) : ofSource;
  const salesOre = matching.filter((o) => COUNTS_AS_SALE.includes(o.status as never) && o.manual !== "pr").reduce((t, o) => t + (o.totalOre ?? 0), 0);

  const filters: Filter[] = [
    { name: "source", label: "Which sales", value: source, fallback: "all", options: SOURCES.map((x) => ({ value: x.key, label: x.label, count: bySource(facts, x.key).length })) },
    { name: "status", label: "Status", value: status ?? "any", fallback: "any", options: [{ value: "any", label: "All", count: ofSource.length }, ...ORDER_STATUSES.map((x) => ({ value: x, label: STATUS_LABEL[x], count: ofSource.filter((o) => o.status === x).length }))] },
  ];
  const address: [string, string][] = [...rangeParams(range), ...(source !== "all" ? [["source", source] as [string, string]] : []), ...(status ? [["status", status] as [string, string]] : []), ...(q ? [["q", q] as [string, string]] : [])];
  const narrowed = Boolean(q || status || source !== "all" || range.preset !== "all");

  return (
    <>
      <div className="flex flex-col gap-[12px]">
        <Heading>Orders</Heading>
        <Muted>Newest first. Shop orders appear by themselves when a payment goes through; add one yourself for PR gifts or sales outside the shop.</Muted>
      </div>

      <RangePicker path="/admin/orders" range={range} today={today} all filters={filters} keep={{ q: q || undefined }} />

      <div className="flex flex-col gap-[12px] md:flex-row md:items-center md:justify-between">
        <form className="flex flex-1 gap-[12px]" role="search">
          {address.filter(([k]) => k !== "q").map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
          <input type="search" name="q" defaultValue={q} placeholder="Search name, email or order number" aria-label="Search orders" className="min-w-0 flex-1 border border-black/20 bg-transparent p-[12px] font-gotham text-paragraph text-black outline-none placeholder:text-black/50 focus:border-black/60 md:max-w-[420px]" />
          <button className="border border-black px-[18px] font-gotham text-paragraph text-black hover:bg-black hover:text-white transition-colors">Search</button>
        </form>
        <p className="m-0 font-gotham text-paragraph text-black" role="status">
          {matching.length} {matching.length === 1 ? "order" : "orders"} <span className="text-black/50">· {kr(salesOre)} in sales</span>
          {narrowed && (
            <>
              {" "}
              <Link href="/admin/orders" className="text-[11px] text-black/50 underline underline-offset-4 hover:text-black">clear</Link>
            </>
          )}
        </p>
      </div>

      {orders.length === 0 ? (
        <Muted>{narrowed ? "No orders match. Try a longer period, or clear the filters." : "No orders yet."}</Muted>
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
                {o.manual === "import" && <Tag tone="muted">from Stripe</Tag>}
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
      <ShowMore path="/admin/orders" params={address} shown={orders.length} total={matching.length} noun={["order", "orders"]} />
    </>
  );
}
