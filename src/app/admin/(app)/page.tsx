import { Bars, Delta } from "@/components/admin/charts";
import LiveVisitors from "@/components/admin/live-visitors";
import { Card, Heading, Muted, Row, Subheading, Tag, TextLink } from "@/components/admin/ui";
import { liveOrReason } from "@/lib/admin/analytics";
import { getText } from "@/lib/admin/localized";
import { loadReportOrders } from "@/lib/admin/report-data";
import { byDay, change, dayKey, inRange, presetRange, previousRange, summarise } from "@/lib/admin/reports";
import { adminClient, kr } from "@/lib/admin/sanity";

type Stats = {
  toPack: number;
  latest: { _id: string; orderNumber?: string; status?: string; totalOre?: number; orderedAt?: string; name?: string }[];
  lowStock: { _id: string; name?: { _key: string; value?: string }[]; stock?: number }[];
};

export default async function AdminDashboard() {
  const [s, { orders }, live] = await Promise.all([
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

  // Sales figures from the same arithmetic as the Reports page (Oslo days, refunds taken off, gifts left out).
  const today = dayKey(new Date());
  const figure = (preset: "today" | "7d" | "30d") => {
    const range = presetRange(preset, today);
    return { now: summarise(inRange(orders, range)), before: summarise(inRange(orders, previousRange(range))) };
  };
  const day = figure("today");
  const week = figure("7d");
  const month = figure("30d");
  const last30 = presetRange("30d", today);
  const daily = byDay(orders, last30);
  const dailyBefore = byDay(orders, previousRange(last30));

  return (
    <>
      <div className="flex flex-col gap-[12px]">
        <Heading>Dashboard</Heading>
        <Muted>{new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</Muted>
      </div>

      <div className="grid gap-[12px] md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:gap-[24px]">
        <LiveVisitors initial={live} variant="compact" />
        <div className="grid grid-cols-2 gap-[12px] md:gap-[24px]">
          <Stat label="Today" value={kr(day.now.netOre)} sub={orderCount(day.now.orders)} delta={<Delta pct={change(day.now.netOre, day.before.netOre)} against="yesterday" />} />
          <Stat label="Last 7 days" value={kr(week.now.netOre)} sub={orderCount(week.now.orders)} delta={<Delta pct={change(week.now.netOre, week.before.netOre)} against="the 7 before" />} />
          <Stat label="Last 30 days" value={kr(month.now.netOre)} sub={orderCount(month.now.orders)} delta={<Delta pct={change(month.now.netOre, month.before.netOre)} against="the 30 before" />} />
          <Stat label="To be packed" value={String(s.toPack)} sub={s.toPack === 1 ? "order" : "orders"} />
        </div>
      </div>

      <Card>
        <div className="flex flex-wrap items-baseline justify-between gap-[12px]">
          <Subheading>Sales, last 30 days</Subheading>
          <TextLink href="/admin/reports">All reports</TextLink>
        </div>
        <div className="h-px w-full bg-black/25" />
        <Bars
          label="Net sales per day, the last 30 days beside the 30 before"
          unit="money"
          height={180}
          labelRoom={6}
          labels={daily.map((d) => d.label)}
          series={[
            { name: "The 30 days before", tone: "ghost", values: dailyBefore.map((d) => d.netOre) },
            { name: "Last 30 days", tone: "ink", values: daily.map((d) => d.netOre) },
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
