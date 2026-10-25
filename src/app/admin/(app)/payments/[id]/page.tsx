import { notFound } from "next/navigation";
import { refundPayment } from "../actions";
import { Button, Card, Checkbox, Heading, Muted, Subheading, Tag, TextLink } from "@/components/admin/ui";
import { adminClient, kr } from "@/lib/admin/sanity";
import { getStripe } from "@/lib/stripe";

export default async function PaymentPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ refunded?: string; error?: string }> }) {
  const { id } = await params;
  const { refunded, error } = await searchParams;
  if (!/^pi_[A-Za-z0-9]+$/.test(id)) notFound();
  const stripe = getStripe();
  const pi = await stripe.paymentIntents.retrieve(id, { expand: ["latest_charge"] }).catch(() => null);
  if (!pi) notFound();
  const charge = typeof pi.latest_charge === "object" && pi.latest_charge ? pi.latest_charge : null;
  const alreadyRefunded = Boolean(charge?.refunded) || (charge?.amount_refunded ?? 0) > 0;
  const orderId = `order-${pi.id}`;
  const order = await adminClient().fetch<{ orderNumber?: string; status?: string } | null>(`*[_id == $id][0]{ orderNumber, status }`, { id: orderId });
  const live = process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_");

  return (
    <>
      <div className="flex flex-col gap-[12px]">
        <TextLink href="/admin/payments">← Payments</TextLink>
        <div className="flex items-center gap-[12px]">
          <Heading>{kr(pi.amount)}</Heading>
          <Tag tone={alreadyRefunded ? "muted" : "default"}>{alreadyRefunded ? "refunded" : pi.status.replace(/_/g, " ")}</Tag>
        </div>
        <Muted>
          {new Date(pi.created * 1000).toLocaleString("nb-NO", { dateStyle: "long", timeStyle: "short" })}
          {charge?.payment_method_details?.type ? ` · ${charge.payment_method_details.type}` : ""}
          {pi.receipt_email ? ` · ${pi.receipt_email}` : ""}
        </Muted>
        {refunded && <Muted>Refunded. The customer sees it on their statement within 5–10 days.</Muted>}
        {error && (
          <p className="m-0 font-gotham text-paragraph text-[#b00020]" role="alert">
            {error}
          </p>
        )}
      </div>

      <div className="grid gap-[42px] md:max-w-[860px] md:grid-cols-2">
        <Card>
          <Subheading>Details</Subheading>
          <div className="h-px w-full bg-black/25" />
          <ul className="m-0 flex list-none flex-col gap-[5px] p-0 text-[11px] leading-normal">
            <li>
              Order: {order ? <TextLink href={`/admin/orders/${orderId}`}>{order.orderNumber}</TextLink> : <span className="text-black/50">none recorded</span>}
              {order?.status ? <span className="text-black/50"> · {order.status}</span> : null}
            </li>
            <li className="text-black/50">Stripe id: {pi.id}</li>
            {charge?.amount_refunded ? <li className="text-black/50">Refunded so far: {kr(charge.amount_refunded)}</li> : null}
            <li>
              <TextLink href={`https://dashboard.stripe.com${live ? "" : "/test"}/payments/${pi.id}`}>Open in Stripe</TextLink>
            </li>
          </ul>
        </Card>

        <Card>
          <Subheading>Refund</Subheading>
          <div className="h-px w-full bg-black/25" />
          {alreadyRefunded ? (
            <Muted>This payment has been refunded.</Muted>
          ) : pi.status !== "succeeded" ? (
            <Muted>Only a successful payment can be refunded.</Muted>
          ) : (
            <form action={refundPayment} className="flex flex-col gap-[24px]">
              <input type="hidden" name="id" value={pi.id} />
              <Muted>Refunds the full {kr(pi.amount)} to the card or account it was paid from. Partial refunds are done in Stripe.</Muted>
              <Checkbox name="sure" label={`Yes, refund ${kr(pi.amount)}`} />
              <Button>Refund</Button>
            </form>
          )}
        </Card>
      </div>
    </>
  );
}
