import { notFound } from "next/navigation";
import { saveOrder, sendShippingEmail } from "../../actions";
import { Button, Card, Heading, Input, Labelled, Muted, Row, Select, Subheading, Textarea, TextLink } from "@/components/admin/ui";
import { adminClient, kr } from "@/lib/admin/sanity";
import { emailConfigured } from "@/lib/notify";

type Order = {
  _id: string;
  orderNumber?: string;
  status?: string;
  trackingNumber?: string;
  internalNote?: string;
  orderedAt?: string;
  language?: string;
  confirmationSentAt?: string;
  shippingEmailSentAt?: string;
  customer?: { name?: string; email?: string; phone?: string; address?: string; note?: string };
  items?: { _key: string; name?: string; quantity?: number; unitPriceOre?: number; size?: string; measurements?: { _key: string; label?: string; value?: string }[] }[];
  subtotalOre?: number;
  discountCode?: string;
  discountOre?: number;
  shippingOre?: number;
  vatIncludedOre?: number;
  totalOre?: number;
  stripePaymentIntentId?: string;
};

const STATUSES = [
  ["paid", "Paid – to be made"],
  ["shipped", "Shipped"],
  ["delivered", "Delivered"],
  ["refunded", "Refunded"],
  ["cancelled", "Cancelled"],
];

const when = (iso?: string) => (iso ? new Date(iso).toLocaleString("nb-NO", { dateStyle: "short", timeStyle: "short" }) : "");

export default async function OrderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; sent?: string; error?: string }> }) {
  const { id } = await params;
  const { saved, sent, error } = await searchParams;
  const o = await adminClient().fetch<Order | null>(`*[_type == "order" && _id == $id][0]`, { id });
  if (!o) notFound();
  const mailReady = emailConfigured();

  return (
    <>
      <div className="flex flex-col gap-[12px]">
        <TextLink href="/admin/orders">← Orders</TextLink>
        <Heading>{o.orderNumber}</Heading>
        <Muted>
          {o.orderedAt ? new Date(o.orderedAt).toLocaleString("nb-NO", { dateStyle: "long", timeStyle: "short" }) : ""}
          {o.language ? ` · customer reads ${o.language === "no" ? "Norsk" : "English"}` : ""}
        </Muted>
        {saved && <Muted>Saved.</Muted>}
        {sent && <Muted>Shipping email sent to {o.customer?.email}.</Muted>}
        {error && (
          <p className="m-0 font-gotham text-paragraph text-[#b00020]" role="alert">
            {error}
          </p>
        )}
      </div>

      <div className="grid gap-[42px] md:grid-cols-2">
        <div className="flex flex-col gap-[42px]">
          <Card>
            <Subheading>Items</Subheading>
            <div className="h-px w-full bg-black/25" />
            <div className="flex flex-col gap-[12px]">
              {(o.items ?? []).map((it) => (
                <Row key={it._key} className="items-start">
                  <span className="flex min-w-0 flex-1 flex-col gap-[5px]">
                    <span>
                      {it.name}
                      {it.size ? ` – ${it.size}` : ""} × {it.quantity}
                    </span>
                    {it.measurements && it.measurements.length > 0 && (
                      <span className="flex flex-col gap-[5px] text-[11px] leading-normal">
                        {it.measurements.map((m) => (
                          <span key={m._key}>
                            {m.label}: <span className="text-black/50">{m.value} cm</span>
                          </span>
                        ))}
                      </span>
                    )}
                  </span>
                  <span>{kr((it.unitPriceOre ?? 0) * (it.quantity ?? 0))}</span>
                </Row>
              ))}
            </div>
            <dl className="m-0 flex flex-col gap-[12px] bg-[#fafbfc] p-[24px]">
              <div className="flex justify-between"><dt>Subtotal</dt><dd className="m-0">{kr(o.subtotalOre)}</dd></div>
              {o.discountOre ? (
                <div className="flex justify-between text-[11px] text-black/50"><dt>Discount {o.discountCode ? `(${o.discountCode})` : ""}</dt><dd className="m-0">−{kr(o.discountOre)}</dd></div>
              ) : null}
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
            <ul className="m-0 flex list-none flex-col gap-[5px] p-0 text-[11px] leading-normal text-black/50">
              <li>Confirmation email: {o.confirmationSentAt ? `sent ${when(o.confirmationSentAt)}` : "not sent"}</li>
              <li>Shipping email: {o.shippingEmailSentAt ? `sent ${when(o.shippingEmailSentAt)}` : "not sent"}</li>
            </ul>
          </Card>
        </div>

        <div className="flex flex-col gap-[42px]">
          <Card>
            <Subheading>Send</Subheading>
            <div className="h-px w-full bg-black/25" />
            <form action={sendShippingEmail} className="flex flex-col gap-[24px]">
              <input type="hidden" name="id" value={o._id} />
              <Labelled label="Tracking number" hint="Paste the number from Posten/Bring. Pressing Send marks the order as shipped and emails the customer, with a tracking link.">
                <Input name="trackingNumber" defaultValue={o.trackingNumber ?? ""} />
              </Labelled>
              {mailReady ? (
                <Button>{o.shippingEmailSentAt ? "Send again" : "Send"}</Button>
              ) : (
                <Muted>
                  Email isn&apos;t connected yet, so this button can&apos;t send. <TextLink href="/admin/setup">Set it up</TextLink> — one key.
                </Muted>
              )}
            </form>
          </Card>

          <Card>
            <Subheading>Fulfilment</Subheading>
            <div className="h-px w-full bg-black/25" />
            <form action={saveOrder} className="flex flex-col gap-[24px]">
              <input type="hidden" name="id" value={o._id} />
              <input type="hidden" name="trackingNumber" value={o.trackingNumber ?? ""} />
              <Labelled label="Status">
                <Select name="status" defaultValue={o.status ?? "paid"}>
                  {STATUSES.map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </Select>
              </Labelled>
              <Labelled label="Internal note" hint="Only you see this.">
                <Textarea name="internalNote" defaultValue={o.internalNote ?? ""} rows={3} />
              </Labelled>
              <Button>Save</Button>
            </form>
          </Card>
        </div>
      </div>
    </>
  );
}
