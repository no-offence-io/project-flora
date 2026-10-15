"use client";

import Link from "next/link";
import { useCart } from "./cart-context";
import CartIcon from "./cart-icon";
import CartItems from "./cart-items";
import { useT } from "@/components/i18n-provider";
import RolloverText from "./rollover-text";

/**
 * Cart entry point. `variant="text"` shows "Cart (N)" and reveals the cart rows in a corner popup on
 * hover or keyboard focus, with a Continue to checkout button. `variant="icon"` is the bag with the count.
 */
export default function CartLink({ variant = "text", className = "" }: { variant?: "text" | "icon"; className?: string }) {
  const { count } = useCart();
  const t = useT();
  const label = `${t("cart.link")}, ${count} ${t("cart.items")}`;

  if (variant === "icon") {
    return (
      <Link href="/checkout" aria-label={label} className={`-mt-[2px] flex h-[27px] w-[23px] items-start hover:opacity-70 transition-opacity ${className}`}>
        <CartIcon count={count} className="-mt-px" />
      </Link>
    );
  }

  return (
    <div className="group relative">
      <Link href="/checkout" aria-label={label} className={className}>
        <RolloverText text={`${t("cart.link")} (${count})`} capitalize={className.includes("capitalize")} />
      </Link>

      {/* Popup: padding-top keeps the hover alive across the gap under the link */}
      <div className="invisible absolute top-full right-0 z-50 pt-[12px] opacity-0 transition-opacity duration-200 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
        <div className="flex w-[420px] max-w-[calc(100vw-48px)] flex-col gap-[12px] border-[0.5px] border-black/25 bg-white p-[24px] text-black shadow-[0_12px_40px_rgba(0,0,0,0.12)]">
          <div className="flex flex-col gap-[12px]">
            <p className="m-0 flex items-start gap-[6px] font-gotham text-paragraph">
              {t("cart.summary")}
              <span className="border-[0.5px] border-black px-[4px] py-[1px]">{count} {t("cart.itemsTag")}</span>
            </p>
            <div className="h-px w-full bg-black/25" />
          </div>
          <CartItems />
          <Link
            href="/checkout"
            className="flex w-full items-center justify-center bg-black p-[12px] font-gotham text-paragraph text-white hover:opacity-80 transition-opacity"
          >
            {t("cart.continue")}
          </Link>
        </div>
      </div>
    </div>
  );
}
