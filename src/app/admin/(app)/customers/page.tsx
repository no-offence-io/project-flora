import Link from "next/link";
import { Heading, Muted, Tag } from "@/components/admin/ui";
import { adminClient, kr } from "@/lib/admin/sanity";
import { COUNTS_AS_SALE } from "@/lib/order-status";
import { requireAdmin } from "@/lib/admin/session";

type O = { email?: string; name?: string; status?: string; totalOre?: number; orderedAt?: string; origin?: string; demo?: boolean };
type Account = { email?: string };

/**
 * Everyone who has ordered, one row per email address — guests and account holders alike —
 * newest buyer first. Built from the orders themselves, so a customer exists here the moment they buy.
 */
export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireAdmin();
  const { q: rawQ } = await searchParams;
  const q = (rawQ ?? "").trim().toLowerCase().slice(0, 80);
  const [orders, accounts] = await Promise.all([
    adminClient().fetch<O[]>(`*[_type == "order" && defined(customer.email) && customer.email != ""]{ "email": lower(customer.email), "name": customer.name, status, totalOre, orderedAt, "origin": origin.label, demo }`),
    adminClient().fetch<Account[]>(`*[_type == "customer"]{ "email": lower(email) }`),
  ]);
  const registered = new Set(accounts.map((a) => a.email));

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
  const rows = [...byEmail.values()]
    .filter((c) => !q || c.email.includes(q) || c.name.toLowerCase().includes(q))
    .sort((a, b) => b.last.localeCompare(a.last));

  return (
    <>
      <div className="flex flex-col gap-[12px]">
        <Heading>Customers</Heading>
        <Muted>Everyone who has ordered, newest first. Click a name to see their orders, addresses and where they found the shop.</Muted>
      </div>
      <form className="flex gap-[12px]" role="search">
        <input type="search" name="q" defaultValue={rawQ ?? ""} placeholder="Search name or email" aria-label="Search customers" className="min-w-0 flex-1 border border-black/20 bg-transparent p-[12px] font-gotham text-paragraph text-black outline-none placeholder:text-black/50 focus:border-black/60 md:max-w-[420px]" />
        <button className="border border-black px-[18px] font-gotham text-paragraph text-black hover:bg-black hover:text-white transition-colors">Search</button>
      </form>
      {rows.length === 0 ? (
        <Muted>{q ? "No one matches." : "No customers yet."}</Muted>
      ) : (
        <div className="flex flex-col">
          <div className="hidden gap-[12px] border-b border-black/25 px-[12px] pb-[8px] font-gotham text-[11px] text-black/50 md:flex">
            <span className="flex-1">Customer</span>
            <span className="w-[60px] text-right">Orders</span>
            <span className="w-[100px] text-right">Spent</span>
            <span className="w-[90px]">Last order</span>
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
    </>
  );
}
