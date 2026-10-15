import { Card, Heading, Muted, Row, Subheading, Tag, TextLink } from "@/components/admin/ui";
import { getText } from "@/lib/admin/localized";
import { adminClient, kr } from "@/lib/admin/sanity";

type Stats = {
  today: { totalOre: number }[];
  week: { totalOre: number }[];
  month: { totalOre: number }[];
  toPack: number;
  latest: { _id: string; orderNumber?: string; status?: string; totalOre?: number; orderedAt?: string; name?: string }[];
  lowStock: { _id: string; name?: { _key: string; value?: string }[]; stock?: number }[];
};

const startOf = (daysBack: number) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - daysBack);
  return d.toISOString();
};
const sum = (rows: { totalOre: number }[]) => rows.reduce((t, r) => t + (r.totalOre ?? 0), 0);

export default async function AdminDashboard() {
  const s = await adminClient().fetch<Stats>(
    `{
      "today": *[_type == "order" && orderedAt >= $today]{totalOre},
      "week":  *[_type == "order" && orderedAt >= $week]{totalOre},
      "month": *[_type == "order" && orderedAt >= $month]{totalOre},
      "toPack": count(*[_type == "order" && status == "paid"]),
      "latest": *[_type == "order"] | order(orderedAt desc)[0...6]{_id, orderNumber, status, totalOre, orderedAt, "name": customer.name},
      "lowStock": *[_type == "product" && visible != false && stock <= 3] | order(stock asc)[0...6]{_id, name, stock}
    }`,
    { today: startOf(0), week: startOf(7), month: startOf(30) },
  );

  return (
    <>
      <div className="flex flex-col gap-[12px]">
        <Heading>Dashboard</Heading>
        <Muted>{new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</Muted>
      </div>

      <div className="grid grid-cols-2 gap-[12px] md:grid-cols-4 md:gap-[24px]">
        <Stat label="Today" value={kr(sum(s.today))} sub={`${s.today.length} orders`} />
        <Stat label="Last 7 days" value={kr(sum(s.week))} sub={`${s.week.length} orders`} />
        <Stat label="Last 30 days" value={kr(sum(s.month))} sub={`${s.month.length} orders`} />
        <Stat label="To be packed" value={String(s.toPack)} sub={s.toPack === 1 ? "order" : "orders"} />
      </div>

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

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="flex flex-col gap-[12px] bg-[#fafbfc] p-[24px] font-gotham text-black">
      <span className="text-[11px] leading-normal text-black/50">{label}</span>
      <span className="font-americana text-big-header-mobile">{value}</span>
      <span className="text-[11px] leading-normal text-black/50">{sub}</span>
    </div>
  );
}
