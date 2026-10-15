import { Heading, Muted, Row, Tag } from "@/components/admin/ui";
import { adminClient, kr } from "@/lib/admin/sanity";

type OrderRow = { _id: string; orderNumber?: string; status?: string; totalOre?: number; orderedAt?: string; name?: string; email?: string };

export default async function OrdersPage() {
  const orders = await adminClient().fetch<OrderRow[]>(
    `*[_type == "order"] | order(orderedAt desc)[0...200]{_id, orderNumber, status, totalOre, orderedAt, "name": customer.name, "email": customer.email}`,
  );
  return (
    <>
      <div className="flex flex-col gap-[12px]">
        <Heading>Orders</Heading>
        <Muted>Newest first. Orders are created automatically when a payment goes through; you can&apos;t add one by hand.</Muted>
      </div>
      {orders.length === 0 ? (
        <Muted>No orders yet.</Muted>
      ) : (
        <div className="flex flex-col gap-[12px]">
          {orders.map((o) => (
            <Row key={o._id} href={`/admin/orders/${o._id}`} className="flex-wrap">
              <span className="w-[110px] shrink-0">{o.orderNumber}</span>
              <span className="min-w-0 flex-1 truncate">
                {o.name} <span className="text-black/50">{o.email}</span>
              </span>
              <span className="text-[11px] text-black/50">{o.orderedAt ? new Date(o.orderedAt).toLocaleDateString("nb-NO") : ""}</span>
              <Tag tone={o.status === "paid" ? "default" : "muted"}>{o.status}</Tag>
              <span className="w-[90px] text-right">{kr(o.totalOre)}</span>
            </Row>
          ))}
        </div>
      )}
    </>
  );
}
