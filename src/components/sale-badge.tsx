"use client";

import { useT } from "@/components/i18n-provider";

/** The "Sale" tag on a product card: a word on black, sitting in from the card's top right corner. */
export default function SaleBadge({ className = "" }: { className?: string }) {
  const t = useT();
  return <span className={`inline-flex items-center bg-black px-[10px] py-[5px] font-gotham text-[11px] leading-normal text-white ${className}`}>{t("product.saleTag")}</span>;
}
