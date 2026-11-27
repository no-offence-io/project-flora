import Link from "next/link";
import RangePicker, { type Filter } from "@/components/admin/range-picker";
import ShowMore, { parseShow } from "@/components/admin/show-more";
import { Heading, Muted, Tag } from "@/components/admin/ui";
import { bySource, dayKey, parseRange, parseSource, rangeParams, SOURCES } from "@/lib/admin/reports";
import { adminClient, kr } from "@/lib/admin/sanity";
import { COUNTS_AS_SALE } from "@/lib/order-status";
import { requireAdmin } from "@/lib/admin/session";

type O = { email?: string; name?: string; status?: string; totalOre?: number; orderedAt?: string; origin?: string; demo?: boolean; manual?: string | null };
type Account = { email?: string };

const SORTS = [
  { value: "latest", label: "Latest order" },
  { value: "spent", label: "Spent most" },
  { value: "orders", label: "Most orders" },
] as const;

/**
 * Everyone who has ordered, one row per email address, guests and account holders alike. Built from
 * the orders themselves, so a customer exists here the moment they buy. A period or a choice of
 * sales narrows the orders first: the figures on each row are then for that period and those sales.
 */
export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; range?: string; from?: string; to?: string; source?: string; sort?: string; show?: string }> }) {
  await requireAdmin();
  const params = await searchParams;
  const rawQ = params.q;
  const q = (rawQ ?? "").trim().toLowerCase().slice(0, 80);
  const today = dayKey(new Date());
  const range = parseRange(params, today, "all");
  const source = parseSource(params.source);
  const sort = SORTS.find((x) => x.value === params.sort)?.value ?? "latest";
  const show = parseShow(params.show);
  const [everyOrder, accounts] = await Promise.all([
    adminClient().fetch<O[]>(`*[_type == "order" && defined(customer.email) && customer.email != ""]{ "email": lower(customer.email), "name": customer.name, status, totalOre, orderedAt, "origin": origin.label, demo, manual }`),
    adminClient().fetch<Account[]>(`*[_type == "customer"]{ "email": lower(email) }`),
  ]);
  const registered = new Set(accounts.map((a) => a.email));
  const inPeriod = range.preset === "all" ? everyOrder : everyOrder.filter((o) => o.orderedAt && dayKey(o.orderedAt) >= range.from && dayKey(o.orderedAt) <= range.to);
  const orders = bySource(inPeriod, source);

  const byEmail = new Map<string, { email: string; name: string; orders: number; spentOre: number; last: string; first: string; origin?: string; demo: boolean }>();
  for (const o of orders) {
    if (!o.email) continue;
    const c = byEmail.get(o.email) ?? { email: o.email, name: "", orders: 0, spentOre: 0, last: "", first: "9999", demo: false };
    c.orders++;
    if (COUNTS_AS_SALE.includes((o.status ?? "paid") as never)) c.spentOre += o.totalOre ?? 0;
    const at = o.orderedAt ?? "";
    if (at >= c.last) { c.last = at; c.name = o.name || c.name; }
    if (at <= c.first) { c.first = at; c.origin = o.origin ?? c.origin; }
    c.demo ||= Boolean(o.demo);
    byEmail.set(o.email, c);
  }
  const all = [...byEmail.values()]
    .filter((c) => !q || c.email.includes(q) || c.name.toLowerCase().includes(q))
    .sort((a, b) => (sort === "spent" ? b.spentOre - a.spentOre : sort === "orders" ? b.orders - a.orders : 0) || b.last.localeCompare(a.last));
  const rows = all.slice(0, show);
  const spentOre = all.reduce((t, c) => t + c.spentOre, 0);
  const returning = all.filter((c) => c.orders > 1).length;

  const filters: Filter[] = [
    { name: "source", label: "Which sales", value: source, fallback: "all", options: SOURCES.map((x) => ({ value: x.key, label: x.label })) },
    { name: "sort", label: "Order by", value: sort, fallback: "latest", options: SORTS },
  ];
  const address: [string, string][] = [...rangeParams(range), ...(source !== "all" ? [["source", source] as [string, string]] : []), ...(sort !== "latest" ? [["sort", sort] as [string, string]] : []), ...(q ? [["q", q] as [string, string]] : [])];
  const narrowed = Boolean(q || source !== "all" || range.preset !== "all");

  return (
    <>
      <div className="flex flex-col gap-[12px]">
        <Heading>Customers</Heading>
        <Muted>Everyone who has ordered. Click a name to see their orders, addresses and where they found the shop.</Muted>
      </div>

      <RangePicker path="/admin/customers" range={range} today={today} all filters={filters} keep={{ q: q || undefined }} />

      <div className="flex flex-col gap-[12px] md:flex-row md:items-center md:justify-between">
        <form className="flex flex-1 gap-[12px]" role="search">
          {address.filter(([k]) => k !== "q").map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
          <input type="search" name="q" defaultValue={rawQ ?? ""} placeholder="Search name or email" aria-label="Search customers" className="min-w-0 flex-1 border border-black/20 bg-transparent p-[12px] font-gotham text-paragraph text-black outline-none placeholder:text-black/50 focus:border-black/60 md:max-w-[420px]" />
          <button className="border border-black px-[18px] font-gotham text-paragraph text-black hover:bg-black hover:text-white transition-colors">Search</button>
        </form>
        <p className="m-0 font-gotham text-paragraph text-black" role="status">
          {all.length} {all.length === 1 ? "customer" : "customers"} <span className="text-black/50">· {kr(spentOre)} spent · {returning} came back</span>
          {narrowed && (
            <>
              {" "}
              <Link href="/admin/customers" className="text-[11px] text-black/50 underline underline-offset-4 hover:text-black">clear</Link>
            </>
          )}
        </p>
      </div>
      {rows.length === 0 ? (
        <Muted>{narrowed ? "No one matches. Try a longer period, or clear the filters." : "No customers yet."}</Muted>
      ) : (
        <div className="flex flex-col">
          <div className="hidden gap-[12px] border-b border-black/25 px-[12px] pb-[8px] font-gotham text-[11px] text-black/50 md:flex">
            <span className="flex-1">Customer</span>
            <span className="w-[60px] text-right">Orders</span>
            <span className="w-[100px] text-right">Spent</span>
            <span className="w-[90px]">{range.preset === "all" ? "Last order" : "Last in period"}</span>
            <span className="w-[150px]">First came from</span>
          </div>
          {rows.map((c) => (
            <Link key={c.email} href={`/admin/customers/${encodeURIComponent(c.email)}`} className="flex flex-wrap items-center gap-x-[12px] gap-y-[4px] border-b border-black/10 px-[12px] py-[14px] font-gotham text-paragraph text-black transition-colors hover:bg-[#fafbfc] md:flex-nowrap">
              <span className="flex min-w-0 flex-1 basis-full items-baseline gap-[10px] md:basis-0">
                <span className="truncate">{c.name || c.email}</span>
                <span className="truncate text-[11px] text-black/50">{c.email}</span>
                {registered.has(c.email) && <Tag tone="muted">account</Tag>}
                {c.demo && <Tag tone="muted">test</Tag>}
              </span>
              <span className="text-[11px] text-black/50 md:w-[60px] md:text-right md:text-paragraph md:text-black">{c.orders}<span className="md:hidden"> orders</span></span>
              <span className="md:w-[100px] md:text-right">{kr(c.spentOre)}</span>
              <span className="w-[90px] text-[11px] text-black/50">{c.last ? new Date(c.last).toLocaleDateString("nb-NO") : ""}</span>
              <span className="truncate text-[11px] text-black/50 md:w-[150px]">{c.origin ?? ""}</span>
            </Link>
          ))}
        </div>
      )}
      <ShowMore path="/admin/customers" params={address} shown={rows.length} total={all.length} noun={["customer", "customers"]} />
    </>
  );
}
