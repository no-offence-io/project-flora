import type { Metadata } from "next";
import { notFound } from "next/navigation";
import FaqSection from "./faq-section";
import Navbar from "./navbar";
import SignUpBanner from "./sign-up-banner";
import { getPolicy } from "@/lib/catalog";

/** Shared layout for the footer policy pages, built the same way as the FAQ page. */
export default async function PolicyPage({ page }: { page: string }) {
  const content = await getPolicy(page);
  if (!content) notFound();
  return (
    <div className="flex flex-col gap-[60px] pb-[60px] md:gap-[120px] md:pb-[120px]">
      <div className="flex flex-col gap-[60px] md:gap-[42px]">
        <Navbar tone="dark" />
        <FaqSection title={content.title} intro={content.intro} items={content.items} capViewport headingLevel="h1" />
      </div>
      <SignUpBanner variant="smaller" mobileVariant="clothing" />
    </div>
  );
}

export async function policyMetadata(page: string): Promise<Metadata> {
  const content = await getPolicy(page);
  return { title: `${content?.title ?? "Flöra"} – Flöra` };
}
