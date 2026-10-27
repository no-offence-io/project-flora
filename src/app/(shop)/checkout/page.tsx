import type { Metadata } from "next";
import CheckoutClient from "@/components/checkout-client";
import CheckoutSteps from "@/components/checkout-steps";
import Navbar from "@/components/navbar";
import { getShipsTo } from "@/lib/catalog";
import { getCustomer } from "@/lib/customer";
import { getT } from "@/lib/i18n-server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("meta.checkout") };
}

const FORM_ID = "billing-details";

export default async function CheckoutPage() {
  const [t, countries, customer] = await Promise.all([getT(), getShipsTo(), getCustomer()]);
  // Only what the form needs leaves the server — never the Stripe id or session details.
  const account = customer
    ? { email: customer.email, firstName: customer.firstName, lastName: customer.lastName, phonePrefix: customer.phonePrefix, phone: customer.phone, street: customer.street, apartment: customer.apartment, postcode: customer.postcode, city: customer.city, country: customer.country }
    : null;
  return (
    <div className="flex flex-col gap-[60px] pb-[60px] md:gap-[120px] md:pb-[120px]">
      <div className="flex flex-col gap-[24px] md:gap-[42px]">
        <Navbar tone="dark" />

        <div className="flex flex-col gap-[24px] px-[24px] pb-[24px] md:gap-[60px] md:px-[42px] md:pb-[42px]">
          {/* Title: steps under the title on desktop, above it on mobile */}
          <div className="flex flex-col gap-[42px] md:gap-[12px]">
            <CheckoutSteps current="Checkout Details" className="order-1 md:order-2" />
            <h1 className="order-2 m-0 font-americana text-big-header-mobile capitalize text-black md:order-1 md:text-big-header-desktop">
              {t("checkout.title")}
            </h1>
          </div>

          <CheckoutClient formId={FORM_ID} countries={countries} account={account} />
        </div>
      </div>
    </div>
  );
}
