import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Heading, Panel, Status } from "@/components/account-ui";
import RolloverText from "@/components/rollover-text";
import { getCustomer } from "@/lib/customer";
import { deleteAccount, signOutCustomer, signOutEverywhere } from "@/lib/customer-actions";
import { ordersFor } from "@/lib/customer-orders";
import { getT } from "@/lib/i18n-server";
import type { Key } from "@/lib/i18n";
import { formatNok } from "@/lib/money";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("meta.account"), robots: { index: false } };
}

const statusKey = (s: string) => (["paid", "shipped", "delivered", "refunded", "cancelled"].includes(s) ? (`status.${s}` as Key) : null);

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ confirm?: string }> }) {
  const [customer, t, { confirm }] = await Promise.all([getCustomer(), getT(), searchParams]);
  if (!customer) redirect("/account/login");
  const orders = (await ordersFor(customer.email)).slice(0, 3);
  const name = customer.firstName || customer.email.split("@")[0];
  const address = [customer.street, customer.apartment, [customer.postcode, customer.city].filter(Boolean).join(" "), customer.country].filter(Boolean);

  return (
    <div className="flex flex-col gap-[42px]">
      <div className="flex flex-col gap-[12px]">
        <Heading>{t("account.hi", { name })}</Heading>
        <p className="m-0 font-gotham text-paragraph text-black/50">{customer.email}</p>
      </div>

      <div className="grid gap-[42px] md:grid-cols-2">
        <Panel title={t("account.orders")} action={<Link href="/account/orders" className="underline"><RolloverText text={t("account.allOrders")} /></Link>}>
          {orders.length === 0 ? (
            <p className="m-0 text-black/50">{t("account.noOrders")}</p>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-[12px] p-0">
              {orders.map((o) => (
                <li key={o._id}>
                  <Link href={`/account/orders/${o.orderNumber}`} className="flex items-center justify-between gap-[12px] border-[0.25px] border-black/25 p-[12px]">
                    <span className="flex flex-col gap-[5px]">
                      <span>{o.orderNumber}</span>
                      <span className="text-[11px] leading-normal text-black/50">{new Date(o.orderedAt).toLocaleDateString("nb-NO")} · {o.items.map((i) => i.name).join(", ")}</span>
                    </span>
                    <span className="flex items-center gap-[12px]">
                      <Status>{statusKey(o.status) ? t(statusKey(o.status)!) : o.status}</Status>
                      <span>{formatNok(o.totalOre)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title={t("account.details")} action={<Link href="/account/details" className="underline"><RolloverText text={t("account.edit")} /></Link>}>
          {address.length ? (
            <ul className="m-0 flex list-none flex-col gap-[5px] p-0 text-[11px] leading-normal">
              <li>{[customer.firstName, customer.lastName].filter(Boolean).join(" ")}</li>
              {address.map((line) => <li key={line} className="text-black/50">{line}</li>)}
              {customer.phone && <li className="text-black/50">{[customer.phonePrefix, customer.phone].filter(Boolean).join(" ")}</li>}
            </ul>
          ) : (
            <p className="m-0 text-black/50">{t("account.noAddress")}</p>
          )}
        </Panel>

        <Panel title={t("account.measurements")} action={<Link href="/account/measurements" className="underline"><RolloverText text={t("account.edit")} /></Link>}>
          {customer.measurements?.length ? (
            <ul className="m-0 flex list-none flex-col gap-[5px] p-0 text-[11px] leading-normal">
              {customer.measurements.map((m) => (
                <li key={m.label}>{m.label}: <span className="text-black/50">{m.value} cm</span></li>
              ))}
            </ul>
          ) : (
            <p className="m-0 text-black/50">{t("account.noMeasurements")}</p>
          )}
        </Panel>

        <Panel title={t("account.cards")} action={<Link href="/account/cards" className="underline"><RolloverText text={t("account.edit")} /></Link>}>
          <p className="m-0 text-black/50">{t("account.cardsIntro")}</p>
        </Panel>
      </div>

      <div className="flex flex-col gap-[24px] font-gotham text-paragraph">
        <div className="flex flex-wrap items-center gap-[24px]">
          <form action={signOutCustomer}><button type="submit" className="text-black underline"><RolloverText text={t("account.signOut")} /></button></form>
          <form action={signOutEverywhere}><button type="submit" className="text-black/50 underline">{t("account.signOutEverywhere")}</button></form>
        </div>
        <form action={deleteAccount} className="flex flex-col gap-[12px] md:max-w-[521px]">
          {confirm === "delete" && <p className="m-0 text-[#b00020]" role="alert">{t("account.deleteHint")}</p>}
          <label className="flex items-start gap-[8px] text-black/50">
            <input type="checkbox" name="sure" className="mt-[3px] h-[14px] w-[14px] shrink-0 accent-black" /> {t("account.deleteSure")}
          </label>
          <button type="submit" className="w-max text-black/50 underline">{t("account.delete")}</button>
        </form>
      </div>
    </div>
  );
}
