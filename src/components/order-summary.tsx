"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "./cart-context";
import CartItems from "./cart-items";
import { SHIPPING, TAX, formatPrice } from "@/data/cart";

const PAYMENT_MARKS = [
  { src: "/checkout/apple-pay.svg", alt: "Apple Pay" },
  { src: "/checkout/google-pay.svg", alt: "Google Pay" },
  { src: "/checkout/vipps.svg", alt: "Vipps" },
  { src: "/checkout/card.svg", alt: "Credit or debit card" },
];

/**
 * Order summary card from the Figma checkout page: cart rows, pricing block, payment marks,
 * Confirm order and the privacy note. Desktop draws it as a 520px bordered card.
 */
export default function OrderSummary({ formId, className = "" }: { formId?: string; className?: string }) {
  const { items, count } = useCart();
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const total = subtotal + (items.length ? SHIPPING + TAX : 0);

  return (
    <aside
      className={`flex w-full flex-col gap-[12px] bg-white font-gotham text-paragraph text-black md:w-[520px] md:shrink-0 md:border-[0.5px] md:border-black/25 md:p-[24px] ${className}`}
    >
      <div className="flex flex-col gap-[12px]">
        <h2 className="m-0 flex items-start gap-[6px] font-gotham text-paragraph">
          Order Summary
          <span className="border-[0.5px] border-black px-[4px] py-[1px] text-paragraph">{count} Items</span>
        </h2>
        <div className="h-px w-full bg-black/25" />
      </div>

      <div className="flex flex-col gap-[12px]">
        <CartItems />

        <dl className="m-0 flex flex-col gap-[12px] bg-[#fafbfc] p-[24px]">
          <div className="flex justify-between">
            <dt>Subtotal</dt>
            <dd className="m-0">{formatPrice(subtotal)}</dd>
          </div>
          <div className="flex justify-between text-[11px] leading-normal text-black/50">
            <dt>Shipping</dt>
            <dd className="m-0">{formatPrice(SHIPPING)}</dd>
          </div>
          <div className="flex justify-between text-[11px] leading-normal text-black/50">
            <dt>Tax</dt>
            <dd className="m-0">{formatPrice(TAX)}</dd>
          </div>
          <div className="h-px w-full bg-black/25" />
          <div className="flex justify-between">
            <dt>Total</dt>
            <dd className="m-0">{formatPrice(total)}</dd>
          </div>
        </dl>
      </div>

      <ul className="flex items-center justify-center gap-[12px]" aria-label="Accepted payment methods">
        {PAYMENT_MARKS.map((mark) => (
          <li key={mark.src} className="flex">
            <Image src={mark.src} alt={mark.alt} width={35} height={25} style={{ width: 35, height: 25 }} />
          </li>
        ))}
      </ul>

      <button
        type="submit"
        form={formId}
        className="flex w-full items-center justify-center bg-black p-[12px] font-gotham text-paragraph text-white hover:opacity-80 transition-opacity"
      >
        Confirm order
      </button>

      <p className="m-0 text-black/50">
        Your personal data will be used to process your order, support your experience throughout this website, and for other purposes
        described in our{" "}
        <Link href="/privacy" className="text-black underline">
          privacy policy
        </Link>
        .
      </p>
    </aside>
  );
}
