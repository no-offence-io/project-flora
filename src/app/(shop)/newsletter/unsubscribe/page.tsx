import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/navbar";
import RolloverText from "@/components/rollover-text";
import { getT } from "@/lib/i18n-server";
import { getWriteClient } from "@/sanity/lib/write";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("newsletter.unsubscribeTitle"), robots: { index: false } };
}

/** The link at the bottom of every newsletter. The id is the subscriber's own hashed id — nothing else is needed. */
export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const [{ id }, t] = await Promise.all([searchParams, getT()]);
  let done = false;
  if (id && /^subscriber-[a-f0-9]{32}$/.test(id)) {
    try {
      const client = getWriteClient();
      if (await client.getDocument(id)) {
        await client.patch(id).set({ unsubscribedAt: new Date().toISOString() }).commit();
        done = true;
      }
    } catch (err) {
      console.error("[newsletter] unsubscribe failed", err);
    }
  }
  return (
    <div className="flex flex-col gap-[60px] pb-[60px] md:gap-[120px] md:pb-[120px]">
      <div className="flex flex-col gap-[24px] md:gap-[42px]">
        <Navbar tone="dark" />
        <div className="flex max-w-[521px] flex-col gap-[24px] px-[24px] pb-[24px] font-gotham text-paragraph text-black md:px-[42px] md:pb-[42px]">
          <h1 className="m-0 font-americana text-big-header-mobile capitalize md:text-big-header-desktop">{done ? t("newsletter.unsubscribed") : t("newsletter.unsubscribeFailed")}</h1>
          <p className="m-0 text-black/70">{done ? t("newsletter.unsubscribedText") : t("newsletter.unsubscribeFailedText")}</p>
          <Link href="/" className="text-black underline">
            <RolloverText text={t("notFound.back")} />
          </Link>
        </div>
      </div>
    </div>
  );
}
