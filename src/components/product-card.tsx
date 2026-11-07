"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import SaleBadge from "./sale-badge";
import TextScroll from "./text-scroll";
import { useScroller } from "./use-scroller";
import type { SlideshowProduct } from "./products-slideshow";
import { useT } from "@/components/i18n-provider";

const MOBILE_SWATCHES = 2;

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
  wellBackground = "bg-[#f7f7f7]",
  imageSizes = "(min-width: 768px) 33vw, 50vw",
  allowImageScroll = true,
}: {
  product: SlideshowProduct;
  className?: string;
  wellClassName?: string;
  /** The colour behind the photo: the shop's pale grey, or near-black for vintage pieces. */
  wellBackground?: string;
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

  // Colour tiles are always there at opacity 0, so they can cross-fade, but each one's photo is only
  // requested the first time its swatch is hovered: most visitors never see most colours.
  const [activeColor, setActiveColor] = useState<number | null>(null);
  const [wanted, setWanted] = useState<ReadonlySet<number>>(new Set());
  const showColor = (i: number) => {
    setActiveColor(i);
    setWanted((seen) => (seen.has(i) ? seen : new Set(seen).add(i)));
  };

  return (
    <div className={`flex flex-col gap-[12px] font-gotham text-paragraph text-black ${className}`}>
      {/*
        The well itself carries no padding: each slide pads and backgrounds itself instead, so the
        whole padded box travels together when sliding. Padding on the well would leave a static
        strip of background sitting still at each edge while only the image underneath moved.
      */}
      <Link href={product.href} className={`relative flex w-full items-center justify-center ${wellClassName}`}>
        <div className="relative h-full w-full overflow-hidden">
          {allowImageScroll && slides.length > 1 ? (
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
                  className={`flex h-full w-full shrink-0 snap-start items-center justify-center ${wellBackground} px-[24px] py-[42px]`}
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
            <div className={`flex h-full w-full items-center justify-center ${wellBackground} px-[24px] py-[42px]`}>
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
              className={`pointer-events-none absolute inset-0 flex items-center justify-center ${wellBackground} px-[24px] py-[42px] transition-opacity duration-300`}
              style={{ opacity: activeColor === i ? 1 : 0 }}
            >
              <div className="relative h-full w-full">
                {wanted.has(i) && <Image src={color.image.src} alt="" fill sizes={imageSizes} className="object-contain" />}
              </div>
            </div>
          ))}
        </div>
        {product.compareAtPrice && <SaleBadge className="absolute top-[12px] right-[12px]" />}
      </Link>

      <div className="flex min-w-0 items-start gap-[12px] md:gap-[24px]">
        <Link href={product.href} className="flex min-w-0 flex-1 flex-col gap-[12px] whitespace-nowrap">
          <TextScroll text={product.name} />
          <span className="flex gap-[12px]">
            <span>{product.price}</span>
            {product.compareAtPrice && <s className="text-[#c7c7c7]">{product.compareAtPrice}</s>}
            {product.soldOut && <span className="text-black/50">{t("product.soldOut")}</span>}
          </span>
        </Link>
        {product.colors && product.colors.length > 0 && (
          <ul className="flex shrink-0 items-center gap-[8px] md:max-w-[50%] md:flex-wrap md:justify-end" aria-label={t("product.colours")}>
            {product.colors.map((color, i) => (
              // Two swatches on a phone's half-width card, then a count; all of them from `md`.
              <li key={color.hex} className={i < MOBILE_SWATCHES ? "flex" : "hidden md:flex"}>
                <button
                  type="button"
                  aria-label={color.name}
                  onMouseEnter={() => showColor(i)}
                  onMouseLeave={() => setActiveColor(null)}
                  onFocus={() => showColor(i)}
                  onBlur={() => setActiveColor(null)}
                  className="size-[8px] shrink-0 outline-offset-2 transition-transform hover:scale-125 focus-visible:scale-125"
                  style={{ backgroundColor: color.hex }}
                />
              </li>
            ))}
            {product.colors.length > MOBILE_SWATCHES && (
              <li aria-hidden className="text-[11px] leading-[8px] md:hidden">+{product.colors.length - MOBILE_SWATCHES}</li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
