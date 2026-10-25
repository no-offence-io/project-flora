import type { Metadata } from "next";
import Navbar from "@/components/navbar";
import OrderLookup from "@/components/order-lookup";
import { getT } from "@/lib/i18n-server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("meta.order"), robots: { index: false } };
}

export default async function OrderPage() {
  const t = await getT();
  return (
    <div className="flex flex-col gap-[60px] pb-[60px] md:gap-[120px] md:pb-[120px]">
      <div className="flex flex-col gap-[24px] md:gap-[42px]">
        <Navbar tone="dark" />
        <div className="flex flex-col gap-[42px] px-[24px] pb-[24px] md:px-[42px] md:pb-[42px]">
          <div className="flex flex-col gap-[12px]">
            <h1 className="m-0 font-americana text-big-header-mobile capitalize text-black md:text-big-header-desktop">{t("order.title")}</h1>
            <p className="m-0 max-w-[521px] font-gotham text-paragraph text-black/70">{t("order.intro")}</p>
          </div>
          <OrderLookup />
        </div>
      </div>
    </div>
  );
}
