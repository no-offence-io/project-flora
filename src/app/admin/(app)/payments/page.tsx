import { Card, Heading, Muted, Row, Subheading, Tag, TextLink } from "@/components/admin/ui";
import { kr } from "@/lib/admin/sanity";
import { getStripe } from "@/lib/stripe";

const mode = () => (process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_") ? "live" : "test");

/** Stripe without leaving the admin: balance, the latest payments, and a refund a tap away. */
export default async function PaymentsPage() {
  let error: string | null = null;
  let balance: { available: number; pending: number } | null = null;
  let payments: { id: string; amount: number; status: string; email: string; order: string; created: number; method: string; refunded: boolean }[] = [];
  try {
    const stripe = getStripe();
    const [bal, list] = await Promise.all([stripe.balance.retrieve(), stripe.paymentIntents.list({ limit: 40, expand: ["data.latest_charge"] })]);
    const nok = (rows: { amount: number; currency: string }[]) => rows.filter((r) => r.currency === "nok").reduce((t, r) => t + r.amount, 0);
    balance = { available: nok(bal.available), pending: nok(bal.pending) };
    payments = list.data.map((pi) => {
      const charge = typeof pi.latest_charge === "object" && pi.latest_charge ? pi.latest_charge : null;
      return {
        id: pi.id,
        amount: pi.amount,
        status: pi.status,
        email: pi.receipt_email ?? pi.metadata.customer_email ?? "",
        order: pi.metadata.orderNumber ?? "",
        created: pi.created,
        method: charge?.payment_method_details?.type ?? "",
        refunded: Boolean(charge?.refunded),
      };
    });
  } catch (err) {
    error = err instanceof Error ? err.message : "Could not reach Stripe";
  }
  const dash = mode() === "live" ? "https://dashboard.stripe.com" : "https://dashboard.stripe.com/test";

  return (
    <>
      <div className="flex flex-col gap-[12px]">
        <div className="flex items-center gap-[12px]">
          <Heading>Payments</Heading>
          <Tag tone={mode() === "live" ? "default" : "muted"}>{mode()}</Tag>
        </div>
        <Muted>
          Straight from Stripe. Payouts, disputes and the full history live in the{" "}
          <TextLink href={dash}>Stripe dashboard</TextLink>.
        </Muted>
        {error && (
          <p className="m-0 font-gotham text-paragraph text-[#b00020]" role="alert">
            {error}
          </p>
        )}
      </div>

      {balance && (
        <div className="grid grid-cols-2 gap-[12px] md:max-w-[640px] md:gap-[24px]">
          <Card>
            <Muted>Available to pay out</Muted>
            <Subheading className="font-americana text-big-header-mobile">{kr(balance.available)}</Subheading>
          </Card>
          <Card>
            <Muted>On its way (pending)</Muted>
            <Subheading className="font-americana text-big-header-mobile">{kr(balance.pending)}</Subheading>
          </Card>
        </div>
      )}

      {payments.length === 0 ? (
        !error && <Muted>No payments yet.</Muted>
      ) : (
        <div className="flex flex-col gap-[12px]">
          {payments.map((p) => (
            <Row key={p.id} href={`/admin/payments/${p.id}`} className="flex-wrap">
              <span className="w-[110px] shrink-0">{p.order || <span className="text-black/50">no order</span>}</span>
              <span className="min-w-0 flex-1 truncate text-black/50">{p.email}</span>
              <span className="text-[11px] text-black/50">{new Date(p.created * 1000).toLocaleDateString("nb-NO")}</span>
              <span className="text-[11px] text-black/50">{p.method}</span>
              <Tag tone={p.refunded ? "muted" : p.status === "succeeded" ? "default" : "muted"}>{p.refunded ? "refunded" : p.status.replace(/_/g, " ")}</Tag>
              <span className="w-[90px] text-right">{kr(p.amount)}</span>
            </Row>
          ))}
        </div>
      )}
    </>
  );
}
