import { Button, Card, Checkbox, Heading, Muted, Row, Subheading, Tag, TextLink } from "@/components/admin/ui";
import { importStatus } from "@/lib/admin/stripe-import";
import { importStripeHistory, removeStripeHistory } from "./actions";
import { kr } from "@/lib/admin/sanity";
import RangePicker, { type Filter } from "@/components/admin/range-picker";
import ShowMore, { parseShow } from "@/components/admin/show-more";
import { dayKey, instantsOf, parseRange, rangeParams } from "@/lib/admin/reports";
import { getStripe } from "@/lib/stripe";
import { requireAdmin } from "@/lib/admin/session";

const mode = () => (process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_") ? "live" : "test");

/** The import reads a long history page by page; give it room. */
export const maxDuration = 60;

const STATES = [
  { value: "all", label: "All" },
  { value: "paid", label: "Paid" },
  { value: "refunded", label: "Refunded" },
  { value: "open", label: "Not completed" },
] as const;
type Payment = { id: string; amount: number; currency: string; status: string; email: string; order: string; created: number; method: string; refunded: boolean };
const stateOf = (p: Payment) => (p.refunded ? "refunded" : p.status === "succeeded" ? "paid" : "open");
/** Kroner as the rest of the dashboard writes them; other currencies with their code, since they are not kroner. */
const money = (amount: number, currency: string) => (currency === "nok" ? kr(amount) : `${(amount / 100).toFixed(2)} ${currency.toUpperCase()}`);
/** How far back one visit reads from Stripe: three requests of a hundred. */
const MOST = 300;

/** Stripe without leaving the admin: balance, the payments of any period, and a refund a tap away. */
export default async function PaymentsPage({ searchParams }: { searchParams: Promise<{ imported?: string; seen?: string; left?: string; more?: string; removed?: string; error?: string; range?: string; from?: string; to?: string; state?: string; show?: string }> }) {
  await requireAdmin();
  const said = await searchParams;
  const earlier = await importStatus().catch(() => null);
  const today = dayKey(new Date());
  const range = parseRange(said, today, "all");
  const state = STATES.find((x) => x.value === said.state)?.value ?? "all";
  const show = parseShow(said.show);
  let error: string | null = null;
  let balance: { available: number; pending: number } | null = null;
  let payments: Payment[] = [];
  let cutShort = false;
  try {
    const stripe = getStripe();
    const period = range.preset === "all" ? {} : (() => { const { from, before } = instantsOf(range); return { created: { gte: Math.floor(from.getTime() / 1000), lt: Math.floor(before.getTime() / 1000) } }; })();
    const bal = await stripe.balance.retrieve();
    const nok = (rows: { amount: number; currency: string }[]) => rows.filter((r) => r.currency === "nok").reduce((t, r) => t + r.amount, 0);
    balance = { available: nok(bal.available), pending: nok(bal.pending) };
    let after: string | undefined;
    while (payments.length < MOST) {
      const list = await stripe.paymentIntents.list({ limit: 100, ...period, ...(after ? { starting_after: after } : {}), expand: ["data.latest_charge"] });
      for (const pi of list.data) {
        const charge = typeof pi.latest_charge === "object" && pi.latest_charge ? pi.latest_charge : null;
        payments.push({
          id: pi.id,
          amount: pi.amount,
          currency: pi.currency,
          status: pi.status,
          email: pi.receipt_email ?? pi.metadata.customer_email ?? charge?.billing_details?.email ?? "",
          order: pi.metadata.orderNumber ?? "",
          created: pi.created,
          method: charge?.payment_method_details?.type ?? "",
          refunded: Boolean(charge?.refunded),
        });
      }
      after = list.data.at(-1)?.id;
      if (!list.has_more || !after) break;
      // Without a period, the first hundred is plenty for "what came in lately".
      if (range.preset === "all") { cutShort = list.has_more; break; }
      cutShort = payments.length >= MOST;
    }
  } catch (err) {
    error = err instanceof Error ? err.message : "Could not reach Stripe";
  }
  const matching = state === "all" ? payments : payments.filter((p) => stateOf(p) === state);
  const shown = matching.slice(0, show);
  const paidKr = matching.filter((p) => stateOf(p) === "paid" && p.currency === "nok").reduce((t, p) => t + p.amount, 0);
  const paidElsewhere = matching.filter((p) => stateOf(p) === "paid" && p.currency !== "nok").length;
  const filters: Filter[] = [{ name: "state", label: "Which payments", value: state, fallback: "all", options: STATES.map((x) => ({ ...x, count: x.value === "all" ? payments.length : payments.filter((p) => stateOf(p) === x.value).length })) }];
  const address: [string, string][] = [...rangeParams(range), ...(state !== "all" ? [["state", state] as [string, string]] : [])];
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

      {!error && <RangePicker path="/admin/payments" range={range} today={today} all filters={filters} />}

      {!error && (
        <p className="m-0 font-gotham text-paragraph text-black" role="status">
          {matching.length} {matching.length === 1 ? "payment" : "payments"}
          <span className="text-black/50">
            {" "}· {kr(paidKr)} paid{paidElsewhere ? `, and ${paidElsewhere} in other currencies` : ""}
            {cutShort ? (range.preset === "all" ? ". The latest hundred; pick a period to go further back." : `. The latest ${MOST} of this period; the rest is in the Stripe dashboard.`) : ""}
          </span>
        </p>
      )}

      {matching.length === 0 ? (
        !error && <Muted>{range.preset === "all" && state === "all" ? "No payments yet." : "No payments match. Try a longer period, or another choice above."}</Muted>
      ) : (
        <div className="flex flex-col gap-[12px]">
          {shown.map((p) => (
            <Row key={p.id} href={`/admin/payments/${p.id}`} className="flex-wrap">
              <span className="w-[110px] shrink-0">{p.order || <span className="text-black/50">no order</span>}</span>
              <span className="min-w-0 flex-1 truncate text-black/50">{p.email}</span>
              <span className="text-[11px] text-black/50">{new Date(p.created * 1000).toLocaleDateString("nb-NO")}</span>
              <span className="text-[11px] text-black/50">{p.method}</span>
              <Tag tone={p.refunded ? "muted" : p.status === "succeeded" ? "default" : "muted"}>{p.refunded ? "refunded" : p.status === "succeeded" ? "paid" : "not completed"}</Tag>
              <span className="w-[110px] text-right">{money(p.amount, p.currency)}</span>
            </Row>
          ))}
        </div>
      )}
      <ShowMore path="/admin/payments" params={address} shown={shown.length} total={matching.length} noun={["payment", "payments"]} />

      {earlier && (
        <Card id="earlier" className="md:max-w-[640px]">
          <Subheading>Other sales in this Stripe account</Subheading>
          <div className="h-px w-full bg-black/25" />
          <Muted>
            This Stripe account also takes payments that do not come through this shop: the earlier shop's sales, before and since. Importing adds them to Orders, Customers and Reports as
            completed orders marked “from Stripe”, and then keeps them up to date by itself a few times a day. Payments in other currencies come in at the kroner Stripe paid out for them. No emails are sent, no stock is counted, and nothing in Stripe is changed.
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
            {earlier.imported > 0 ? `${earlier.imported} sales from Stripe are in the dashboard.` : "Nothing imported yet."}
            {earlier.lastRunAt ? ` Last run ${new Date(earlier.lastRunAt).toLocaleString("nb-NO", { dateStyle: "short", timeStyle: "short" })}.` : ""}
            {earlier.wanted && !earlier.done ? " The rest is being fetched in the background, a stretch every ten minutes; nothing more to press." : ""}
          </Muted>
          {earlier.lastError && (
            <p className="m-0 font-gotham text-paragraph text-[#b00020]" role="alert">
              The last run stopped: {earlier.lastError}
            </p>
          )}
          <form action={importStripeHistory}>
            <Button>{earlier.wanted && !earlier.done ? "Fetch the next stretch now" : earlier.imported > 0 ? "Look for new ones now" : "Import sales from Stripe"}</Button>
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
