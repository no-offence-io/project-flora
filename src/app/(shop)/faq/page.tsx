import type { Metadata } from "next";
import FaqSection from "@/components/faq-section";
import Navbar from "@/components/navbar";
import SignUpBanner from "@/components/sign-up-banner";
import { getFaq, getHomePage } from "@/lib/catalog";
import { getT } from "@/lib/i18n-server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("meta.faq") };
}

export default async function FaqPage() {
  const [items, home, t] = await Promise.all([getFaq(), getHomePage(), getT()]);
  return (
    <div className="flex flex-col gap-[60px] pb-[60px] md:gap-[120px] md:pb-[120px]">
      <div className="flex flex-col gap-[60px] md:gap-[42px]">
        <Navbar tone="dark" />
        <FaqSection title={t("faq.title")} intro={home.values.intro} items={items} capViewport headingLevel="h1" />
      </div>
      <SignUpBanner variant="smaller" mobileVariant="clothing" />
    </div>
  );
}
