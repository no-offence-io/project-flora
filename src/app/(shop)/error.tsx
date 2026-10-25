"use client";

import { useEffect } from "react";
import { useT } from "@/components/i18n-provider";

/** Shown in place of a page that threw. The shop chrome around it stays; the cart is untouched. */
export default function ShopError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useT();
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="flex max-w-[521px] flex-col gap-[24px] px-[24px] py-[60px] font-gotham text-paragraph text-black md:px-[42px] md:py-[120px]">
      <h1 className="m-0 font-americana text-big-header-mobile capitalize md:text-big-header-desktop">{t("error.title")}</h1>
      <p className="m-0 text-black/70">{t("error.text")}</p>
      <button type="button" onClick={reset} className="flex w-max items-center justify-center bg-black px-[24px] py-[12px] font-gotham text-paragraph text-white">
        {t("error.retry")}
      </button>
    </div>
  );
}
