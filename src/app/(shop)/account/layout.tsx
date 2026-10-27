import type { ReactNode } from "react";
import Navbar from "@/components/navbar";
import AccountNav from "@/components/account-nav";
import { getCustomer } from "@/lib/customer";
import { getT } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

/** My page: the shop's navbar, the account's own line of links once signed in, and the content. */
export default async function AccountLayout({ children }: { children: ReactNode }) {
  const [customer, t] = await Promise.all([getCustomer(), getT()]);
  const links = [
    { label: t("account.overview"), href: "/account" },
    { label: t("account.orders"), href: "/account/orders" },
    { label: t("account.details"), href: "/account/details" },
    { label: t("account.measurements"), href: "/account/measurements" },
    { label: t("account.cards"), href: "/account/cards" },
  ];
  return (
    <div className="flex flex-col gap-[60px] pb-[60px] md:gap-[120px] md:pb-[120px]">
      <div className="flex flex-col gap-[24px] md:gap-[42px]">
        <Navbar tone="dark" />
        <div className="flex flex-col gap-[42px] px-[24px] pb-[24px] md:px-[42px] md:pb-[42px]">
          {customer && <AccountNav links={links} />}
          {children}
        </div>
      </div>
    </div>
  );
}
