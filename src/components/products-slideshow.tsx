"use client";

import Link from "next/link";
import ProductCard from "./product-card";
import { PrevNextControls, useScroller } from "./use-scroller";

export type SlideshowProduct = {
  /** Stable unique id, used as the React key. */
  id: string;
  name: string;
  price: string;
  /** Previous price, shown struck-out in light grey next to the current one. */
  compareAtPrice?: string;
  /** Colour swatches as CSS colours, drawn as 8px squares. */
  colors?: string[];
  image: { src: string; alt: string };
  href: string;
};

/**
 * Figma "Products slideshow desktop" (41:855) and "Products slideshow mobile" (41:2082).
 * One horizontal scroller: cards fill the width below `md` with Previous/Next controls,
 * and sit three across from `md` up with a "See all" link.
 */
export default function ProductsSlideshow({
  title = "You may also like",
  products,
  seeAllHref = "/shop",
  className = "",
}: {
  title?: string;
  products: SlideshowProduct[];
  seeAllHref?: string;
  className?: string;
}) {
  const { ref: scrollerRef, canPrev, canNext, scrollByItem } = useScroller(10);

  return (
    <section className={`flex w-full flex-col gap-[12px] px-[24px] font-gotham text-paragraph text-black md:px-[42px] ${className}`}>
      <div className="flex items-center justify-between">
        <h2 className="m-0 font-gotham text-paragraph">{title}</h2>

        {/* Mobile: Previous / Next */}
        <PrevNextControls canPrev={canPrev} canNext={canNext} onPrev={() => scrollByItem(-1)} onNext={() => scrollByItem(1)} className="md:hidden" />

        {/* Desktop: See all → */}
        <Link href={seeAllHref} className="hidden items-center gap-[10px] hover:opacity-70 transition-opacity md:flex">
          See all
          <ArrowRight />
        </Link>
      </div>

      <div
        ref={scrollerRef}
        className="flex h-[517px] snap-x snap-mandatory items-end gap-[10px] overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            className="h-full w-full shrink-0 snap-start md:w-[calc((100%-20px)/3)]"
            wellClassName="min-h-0 flex-1"
            imageSizes="(min-width: 768px) 33vw, 100vw"
          />
        ))}
      </div>
    </section>
  );
}

/** 24px arrow from the Figma "See all" link. */
function ArrowRight() {
  return (
    <svg width={25} height={7.364} viewBox="0 0 25 7.36396" fill="none" aria-hidden>
      <path
        d="M0.5 3.18198C0.223858 3.18198 0 3.40584 0 3.68198C0 3.95812 0.223858 4.18198 0.5 4.18198V3.68198V3.18198ZM24.8536 4.03553C25.0488 3.84027 25.0488 3.52369 24.8536 3.32843L21.6716 0.146447C21.4763 -0.0488155 21.1597 -0.0488155 20.9645 0.146447C20.7692 0.341709 20.7692 0.658291 20.9645 0.853554L23.7929 3.68198L20.9645 6.51041C20.7692 6.70567 20.7692 7.02225 20.9645 7.21751C21.1597 7.41278 21.4763 7.41278 21.6716 7.21751L24.8536 4.03553ZM0.5 3.68198V4.18198H24.5V3.68198V3.18198H0.5V3.68198Z"
        fill="currentColor"
      />
    </svg>
  );
}
