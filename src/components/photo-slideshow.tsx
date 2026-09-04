"use client";

import Image from "next/image";
import { PrevNextControls, useScroller } from "./use-scroller";

/**
 * Previous/Next row of lifestyle photos from the Figma product page:
 * 244px cards at 271px tall on mobile, three across at 517px tall on desktop.
 */
export default function PhotoSlideshow({
  photos,
  className = "",
}: {
  photos: { src: string; alt: string }[];
  className?: string;
}) {
  const { ref, canPrev, canNext, scrollByItem } = useScroller(10);

  return (
    <section className={`flex w-full flex-col gap-[12px] px-[24px] md:px-[42px] ${className}`}>
      <PrevNextControls
        canPrev={canPrev}
        canNext={canNext}
        onPrev={() => scrollByItem(-1)}
        onNext={() => scrollByItem(1)}
        className="justify-end"
      />
      <div
        ref={ref}
        className="flex h-[271px] snap-x snap-mandatory gap-[10px] overflow-x-auto md:h-[517px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {photos.map((photo) => (
          <div
            key={photo.src}
            className="relative h-full w-[244px] shrink-0 snap-start overflow-hidden bg-[#f7f7f7] md:w-[calc((100%-20px)/3)]"
          >
            <Image src={photo.src} alt={photo.alt} fill sizes="(min-width: 768px) 33vw, 244px" className="object-cover" />
          </div>
        ))}
      </div>
    </section>
  );
}
