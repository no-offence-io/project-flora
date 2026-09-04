import type { Metadata } from "next";
import FaqSection from "@/components/faq-section";
import Navbar from "@/components/navbar";
import SignUpBanner from "@/components/sign-up-banner";
import { FAQ_INTRO, FAQ_ITEMS } from "@/data/faq";

export const metadata: Metadata = { title: "FAQ – Flöra" };

export default function FaqPage() {
  return (
    <div className="flex flex-col gap-[60px] pb-[60px] md:gap-[120px] md:pb-[120px]">
      <div className="flex flex-col gap-[60px] md:gap-[42px]">
        <Navbar tone="dark" />
        <FaqSection title="Frequently asked questions" intro={FAQ_INTRO} items={FAQ_ITEMS} capViewport headingLevel="h1" />
      </div>
      <SignUpBanner variant="smaller" mobileVariant="clothing" />
    </div>
  );
}
