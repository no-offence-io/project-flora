import { Button, Card, Checkbox, Heading, Muted, Row, Subheading, Tag, TextLink } from "@/components/admin/ui";
import { importStatus } from "@/lib/admin/stripe-import";
import { importStripeHistory, removeStripeHistory } from "./actions";
import { kr } from "@/lib/admin/sanity";
import { getStripe } from "@/lib/stripe";
import { requireAdmin } from "@/lib/admin/session";

const mode = () => (process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_") ? "live" : "test");

/** The import reads a long history page by page; give it room. */
export const maxDuration = 60;

/** Stripe without leaving the admin: balance, the latest payments, and a refund a tap away. */
export default async function PaymentsPage({ searchParams }: { searchParams: Promise<{ imported?: string; seen?: string; left?: string; more?: string; removed?: string; error?: string }> }) {
  await requireAdmin();
  const said = await searchParams;
  const earlier = await importStatus().catch(() => null);
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
        {said.error && (
          <p className="m-0 font-gotham text-paragraph text-[#b00020]" role="alert">
            {said.error}
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

      {earlier && (
        <Card id="earlier" className="md:max-w-[640px]">
          <Subheading>Sales from before this shop</Subheading>
          <div className="h-px w-full bg-black/25" />
          <Muted>
            This Stripe account is older than the shop, so its earlier sales are in Stripe and nowhere else. Importing adds them to Orders, Customers and Reports as completed orders marked
            “earlier shop”. Payments in other currencies come in at the kroner Stripe paid out for them. No emails are sent, no stock is counted, and nothing in Stripe is changed.
          </Muted>
          {said.imported !== undefined && (
            <p className="m-0 font-gotham text-paragraph text-black" role="status">
              {Number(said.imported)} added from {Number(said.seen)} payments looked at{Number(said.left) > 0 ? `, ${Number(said.left)} left out (never paid, never converted to kroner, or this shop's own)` : ""}.{" "}
              {said.more === "1" ? "There is more; it carries on by itself in the background." : "That is all of it."}
            </p>
          )}
          {said.removed !== undefined && (
            <p className="m-0 font-gotham text-paragraph text-black" role="status">
              {Number(said.removed)} imported sales removed.
            </p>
          )}
          <Muted>
            {earlier.imported > 0 ? `${earlier.imported} earlier sales are in the dashboard.` : "Nothing imported yet."}
            {earlier.lastRunAt ? ` Last run ${new Date(earlier.lastRunAt).toLocaleString("nb-NO", { dateStyle: "short", timeStyle: "short" })}.` : ""}
            {earlier.wanted && !earlier.done ? " The rest is being fetched in the background, a stretch every ten minutes; nothing more to press." : ""}
          </Muted>
          {earlier.lastError && (
            <p className="m-0 font-gotham text-paragraph text-[#b00020]" role="alert">
              The last run stopped: {earlier.lastError}
            </p>
          )}
          <form action={importStripeHistory}>
            <Button>{earlier.wanted && !earlier.done ? "Fetch the next stretch now" : earlier.imported > 0 ? "Look for more" : "Import earlier sales"}</Button>
          </form>
          {earlier.imported > 0 && (
            <form action={removeStripeHistory} className="flex flex-col gap-[12px] border-t border-black/10 pt-[18px]">
              <Checkbox name="sure" label={`Yes, remove the ${earlier.imported} imported sales from the dashboard`} />
              <Button className="self-start">Remove imported sales</Button>
            </form>
          )}
        </Card>
      )}
    </>
  );
}
