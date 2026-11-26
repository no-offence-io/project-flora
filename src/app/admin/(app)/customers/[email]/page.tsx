import Link from "next/link";
import { variantLabel } from "@/lib/variant";
import { notFound } from "next/navigation";
import OrderPreview, { type PreviewOrder } from "@/components/admin/order-preview";
import { Card, Heading, Muted, StatusPill, Subheading, Tag, TextLink } from "@/components/admin/ui";
import { adminClient, kr } from "@/lib/admin/sanity";
import { COUNTS_AS_SALE, paidWith } from "@/lib/order-status";
import { requireAdmin } from "@/lib/admin/session";

type O = PreviewOrder & { demo?: boolean; trackingNumber?: string; language?: string; origin?: PreviewOrder["origin"] & { landing?: string; referrer?: string } };
type Account = { firstName?: string; lastName?: string; phonePrefix?: string; phone?: string; street?: string; apartment?: string; postcode?: string; city?: string; country?: string; measurements?: { _key: string; label?: string; value?: string }[]; createdAt?: string; lastSignInAt?: string; stripeCustomerId?: string };

const date = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("nb-NO", { day: "numeric", month: "long", year: "numeric" }) : "");

/** One customer: every order they've placed, every address they've used, and how they found the shop. */
export default async function CustomerPage({ params }: { params: Promise<{ email: string }> }) {
  await requireAdmin();
  const { email: raw } = await params;
  let email: string;
  try {
    email = decodeURIComponent(raw).trim().toLowerCase();
  } catch {
    notFound();
  }
  const [orders, account] = await Promise.all([
    adminClient().fetch<O[]>(
      `*[_type == "order" && lower(customer.email) == $email] | order(orderedAt desc){ _id, demo, manual, orderNumber, status, totalOre, shippingOre, orderedAt, customer, paymentProvider, paymentCard, origin, trackingNumber, language, items[]{_key, name, quantity, unitPriceOre, size, colour} }`,
      { email },
    ),
    adminClient().fetch<Account | null>(`*[_type == "customer" && lower(email) == $email][0]`, { email }),
  ]);
  if (!orders.length && !account) notFound();

  const latest = orders[0];
  const name = latest?.customer?.name || [account?.firstName, account?.lastName].filter(Boolean).join(" ") || email;
  const sales = orders.filter((o) => COUNTS_AS_SALE.includes((o.status ?? "paid") as never));
  const spent = sales.reduce((s, o) => s + (o.totalOre ?? 0), 0);
  const first = orders[orders.length - 1];
  const addresses = [...new Set(orders.map((o) => o.customer?.address).filter((a): a is string => Boolean(a)))];
  const phones = [...new Set(orders.map((o) => o.customer?.phone).filter((p): p is string => Boolean(p)))];
  const notes = orders.filter((o) => o.customer?.note);
  const sources = [...new Set(orders.map((o) => o.origin?.label).filter(Boolean))];

  return (
    <>
      <div className="flex flex-col gap-[12px]">
        <TextLink href="/admin/customers">← Customers</TextLink>
        <div className="flex flex-wrap items-center gap-[12px]">
          <Heading>{name}</Heading>
          {account && <Tag tone="muted">has an account</Tag>}
        </div>
        <Muted>
          <a href={`mailto:${email}`} className="underline">{email}</a>
          {first?.orderedAt ? ` · customer since ${date(first.orderedAt)}` : ""}
        </Muted>
      </div>

      <dl className="m-0 grid grid-cols-2 gap-[12px] font-gotham text-paragraph text-black md:grid-cols-4 md:gap-[24px]">
        {[
          ["Orders", String(orders.length)],
          ["Spent", kr(spent)],
          ["Average order", kr(sales.length ? Math.round(spent / sales.length) : 0)],
          ["Last order", date(latest?.orderedAt) || "—"],
        ].map(([k, v]) => (
          <div key={k} className="flex flex-col gap-[6px] border-[0.5px] border-black/25 p-[12px] md:p-[24px]">
            <dt className="text-[11px] text-black/50">{k}</dt>
            <dd className="m-0 font-americana text-[24px] leading-none md:text-[32px]">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-[42px] md:grid-cols-[1fr_320px]">
        <Card>
          <Subheading>Orders</Subheading>
          <div className="h-px w-full bg-black/25" />
          {orders.length === 0 ? (
            <Muted>An account, but no orders yet.</Muted>
          ) : (
            <div className="flex flex-col">
              {orders.map((o) => (
                <div key={o._id} className="flex flex-col gap-[8px] border-b border-black/10 py-[14px] last:border-b-0">
                  <div className="flex flex-wrap items-center gap-[12px]">
                    <Link href={`/admin/orders/${o._id}`} className="underline-offset-4 hover:underline">{o.orderNumber}</Link>
                    <OrderPreview order={o} />
                    <StatusPill status={o.status} />
                    {o.manual === "pr" && <Tag tone="muted">PR</Tag>}
                    <span className="ml-auto">{kr(o.totalOre)}</span>
                  </div>
                  <div className="flex flex-col gap-[3px] text-[11px] leading-normal text-black/50">
                    <span>{date(o.orderedAt)} · {(o.items ?? []).map((i) => `${i.quantity} × ${i.name}${variantLabel(i) ? ` (${variantLabel(i)})` : ""}`).join(", ")}</span>
                    {o.customer?.address && <span>To: {o.customer.address}</span>}
                    <span>{paidWith(o)}{o.trackingNumber ? ` · tracking ${o.trackingNumber}` : ""}{o.origin?.label ? ` · ${o.origin.label}` : ""}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className="flex flex-col gap-[42px]">
          <Card>
            <Subheading>Contact</Subheading>
            <div className="h-px w-full bg-black/25" />
            <ul className="m-0 flex list-none flex-col gap-[5px] p-0 text-[11px] leading-normal">
              <li><a href={`mailto:${email}`} className="underline">{email}</a></li>
              {phones.map((p) => (
                <li key={p}><a href={`tel:${p.replace(/\s/g, "")}`} className="underline">{p}</a></li>
              ))}
              {latest?.language && <li className="text-black/50">Reads the site in {latest.language === "no" ? "Norsk" : "English"}</li>}
            </ul>
          </Card>

          <Card>
            <Subheading>{addresses.length > 1 ? "Addresses used" : "Address"}</Subheading>
            <div className="h-px w-full bg-black/25" />
            {addresses.length ? (
              <ul className="m-0 flex list-none flex-col gap-[12px] p-0 text-[11px] leading-normal">
                {addresses.map((a) => (
                  <li key={a} className="whitespace-pre-line">{a.split(", ").join("\n")}</li>
                ))}
              </ul>
            ) : (
              <Muted className="text-[11px]">None yet.</Muted>
            )}
          </Card>

          <Card>
            <Subheading>Found the shop through</Subheading>
            <div className="h-px w-full bg-black/25" />
            {sources.length ? (
              <ul className="m-0 flex list-none flex-col gap-[5px] p-0 text-[11px] leading-normal">
                {sources.map((s) => <li key={s}>{s}</li>)}
                {first?.origin?.landing && <li className="text-black/50">First page seen: {first.origin.landing}</li>}
                {first?.origin?.device && <li className="text-black/50">On: {first.origin.device}</li>}
              </ul>
            ) : (
              <Muted className="text-[11px]">Not known for these orders.</Muted>
            )}
          </Card>

          {notes.length > 0 && (
            <Card>
              <Subheading>Notes they&apos;ve left</Subheading>
              <div className="h-px w-full bg-black/25" />
              <ul className="m-0 flex list-none flex-col gap-[12px] p-0 text-[11px] leading-normal">
                {notes.map((o) => (
                  <li key={o._id}>
                    <span className="whitespace-pre-wrap">“{o.customer?.note}”</span> <span className="text-black/50">— {o.orderNumber}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {account && (
            <Card>
              <Subheading>Account</Subheading>
              <div className="h-px w-full bg-black/25" />
              <ul className="m-0 flex list-none flex-col gap-[5px] p-0 text-[11px] leading-normal">
                {account.createdAt && <li>Made {date(account.createdAt)}</li>}
                {account.lastSignInAt && <li className="text-black/50">Last signed in {date(account.lastSignInAt)}</li>}
                {account.stripeCustomerId && <li className="text-black/50">Can save cards (kept at Stripe)</li>}
              </ul>
              {account.measurements && account.measurements.length > 0 && (
                <>
                  <span className="pt-[6px] text-[11px]">Saved measurements</span>
                  <ul className="m-0 flex list-none flex-col gap-[3px] p-0 text-[11px] leading-normal">
                    {account.measurements.map((m) => (
                      <li key={m._key}>{m.label}: <span className="text-black/50">{m.value} cm</span></li>
                    ))}
                  </ul>
                </>
              )}
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
