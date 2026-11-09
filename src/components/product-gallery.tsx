"use client";

import Image from "next/image";
import { useScroller } from "./use-scroller";
import { mediaStyle, type MediaTransform } from "@/lib/media-transform";

/**
 * Product image well from the Figma product page, with the black "current image" line beneath.
 * Swipe or scroll horizontally between images; the line shows which one is in view.
 */
export default function ProductGallery({
  images,
  className = "",
}: {
  images: ({ src: string; alt: string } & MediaTransform)[];
  className?: string;
}) {
  const { ref, index } = useScroller(0);

  return (
    <div className={`relative h-full w-full ${className}`}>
      <div
        ref={ref}
        className="flex h-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {images.map((image, i) => (
          <div
            key={`${image.src}-${i}`}
            className="flex h-full w-full shrink-0 snap-start items-center justify-center overflow-hidden bg-[var(--photo-bg,#f7f7f7)] px-[24px] py-[24px] md:py-[120px]"
          >
            <div className="relative h-full w-full shrink-0" style={mediaStyle(image)}>
              <Image
                src={image.src}
                alt={image.alt}
                fill
                sizes="(min-width: 768px) 720px, 100vw"
                preload={i === 0}
                className="object-contain"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Current image line */}
      <div aria-hidden className="absolute bottom-0 left-0 h-[4px] w-full md:h-[6px]">
        <div
          className="h-full bg-black transition-transform"
          style={{ width: `${100 / images.length}%`, transform: `translateX(${index * 100}%)` }}
        />
      </div>
    </div>
  );
}
