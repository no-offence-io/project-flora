import type { Metadata } from "next";
import { Suspense } from "react";
import CheckoutSteps from "@/components/checkout-steps";
import Navbar from "@/components/navbar";
import OrderCompleteStatus from "@/components/order-complete-status";
import { getT } from "@/lib/i18n-server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("meta.orderComplete") };
}

export default async function OrderCompletePage() {
  const t = await getT();
  return (
    <div className="flex flex-col gap-[60px] pb-[60px] md:gap-[120px] md:pb-[120px]">
      <div className="flex flex-col gap-[24px] md:gap-[42px]">
        <Navbar tone="dark" />
        <div className="flex flex-col gap-[42px] px-[24px] pb-[24px] md:px-[42px] md:pb-[42px]">
          <CheckoutSteps current="Order Complete" />
          {/* useSearchParams inside needs a Suspense boundary for static rendering */}
          <Suspense fallback={<p className="m-0 font-gotham text-paragraph text-black/70">{t("complete.checking")}</p>}>
            <OrderCompleteStatus />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
