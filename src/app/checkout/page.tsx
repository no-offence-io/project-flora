import type { Metadata } from "next";
import CheckoutForm from "@/components/checkout-form";
import CheckoutSteps from "@/components/checkout-steps";
import Navbar from "@/components/navbar";
import OrderSummary from "@/components/order-summary";

export const metadata: Metadata = { title: "Checkout – Flöra" };

const FORM_ID = "billing-details";

export default function CheckoutPage() {
  return (
    <div className="flex flex-col gap-[60px] pb-[60px] md:gap-[120px] md:pb-[120px]">
      <div className="flex flex-col gap-[24px] md:gap-[42px]">
        <Navbar tone="dark" />

        <div className="flex flex-col gap-[24px] px-[24px] pb-[24px] md:gap-[60px] md:px-[42px] md:pb-[42px]">
          {/* Title: steps under the title on desktop, above it on mobile */}
          <div className="flex flex-col gap-[42px] md:gap-[12px]">
            <CheckoutSteps current="Checkout Details" className="order-1 md:order-2" />
            <h1 className="order-2 m-0 font-americana text-big-header-mobile capitalize text-black md:order-1 md:text-big-header-desktop">
              Billing Details
            </h1>
          </div>

          <div className="flex flex-col gap-[60px] md:flex-row md:items-stretch md:gap-[42px]">
            <CheckoutForm id={FORM_ID} className="md:min-w-0 md:flex-1" />
            <OrderSummary formId={FORM_ID} />
          </div>
        </div>
      </div>
    </div>
  );
}
