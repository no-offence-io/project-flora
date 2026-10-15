import { notFound } from "next/navigation";
import { saveOrder } from "../../actions";
import { Button, Card, Heading, Input, Labelled, Muted, Row, Select, Subheading, Textarea, TextLink } from "@/components/admin/ui";
import { adminClient, kr } from "@/lib/admin/sanity";

type Order = {
  _id: string;
  orderNumber?: string;
  status?: string;
  trackingNumber?: string;
  internalNote?: string;
  orderedAt?: string;
  customer?: { name?: string; email?: string; phone?: string; address?: string; note?: string };
  items?: { _key: string; name?: string; quantity?: number; unitPriceOre?: number }[];
  subtotalOre?: number;
  shippingOre?: number;
  vatIncludedOre?: number;
  totalOre?: number;
  stripePaymentIntentId?: string;
};

const STATUSES = [
  ["paid", "Paid – to be packed"],
  ["shipped", "Shipped"],
  ["delivered", "Delivered"],
  ["refunded", "Refunded"],
  ["cancelled", "Cancelled"],
];

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const o = await adminClient().fetch<Order | null>(`*[_type == "order" && _id == $id][0]`, { id });
  if (!o) notFound();

  return (
    <>
      <div className="flex flex-col gap-[12px]">
        <TextLink href="/admin/orders">← Orders</TextLink>
        <Heading>{o.orderNumber}</Heading>
        <Muted>{o.orderedAt ? new Date(o.orderedAt).toLocaleString("nb-NO", { dateStyle: "long", timeStyle: "short" }) : ""}</Muted>
      </div>

      <div className="grid gap-[42px] md:grid-cols-2">
        <div className="flex flex-col gap-[42px]">
          <Card>
            <Subheading>Items</Subheading>
            <div className="h-px w-full bg-black/25" />
            <div className="flex flex-col gap-[12px]">
              {(o.items ?? []).map((it) => (
                <Row key={it._key}>
                  <span className="flex-1">
                    {it.name} × {it.quantity}
                  </span>
                  <span>{kr((it.unitPriceOre ?? 0) * (it.quantity ?? 0))}</span>
                </Row>
              ))}
            </div>
            <dl className="m-0 flex flex-col gap-[12px] bg-[#fafbfc] p-[24px]">
              <div className="flex justify-between"><dt>Subtotal</dt><dd className="m-0">{kr(o.subtotalOre)}</dd></div>
              <div className="flex justify-between text-[11px] text-black/50"><dt>Shipping</dt><dd className="m-0">{o.shippingOre ? kr(o.shippingOre) : "Free"}</dd></div>
              <div className="flex justify-between text-[11px] text-black/50"><dt>VAT 25% (included)</dt><dd className="m-0">{kr(o.vatIncludedOre)}</dd></div>
              <div className="h-px w-full bg-black/25" />
              <div className="flex justify-between"><dt>Total</dt><dd className="m-0">{kr(o.totalOre)}</dd></div>
            </dl>
            {o.stripePaymentIntentId && (
              <Muted>
                Refunds are done in Stripe:{" "}
                <a href={`https://dashboard.stripe.com/payments/${o.stripePaymentIntentId}`} target="_blank" rel="noreferrer" className="text-black underline">
                  open this payment
                </a>
              </Muted>
            )}
          </Card>

          <Card>
            <Subheading>Customer</Subheading>
            <div className="h-px w-full bg-black/25" />
            <ul className="m-0 flex list-none flex-col gap-[5px] p-0 text-[11px] leading-normal">
              <li>{o.customer?.name}</li>
              <li className="text-black/50">{o.customer?.email}</li>
              <li className="text-black/50">{o.customer?.phone}</li>
              <li className="text-black/50">{o.customer?.address}</li>
              {o.customer?.note && <li>Note: <span className="text-black/50">{o.customer.note}</span></li>}
            </ul>
          </Card>
        </div>

        <Card>
          <Subheading>Fulfilment</Subheading>
          <div className="h-px w-full bg-black/25" />
          <form action={saveOrder} className="flex flex-col gap-[24px]">
            <input type="hidden" name="id" value={o._id} />
            <Labelled label="Status">
              <Select name="status" defaultValue={o.status ?? "paid"}>
                {STATUSES.map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </Select>
            </Labelled>
            <Labelled label="Tracking number" hint="Marking the order as shipped with a tracking number sends the customer a notification once email is set up.">
              <Input name="trackingNumber" defaultValue={o.trackingNumber ?? ""} />
            </Labelled>
            <Labelled label="Internal note" hint="Only you see this.">
              <Textarea name="internalNote" defaultValue={o.internalNote ?? ""} rows={3} />
            </Labelled>
            <Button>Save</Button>
          </form>
        </Card>
      </div>
    </>
  );
}
