import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Heading, Status } from "@/components/account-ui";
import RolloverText from "@/components/rollover-text";
import { getCustomer } from "@/lib/customer";
import { orderFor } from "@/lib/customer-orders";
import { getT } from "@/lib/i18n-server";
import type { Key } from "@/lib/i18n";
import { formatNok } from "@/lib/money";

const statusKey = (s: string) => (["paid", "shipped", "delivered", "refunded", "cancelled"].includes(s) ? (`status.${s}` as Key) : null);

/** One order — only if it belongs to the signed-in customer's email; anything else is a 404. */
export default async function OrderPage({ params }: { params: Promise<{ number: string }> }) {
  const [{ number }, customer, t] = await Promise.all([params, getCustomer(), getT()]);
  if (!customer) redirect(`/account/login?next=/account/orders/${encodeURIComponent(number)}`);
  if (!/^FL-[A-Z0-9]{6,10}$/.test(number)) notFound();
  const o = await orderFor(customer.email, number);
  if (!o) notFound();
  return (
    <div className="flex flex-col gap-[24px] md:max-w-[640px]">
      <Link href="/account/orders" className="font-gotham text-paragraph text-black/50"><RolloverText text={`← ${t("account.orders")}`} /></Link>
      <div className="flex flex-wrap items-center gap-[12px]">
        <Heading>{o.orderNumber}</Heading>
        <Status>{statusKey(o.status) ? t(statusKey(o.status)!) : o.status}</Status>
      </div>
      <p className="m-0 font-gotham text-paragraph text-black/50">{t("account.ordered")} {new Date(o.orderedAt).toLocaleDateString("nb-NO", { dateStyle: "long" })}</p>
      {o.trackingNumber && (
        <p className="m-0 font-gotham text-paragraph text-black">
          {t("account.tracking")}: <span className="text-black/50">{o.trackingNumber}</span> ·{" "}
          <a href={`https://sporing.posten.no/sporing/${encodeURIComponent(o.trackingNumber)}`} target="_blank" rel="noreferrer" className="underline">{t("account.track")}</a>
        </p>
      )}
      <ul className="m-0 flex list-none flex-col gap-[12px] p-0 font-gotham text-paragraph text-black">
        {o.items.map((it, i) => (
          <li key={i} className="flex gap-[12px] border-[0.25px] border-black/25 p-[12px]">
            <span className="relative h-[105px] w-[84px] shrink-0 bg-[#f7f7f7]">{it.image && <Image src={it.image} alt="" fill sizes="84px" className="object-contain p-[12px]" />}</span>
            <span className="flex min-w-0 flex-1 flex-col gap-[12px]">
              <span>{it.name}{it.size ? ` - ${it.size}` : ""} x {it.quantity}</span>
              {it.measurements.length > 0 && (
                <span className="flex flex-col gap-[5px] text-[11px] leading-normal">
                  {it.measurements.map((m) => <span key={m.label}>{m.label}: <span className="text-black/50">{m.value} cm</span></span>)}
                </span>
              )}
            </span>
            <span>{formatNok(it.unitPriceOre * it.quantity)}</span>
          </li>
        ))}
      </ul>
      <dl className="m-0 flex flex-col gap-[12px] bg-[#fafbfc] p-[24px] font-gotham text-paragraph text-black">
        <div className="flex justify-between"><dt>{t("summary.subtotal")}</dt><dd className="m-0">{formatNok(o.subtotalOre ?? 0)}</dd></div>
        {o.discountOre ? <div className="flex justify-between text-[11px] text-black/50"><dt>{t("summary.discount")}</dt><dd className="m-0">−{formatNok(o.discountOre)}</dd></div> : null}
        <div className="flex justify-between text-[11px] text-black/50"><dt>{t("summary.shipping")}</dt><dd className="m-0">{o.shippingOre ? formatNok(o.shippingOre) : t("summary.free")}</dd></div>
        <div className="flex justify-between text-[11px] text-black/50"><dt>{t("summary.vat")}</dt><dd className="m-0">{formatNok(o.vatIncludedOre ?? 0)}</dd></div>
        <div className="h-px w-full bg-black/25" />
        <div className="flex justify-between"><dt>{t("summary.total")}</dt><dd className="m-0">{formatNok(o.totalOre)}</dd></div>
      </dl>
      {o.address && <p className="m-0 font-gotham text-[11px] leading-normal text-black/50">{o.address}</p>}
    </div>
  );
}
