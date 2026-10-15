"use client";

import type { ReactNode } from "react";
import { useCart } from "./cart-context";
import CartItems from "./cart-items";
import { formatNok, type Totals } from "@/lib/money";
import { useT } from "@/components/i18n-provider";

/**
 * Order summary card from the Figma checkout page: cart rows and the pricing block, then whatever
 * the checkout puts beneath it (the Payment Element and the confirm button). Desktop draws it as a
 * 520px bordered card.
 *
 * Every amount here is the server's quote for the current cart, passed in as `totals`. Nothing is
 * summed from the cart on the client — the browser's copy of a price is only ever decorative.
 */
export default function OrderSummary({
  totals,
  children,
  className = "",
}: {
  totals: Totals | null;
  children?: ReactNode;
  className?: string;
}) {
  const { count } = useCart();
  const t = useT();
  const pending = "…";

  return (
    <aside
      className={`flex w-full flex-col gap-[12px] bg-white font-gotham text-paragraph text-black md:w-[520px] md:shrink-0 md:border-[0.5px] md:border-black/25 md:p-[24px] ${className}`}
    >
      <div className="flex flex-col gap-[12px]">
        <h2 className="m-0 flex items-start gap-[6px] font-gotham text-paragraph">
          {t("cart.summary")}
          <span className="border-[0.5px] border-black px-[4px] py-[1px] text-paragraph">{count} {t("cart.itemsTag")}</span>
        </h2>
        <div className="h-px w-full bg-black/25" />
      </div>

      <div className="flex flex-col gap-[12px]">
        <CartItems />

        <dl className="m-0 flex flex-col gap-[12px] bg-[#fafbfc] p-[24px]" aria-busy={!totals}>
          <div className="flex justify-between">
            <dt>{t("summary.subtotal")}</dt>
            <dd className="m-0">{totals ? formatNok(totals.subtotalOre) : pending}</dd>
          </div>
          <div className="flex justify-between text-[11px] leading-normal text-black/50">
            <dt>{t("summary.shipping")}</dt>
            <dd className="m-0">{totals ? (totals.shippingOre === 0 ? t("summary.free") : formatNok(totals.shippingOre)) : pending}</dd>
          </div>
          <div className="flex justify-between text-[11px] leading-normal text-black/50">
            <dt>{t("summary.vat")}</dt>
            <dd className="m-0">{totals ? formatNok(totals.vatIncludedOre) : pending}</dd>
          </div>
          <div className="h-px w-full bg-black/25" />
          <div className="flex justify-between">
            <dt>{t("summary.total")}</dt>
            <dd className="m-0">{totals ? formatNok(totals.totalOre) : pending}</dd>
          </div>
        </dl>
      </div>

      {children}
    </aside>
  );
}
