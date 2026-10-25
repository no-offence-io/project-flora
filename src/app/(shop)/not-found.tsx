import Link from "next/link";
import Navbar from "@/components/navbar";
import RolloverText from "@/components/rollover-text";
import { getT } from "@/lib/i18n-server";

export default async function NotFound() {
  const t = await getT();
  return (
    <div className="flex flex-col gap-[60px] pb-[60px] md:gap-[120px] md:pb-[120px]">
      <div className="flex flex-col gap-[24px] md:gap-[42px]">
        <Navbar tone="dark" />
        <div className="flex max-w-[521px] flex-col gap-[24px] px-[24px] pb-[24px] font-gotham text-paragraph text-black md:px-[42px] md:pb-[42px]">
          <h1 className="m-0 font-americana text-big-header-mobile capitalize md:text-big-header-desktop">{t("notFound.title")}</h1>
          <p className="m-0 text-black/70">{t("notFound.text")}</p>
          <Link href="/" className="text-black underline">
            <RolloverText text={t("notFound.back")} />
          </Link>
        </div>
      </div>
    </div>
  );
}
