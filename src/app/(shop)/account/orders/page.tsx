import Link from "next/link";
import { redirect } from "next/navigation";
import { Heading, Status } from "@/components/account-ui";
import { getCustomer } from "@/lib/customer";
import { ordersFor } from "@/lib/customer-orders";
import { getT } from "@/lib/i18n-server";
import type { Key } from "@/lib/i18n";
import { formatNok } from "@/lib/money";

const statusKey = (s: string) => (["paid", "shipped", "delivered", "refunded", "cancelled"].includes(s) ? (`status.${s}` as Key) : null);

export default async function OrdersPage() {
  const [customer, t] = await Promise.all([getCustomer(), getT()]);
  if (!customer) redirect("/account/login?next=/account/orders");
  const orders = await ordersFor(customer.email);
  return (
    <div className="flex flex-col gap-[24px] md:max-w-[640px]">
      <Heading>{t("account.orders")}</Heading>
      {orders.length === 0 && <p className="m-0 font-gotham text-paragraph text-black/50">{t("account.noOrders")}</p>}
      <ul className="m-0 flex list-none flex-col gap-[12px] p-0 font-gotham text-paragraph text-black">
        {orders.map((o) => (
          <li key={o._id}>
            <Link href={`/account/orders/${o.orderNumber}`} className="flex flex-col gap-[12px] border-[0.25px] border-black/25 p-[12px]">
              <span className="flex items-center justify-between gap-[12px]">
                <span>{o.orderNumber}</span>
                <Status>{statusKey(o.status) ? t(statusKey(o.status)!) : o.status}</Status>
              </span>
              <span className="flex flex-col gap-[5px] text-[11px] leading-normal">
                <span>{t("account.ordered")}: <span className="text-black/50">{new Date(o.orderedAt).toLocaleDateString("nb-NO")}</span></span>
                <span className="text-black/50">{o.items.map((i) => `${i.name}${i.size ? ` – ${i.size}` : ""} × ${i.quantity}`).join(", ")}</span>
                {o.trackingNumber && <span>{t("account.tracking")}: <span className="text-black/50">{o.trackingNumber}</span></span>}
              </span>
              <span className="flex justify-between">
                <span>{t("account.total")}</span>
                <span>{formatNok(o.totalOre)}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
