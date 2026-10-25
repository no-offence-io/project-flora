import type { Metadata } from "next";
import Navbar from "@/components/navbar";
import SignUpBanner from "@/components/sign-up-banner";
import ValuesScrolly from "@/components/values-scrolly";
import { getHomePage } from "@/lib/catalog";
import { getT } from "@/lib/i18n-server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("meta.values") };
}

/** The Values section from the front page, as a page of its own (the nav links here). */
export default async function ValuesPage() {
  const home = await getHomePage();
  return (
    <div className="flex flex-col gap-[60px] pb-[60px] md:gap-[120px] md:pb-[120px]">
      <div className="flex flex-col gap-[60px] md:gap-[42px]">
        <Navbar tone="dark" />
        <ValuesScrolly title={home.values.title} intro={home.values.intro} values={home.values.items} />
      </div>
      <SignUpBanner variant="smaller" mobileVariant="clothing" />
    </div>
  );
}
