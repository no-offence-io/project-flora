import { notFound } from "next/navigation";
import { saveOrder, sendShippingEmail } from "../../actions";
import { refundVippsOrder, resendConfirmation } from "../actions";
import { Button, Card, Heading, Input, Labelled, Muted, Row, Select, StatusPill, Subheading, Tag, Textarea, TextLink } from "@/components/admin/ui";
import { adminClient, kr } from "@/lib/admin/sanity";
import { emailConfigured } from "@/lib/notify";
import { COUNTS_AS_SALE, ORDER_STATUSES, paidWith, STATUS_LABEL } from "@/lib/order-status";

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
  vippsReference?: string;
  manual?: string;
  paymentProvider?: string;
  paymentCard?: { brand?: string; last4?: string };
  origin?: { label?: string; device?: string; pageViews?: number; landing?: string; referrer?: string; campaign?: string };
};

const HINT: Record<string, string> = { paid: "to be made", shipped: "on its way", delivered: "arrived" };

const when = (iso?: string) => (iso ? new Date(iso).toLocaleString("nb-NO", { dateStyle: "short", timeStyle: "short" }) : "");

export default async function OrderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; sent?: string; confirmed?: string; refunded?: string; error?: string }> }) {
  const { id } = await params;
  const { saved, sent, confirmed, refunded, error } = await searchParams;
  const o = await adminClient().fetch<Order | null>(`*[_type == "order" && _id == $id][0]`, { id });
  if (!o) notFound();
  const mailReady = emailConfigured();
  const email = o.customer?.email?.toLowerCase();
  const history = email
    ? await adminClient().fetch<{ status?: string; totalOre?: number }[]>(`*[_type == "order" && lower(customer.email) == $email]{ status, totalOre }`, { email })
    : [];
  const sales = history.filter((h) => COUNTS_AS_SALE.includes((h.status ?? "paid") as never));
  const revenue = sales.reduce((s, h) => s + (h.totalOre ?? 0), 0);

  return (
    <>
      <div className="flex flex-col gap-[12px]">
        <TextLink href="/admin/orders">← Orders</TextLink>
        <div className="flex flex-wrap items-center gap-[12px]">
          <Heading>{o.orderNumber}</Heading>
          <StatusPill status={o.status} />
          {o.manual === "pr" && <Tag tone="muted">PR / gift</Tag>}
          {o.manual === "sale" && <Tag tone="muted">added by hand</Tag>}
        </div>
        <Muted>
          {o.orderedAt ? new Date(o.orderedAt).toLocaleString("nb-NO", { dateStyle: "long", timeStyle: "short" }) : ""}
          {o.language ? ` · customer reads ${o.language === "no" ? "Norsk" : "English"}` : ""}
        </Muted>
        {saved && <Muted>Saved.</Muted>}
        {sent && <Muted>Shipping email sent to {o.customer?.email}.</Muted>}
        {confirmed && <Muted>Confirmation email sent to {o.customer?.email}.</Muted>}
        {refunded && <Muted>Refunded in full through Vipps. The customer has the money back within a few days.</Muted>}
        {error && (
          <p className="m-0 font-gotham text-paragraph text-[#b00020]" role="alert">
            {error}
          </p>
        )}
      </div>

      {o.customer?.note && (
        <section className="flex flex-col gap-[12px] border-2 border-black p-[24px] font-gotham text-black">
          <span className="text-[11px] uppercase tracking-[0.2em]">{o.manual ? "Note" : "Note from the customer"}</span>
          <p className="m-0 whitespace-pre-wrap text-[18px] leading-[1.45] md:text-[20px]">{o.customer.note}</p>
        </section>
      )}

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
            {o.vippsReference && o.status !== "refunded" && (
              <form action={refundVippsOrder} className="flex flex-wrap items-center gap-[12px]">
                <input type="hidden" name="id" value={o._id} />
                <label className="flex items-center gap-[8px] text-[11px] text-black/50">
                  <input type="checkbox" name="sure" className="accent-black" /> I&apos;m sure — refund {kr(o.totalOre)} to the customer through Vipps
                </label>
                <Button type="submit">Refund in Vipps</Button>
              </form>
            )}
            {o.vippsReference && <Muted>Vipps reference: {o.vippsReference}</Muted>}
          </Card>

          <Card>
            <Subheading>Customer</Subheading>
            <div className="h-px w-full bg-black/25" />
            <ul className="m-0 flex list-none flex-col gap-[5px] p-0 text-[11px] leading-normal">
              <li>
                {email ? (
                  <TextLink href={`/admin/customers/${encodeURIComponent(email)}`}>{o.customer?.name || email}</TextLink>
                ) : (
                  o.customer?.name
                )}
              </li>
              {o.customer?.email && <li><a href={`mailto:${o.customer.email}`} className="text-black/50 underline">{o.customer.email}</a></li>}
              {o.customer?.phone && <li><a href={`tel:${o.customer.phone.replace(/\s/g, "")}`} className="text-black/50 underline">{o.customer.phone}</a></li>}
              <li className="whitespace-pre-line text-black/50">{o.customer?.address?.split(", ").join("\n")}</li>
              <li className="pt-[6px]">Paid with: <span className="text-black/50">{paidWith(o)}</span></li>
            </ul>
            <ul className="m-0 flex list-none flex-col gap-[5px] p-0 text-[11px] leading-normal text-black/50">
              <li className="flex flex-wrap items-center gap-[8px]">
                <span>Confirmation email: {o.confirmationSentAt ? `sent ${when(o.confirmationSentAt)}` : "not sent"}</span>
                {!o.manual && o.customer?.email && mailReady && (
                  <form action={resendConfirmation}>
                    <input type="hidden" name="id" value={o._id} />
                    <button className="border-[0.5px] border-black px-[8px] py-[2px] text-[11px] text-black hover:bg-black hover:text-white transition-colors">{o.confirmationSentAt ? "Send again" : "Send now"}</button>
                  </form>
                )}
              </li>
              <li>Shipping email: {o.shippingEmailSentAt ? `sent ${when(o.shippingEmailSentAt)}` : "not sent"}</li>
            </ul>
          </Card>

          {email && (
            <Card>
              <Subheading>Customer history</Subheading>
              <div className="h-px w-full bg-black/25" />
              <dl className="m-0 grid grid-cols-3 gap-[12px]">
                <div className="flex flex-col gap-[3px]"><dt className="text-[11px] text-black/50">Orders</dt><dd className="m-0">{history.length}</dd></div>
                <div className="flex flex-col gap-[3px]"><dt className="text-[11px] text-black/50">Spent</dt><dd className="m-0">{kr(revenue)}</dd></div>
                <div className="flex flex-col gap-[3px]"><dt className="text-[11px] text-black/50">Average</dt><dd className="m-0">{kr(sales.length ? Math.round(revenue / sales.length) : 0)}</dd></div>
              </dl>
              <TextLink href={`/admin/customers/${encodeURIComponent(email)}`} className="text-[11px]">See all their orders and details →</TextLink>
            </Card>
          )}

          <Card>
            <Subheading>Came from</Subheading>
            <div className="h-px w-full bg-black/25" />
            {o.origin?.label ? (
              <dl className="m-0 grid grid-cols-2 gap-[12px] text-[11px] leading-normal md:grid-cols-3">
                <div className="flex flex-col gap-[3px]"><dt className="text-black/50">Origin</dt><dd className="m-0">{o.origin.label}</dd></div>
                {o.origin.device && <div className="flex flex-col gap-[3px]"><dt className="text-black/50">Device</dt><dd className="m-0">{o.origin.device}</dd></div>}
                {o.origin.pageViews ? <div className="flex flex-col gap-[3px]"><dt className="text-black/50">Pages viewed</dt><dd className="m-0">{o.origin.pageViews}</dd></div> : null}
                {o.origin.landing && <div className="flex flex-col gap-[3px]"><dt className="text-black/50">First page</dt><dd className="m-0 break-all">{o.origin.landing}</dd></div>}
                {o.origin.referrer && <div className="flex flex-col gap-[3px]"><dt className="text-black/50">Referring site</dt><dd className="m-0 break-all">{o.origin.referrer}</dd></div>}
                {o.origin.campaign && <div className="flex flex-col gap-[3px]"><dt className="text-black/50">Campaign</dt><dd className="m-0">{o.origin.campaign}</dd></div>}
              </dl>
            ) : (
              <Muted className="text-[11px]">Not known — this order was placed before the shop started noting it.</Muted>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-[42px]">
          <Card className="scroll-mt-[24px]" id="send">
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
                  {ORDER_STATUSES.map((v) => (
                    <option key={v} value={v}>{STATUS_LABEL[v]}{HINT[v] ? ` – ${HINT[v]}` : ""}</option>
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
