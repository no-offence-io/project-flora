import FaqSection from "./faq-section";
import Navbar from "./navbar";
import SignUpBanner from "./sign-up-banner";
import type { PolicyPage as PolicyPageData } from "@/data/policies";

/** Shared layout for the footer policy pages, built the same way as the FAQ page. */
export default function PolicyPage({ page }: { page: PolicyPageData }) {
  return (
    <div className="flex flex-col gap-[60px] pb-[60px] md:gap-[120px] md:pb-[120px]">
      <div className="flex flex-col gap-[60px] md:gap-[42px]">
        <Navbar tone="dark" />
        <FaqSection title={page.title} intro={page.intro} items={page.items} capViewport headingLevel="h1" />
      </div>
      <SignUpBanner variant="smaller" mobileVariant="clothing" />
    </div>
  );
}
