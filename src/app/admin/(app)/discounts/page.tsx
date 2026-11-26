import { Heading, Muted, Row, Tag } from "@/components/admin/ui";
import { adminClient, kr } from "@/lib/admin/sanity";
import { requireAdmin } from "@/lib/admin/session";

type Row_ = { _id: string; code?: string; description?: string; kind?: string; value?: number; freeShipping?: boolean; active?: boolean; uses?: number; maxUses?: number | null; expired?: boolean };

const describe = (d: Row_) =>
  d.kind === "percent" ? `${d.value ?? 0}% off` : d.kind === "amount" ? `${kr(d.value)} off` : "free shipping";

export default async function DiscountsPage() {
  await requireAdmin();
  const codes = await adminClient().fetch<Row_[]>(`*[_type == "discount"] | order(_createdAt desc){ _id, code, description, kind, value, freeShipping, active, uses, maxUses, "expired": defined(endsAt) && endsAt < now() }`);
  return (
    <>
      <div className="flex flex-col gap-[12px]">
        <div className="flex flex-col gap-[12px]">
          <Heading>Discount codes</Heading>
          <Muted>Typed at checkout. The site works out what a code is worth; the customer only sends the code.</Muted>
        </div>
      </div>
      {codes.length === 0 ? (
        <Muted>No codes yet.</Muted>
      ) : (
        <div className="flex flex-col gap-[12px]">
          {codes.map((d) => (
            <Row key={d._id} href={`/admin/discounts/${d._id}`} className="flex-wrap">
              <span className="w-[140px] shrink-0">{d.code}</span>
              <span className="min-w-0 flex-1 truncate">
                {describe(d)}
                {d.freeShipping && d.kind !== "shipping" ? " + free shipping" : ""} <span className="text-black/50">{d.description}</span>
              </span>
              <span className="text-[11px] text-black/50">
                used {d.uses ?? 0}
                {d.maxUses ? ` / ${d.maxUses}` : ""}
              </span>
              {d.expired ? <Tag tone="muted">expired</Tag> : d.active === false ? <Tag tone="muted">off</Tag> : <Tag>active</Tag>}
            </Row>
          ))}
        </div>
      )}
    </>
  );
}
