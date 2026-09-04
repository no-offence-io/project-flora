"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "./cart-context";

/** Black circle with a white cross, from Figma "Frame 90" (16px). */
function RemoveIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 16 16" aria-hidden>
      <rect width={16} height={16} rx={8} fill="black" />
      <path d="M5.46369 5L11 10.4208L10.5363 10.8748L5 5.45402L5.46369 5Z" fill="white" />
      <path d="M10.5363 5.1252L5.00005 10.546L5.46374 11L11 5.57922L10.5363 5.1252Z" fill="white" />
    </svg>
  );
}

/** Tiny down-arrow from the quantity control. */
function QtyArrow() {
  return (
    <svg width={6.5} height={2.55} viewBox="0 0 6.50005 2.55049" fill="none" aria-hidden className="shrink-0">
      <path d="M6.25003 0.250027L3.25003 2.25003L0.250027 0.250027" stroke="black" strokeWidth={0.5} strokeLinecap="round" />
    </svg>
  );
}

/** Cart rows from the Figma order summary: thumbnail, name, measurements, quantity control and remove cross. */
export default function CartItems({ className = "" }: { className?: string }) {
  const { items, setQuantity, remove } = useCart();

  if (items.length === 0) {
    return <p className={`m-0 font-gotham text-paragraph text-black/50 ${className}`}>Your cart is empty.</p>;
  }

  return (
    <ul className={`flex flex-col gap-[12px] font-gotham text-paragraph text-black ${className}`}>
      {items.map((item) => (
        <li key={item.id} className="relative flex gap-[12px] border-[0.25px] border-black/25 p-[12px]">
          <div className="flex w-[84px] shrink-0 items-center justify-center self-stretch bg-[#f7f7f7] p-[12px]">
            <div className="relative h-full min-h-[84px] w-full">
              <Image src={item.image.src} alt={item.image.alt} fill sizes="84px" className="object-contain" />
            </div>
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-[12px]">
            <p className="m-0">
              <Link href={item.href} className="hover:opacity-70 transition-opacity">
                {item.name}
                {item.variant ? ` - ${item.variant}` : ""} x {item.quantity}
              </Link>
            </p>
            <ul className="flex flex-col gap-[5px] text-[11px] leading-normal whitespace-nowrap">
              {item.attributes.map((attr) => (
                <li key={attr.label}>
                  {attr.label}: <span className="text-black/50">{attr.value}</span>
                </li>
              ))}
            </ul>
            <label className="relative inline-flex w-max items-center gap-[6px] border-[0.25px] border-black px-[8px] py-[4px]">
              <span className="sr-only">Quantity for {item.name}</span>
              <select
                value={item.quantity}
                onChange={(event) => setQuantity(item.id, Number(event.target.value))}
                className="appearance-none bg-transparent pr-[14px] font-gotham text-paragraph outline-none"
              >
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n} qty
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-[6px]">
                <QtyArrow />
              </span>
            </label>
          </div>

          <button
            type="button"
            onClick={() => remove(item.id)}
            aria-label={`Remove ${item.name}`}
            className="absolute -top-[8px] -right-[8px] hover:opacity-70 transition-opacity"
          >
            <RemoveIcon />
          </button>
        </li>
      ))}
    </ul>
  );
}
