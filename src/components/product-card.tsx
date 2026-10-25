"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import SaleBadge from "./sale-badge";
import { useScroller } from "./use-scroller";
import type { SlideshowProduct } from "./products-slideshow";
import { useT } from "@/components/i18n-provider";

/**
 * Product card from Figma: grey image well, name, price (with optional struck compare price) and colour swatches.
 *
 * The well is the same native horizontal snap-scroll strip as the product page gallery
 * ({@link "./product-gallery"}) — trackpad, touch, and drag-scroll all move between the product's own
 * photographed angles for free, no custom gesture code needed. It's not hinted at visually;
 * discovering it is the point. Colour is entirely separate: hovering or focusing a swatch
 * cross-fades an overlay showing that colour's photo, always, regardless of which angle the strip
 * itself is currently on — colour never changes what you can slide through, and sliding never
 * changes the colour.
 */
export default function ProductCard({
  product,
  className = "",
  wellClassName = "",
  imageSizes = "(min-width: 768px) 33vw, 50vw",
  allowImageScroll = true,
}: {
  product: SlideshowProduct;
  className?: string;
  wellClassName?: string;
  imageSizes?: string;
  /**
   * Set false to show only the default photo with no scroll strip. Used inside a horizontally
   * scrolling row (see `ProductsSlideshow`) so a card's own angles don't compete with the
   * gesture that scrolls between products — that row is the thing meant to be scrolled there.
   */
  allowImageScroll?: boolean;
}) {
  const t = useT();
  const slides = product.images && product.images.length > 0 ? product.images : [product.image];
  const { ref } = useScroller(0);

  // All colour photos are pre-mounted at opacity 0 (not created on first hover), for two reasons:
  // an element switching opacity has something to transition from, and `loading="eager"` starts
  // fetching them the moment the card renders, so by the time anyone actually hovers, the photo
  // is already decoded — otherwise the first hover always shows a blank flash while it loads.
  const [activeColor, setActiveColor] = useState<number | null>(null);

  return (
    <div className={`flex flex-col justify-end gap-[12px] font-gotham text-paragraph text-black ${className}`}>
      {/*
        The well itself carries no padding: each slide pads and backgrounds itself instead, so the
        whole padded box travels together when sliding. Padding on the well would leave a static
        strip of background sitting still at each edge while only the image underneath moved.
      */}
      <Link href={product.href} className={`relative flex w-full items-center justify-center ${wellClassName}`}>
        <div className="relative h-full w-full overflow-hidden">
          {allowImageScroll ? (
            // A real scroll container, only ever used standalone (the shop grid), never inside a
            // horizontally-scrolling row — `overscroll-behavior-x: contain` stops a swipe here
            // from also nudging the page, which is safe exactly because there's no scrollable
            // slideshow ancestor for it to (rightly) block in that context.
            <div
              ref={ref}
              className="flex h-full snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [overscroll-behavior-x:contain] [&::-webkit-scrollbar]:hidden"
            >
              {slides.map((image, i) => (
                <div
                  key={`${image.src}-${i}`}
                  className="flex h-full w-full shrink-0 snap-start items-center justify-center bg-[#f7f7f7] px-[24px] py-[42px]"
                >
                  <div className="relative h-full w-full">
                    <Image src={image.src} alt={image.alt} fill sizes={imageSizes} className="object-contain" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // No scroll container at all — inside a slideshow row, a wheel/touch gesture here must
            // reach that row's own scroller untouched, not be captured or contained by this card.
            <div className="flex h-full w-full items-center justify-center bg-[#f7f7f7] px-[24px] py-[42px]">
              <div className="relative h-full w-full">
                <Image src={product.image.src} alt={product.image.alt} fill sizes={imageSizes} className="object-contain" />
              </div>
            </div>
          )}

          {/*
            Swatch-hover colour previews: fade in over the strip without moving it, so a manual
            swipe position is never lost. Every colour is mounted up front (see the state comment
            above) rather than only the currently hovered one.
          */}
          {product.colors?.map((color, i) => (
            <div
              key={color.hex}
              aria-hidden
              className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[#f7f7f7] px-[24px] py-[42px] transition-opacity duration-300"
              style={{ opacity: activeColor === i ? 1 : 0 }}
            >
              <div className="relative h-full w-full">
                <Image src={color.image.src} alt="" fill sizes={imageSizes} loading="eager" preload className="object-contain" />
              </div>
            </div>
          ))}
        </div>
        {product.compareAtPrice && <SaleBadge className="absolute top-[12px] right-[12px]" />}
      </Link>

      <div className="flex items-start gap-[24px]">
        <Link href={product.href} className="flex flex-col gap-[12px] whitespace-nowrap">
          <span>{product.name}</span>
          <span className="flex gap-[12px]">
            <span>{product.price}</span>
            {product.compareAtPrice && <s className="text-[#c7c7c7]">{product.compareAtPrice}</s>}
            {product.soldOut && <span className="text-black/50">{t("product.soldOut")}</span>}
          </span>
        </Link>
        {product.colors && product.colors.length > 0 && (
          <ul className="flex items-center gap-[8px]" aria-label={t("product.colours")}>
            {product.colors.map((color, i) => (
              <li key={color.hex} className="flex">
                <button
                  type="button"
                  aria-label={color.name}
                  onMouseEnter={() => setActiveColor(i)}
                  onMouseLeave={() => setActiveColor(null)}
                  onFocus={() => setActiveColor(i)}
                  onBlur={() => setActiveColor(null)}
                  className="size-[8px] shrink-0 outline-offset-2 transition-transform hover:scale-125 focus-visible:scale-125"
                  style={{ backgroundColor: color.hex }}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
