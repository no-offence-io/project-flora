import { Bars, Delta } from "@/components/admin/charts";
import LiveVisitors from "@/components/admin/live-visitors";
import { Card, Heading, Muted, Row, Subheading, Tag, TextLink } from "@/components/admin/ui";
import { liveOrReason } from "@/lib/admin/analytics";
import { getText } from "@/lib/admin/localized";
import { loadReportOrders } from "@/lib/admin/report-data";
import RangePicker, { type Filter } from "@/components/admin/range-picker";
import { byDay, byMonth, bySource, change, dayKey, daysBetween, inRange, parseRange, parseSource, previousRange, rangeParams, SOURCES, summarise, yearBefore } from "@/lib/admin/reports";
import { adminClient, kr } from "@/lib/admin/sanity";
import { requireAdmin } from "@/lib/admin/session";

type Stats = {
  toPack: number;
  latest: { _id: string; orderNumber?: string; status?: string; totalOre?: number; orderedAt?: string; name?: string }[];
  lowStock: { _id: string; name?: { _key: string; value?: string }[]; stock?: number }[];
};

export default async function AdminDashboard({ searchParams }: { searchParams: Promise<{ range?: string; from?: string; to?: string; source?: string }> }) {
  await requireAdmin();
  const params = await searchParams;
  const [s, { orders: everyOrder }, live] = await Promise.all([
    adminClient().fetch<Stats>(
      `{
      "toPack": count(*[_type == "order" && status == "paid"]),
      "latest": *[_type == "order"] | order(orderedAt desc)[0...6]{_id, orderNumber, status, totalOre, orderedAt, "name": customer.name},
      "lowStock": *[_type == "product" && visible != false && trackStock != false && sizing != "sizes" && stock <= 3] | order(stock asc)[0...6]{_id, name, stock}
    }`,
    ),
    loadReportOrders(),
    liveOrReason(),
  ]);

  // Sales figures from the same arithmetic as the Reports page (Oslo days, refunds taken off, gifts left out),
  // for the period and the sales chosen at the top. Thirty days of everything unless asked otherwise.
  const today = dayKey(new Date());
  const range = parseRange(params, today, "30d");
  const source = parseSource(params.source);
  const orders = bySource(everyOrder, source);
  const before = previousRange(range);
  const now = summarise(inRange(orders, range));
  const prev = summarise(inRange(orders, before));
  const days = daysBetween(range.from, range.to);
  const against = days === 1 ? "the day before" : `the ${days} days before`;
  // Day by day while that is readable, month by month beyond two months (as on Reports).
  const daily = days <= 62;
  const current = daily ? byDay(orders, range) : byMonth(orders, range);
  const compare = daily ? byDay(orders, before) : byMonth(orders, yearBefore(range));
  const filters: Filter[] = [{ name: "source", label: "Which sales", value: source, fallback: "all", options: SOURCES.map((x) => ({ value: x.key, label: x.label })) }];
  const reportsHref = `/admin/reports?${new URLSearchParams([...rangeParams(range), ...(source !== "all" ? [["source", source]] : [])]).toString()}`;

  return (
    <>
      <div className="flex flex-col gap-[12px]">
        <Heading>Dashboard</Heading>
        <Muted>{new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</Muted>
      </div>

      <RangePicker path="/admin" range={range} today={today} filters={filters} />

      <div className="grid gap-[12px] md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:gap-[24px]">
        <LiveVisitors initial={live} variant="compact" />
        <div className="grid grid-cols-2 gap-[12px] md:gap-[24px]">
          <Stat label={`Net sales · ${range.label}`} value={kr(now.netOre)} sub={orderCount(now.orders)} delta={<Delta pct={change(now.netOre, prev.netOre)} against={against} />} />
          <Stat label="Average order" value={kr(now.averageOre)} sub={`${now.units} ${now.units === 1 ? "piece" : "pieces"} sold`} delta={<Delta pct={change(now.averageOre, prev.averageOre)} against={against} />} />
          <Stat label="Refunded" value={kr(now.refundsOre)} sub={orderCount(now.refundedOrders)} />
          <Stat label="To be packed, right now" value={String(s.toPack)} sub={s.toPack === 1 ? "order" : "orders"} />
        </div>
      </div>

      <Card>
        <div className="flex flex-wrap items-baseline justify-between gap-[12px]">
          <Subheading>{daily ? "Sales per day" : "Sales per month"} · {range.label}</Subheading>
          <TextLink href={reportsHref}>Full report for this period</TextLink>
        </div>
        <div className="h-px w-full bg-black/25" />
        <Bars
          label={`Net sales ${daily ? "per day" : "per month"}, ${range.label}`}
          unit="money"
          height={180}
          labelRoom={daily ? 6 : 12}
          labels={current.map((p) => p.label)}
          details={current.map((p, i) => (daily ? `${p.label} (before: ${compare[i]?.label ?? "–"})` : p.label))}
          series={[
            { name: daily ? `The ${days === 1 ? "day" : `${days} days`} before` : "Same months a year earlier", short: daily ? "Before" : "A year earlier", tone: "ghost", values: current.map((_, i) => compare[i]?.netOre ?? 0) },
            { name: "This period", tone: "ink", values: current.map((p) => p.netOre) },
          ]}
        />
      </Card>

      <div className="grid gap-[42px] md:grid-cols-2 md:gap-[42px]">
        <Card>
          <div className="flex items-center justify-between">
            <Subheading>Latest orders</Subheading>
            <TextLink href="/admin/orders">All orders</TextLink>
          </div>
          <div className="h-px w-full bg-black/25" />
          {s.latest.length === 0 ? (
            <Muted>No orders yet. They appear here by themselves when someone pays.</Muted>
          ) : (
            <div className="flex flex-col gap-[12px]">
              {s.latest.map((o) => (
                <Row key={o._id} href={`/admin/orders/${o._id}`}>
                  <span className="flex-1 truncate">
                    {o.orderNumber} · {o.name}
                  </span>
                  <Tag tone={o.status === "paid" ? "default" : "muted"}>{o.status}</Tag>
                  <span>{kr(o.totalOre)}</span>
                </Row>
              ))}
            </div>
          )}
        </Card>

        <div className="flex flex-col gap-[42px]">
          <Card>
            <Subheading>Edit the site</Subheading>
            <div className="h-px w-full bg-black/25" />
            <div className="grid grid-cols-2 gap-[12px]">
              <Row href="/admin/products">Products</Row>
              <Row href="/admin/pages/front-page">Front page</Row>
              <Row href="/admin/pages/faq">FAQ</Row>
              <Row href="/admin/pages/policies/terms">Policy pages</Row>
              <Row href="/admin/settings">Site settings</Row>
              <Row href="https://www.prosjectflora.com">Open the shop</Row>
            </div>
            <Muted>Every text has an English and a Norsk box. Leave Norsk empty and the site shows the English one.</Muted>
          </Card>

          <Card>
            <Subheading>Low stock</Subheading>
            <div className="h-px w-full bg-black/25" />
            {s.lowStock.length === 0 ? (
              <Muted>Nothing is running out.</Muted>
            ) : (
              <div className="flex flex-col gap-[12px]">
                {s.lowStock.map((p) => (
                  <Row key={p._id} href={`/admin/products/${p._id}`}>
                    <span className="flex-1">{getText(p.name, "en") || "Product"}</span>
                    <Tag>{p.stock ?? 0} left</Tag>
                  </Row>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

const orderCount = (n: number) => `${n} ${n === 1 ? "order" : "orders"}`;

function Stat({ label, value, sub, delta }: { label: string; value: string; sub: string; delta?: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-[10px] bg-[#fafbfc] p-[12px] font-gotham text-black md:p-[24px]">
      <span className="text-[11px] leading-normal text-black/50">{label}</span>
      <span className="font-americana text-big-header-mobile">{value}</span>
      <span className="flex flex-col gap-[2px]">
        <span className="text-[11px] leading-normal text-black/50">{sub}</span>
        {delta}
      </span>
    </div>
  );
}
