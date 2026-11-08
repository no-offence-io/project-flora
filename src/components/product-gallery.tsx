"use client";

import Image from "next/image";
import { useEffect, useRef, type RefObject } from "react";
import { useScroller } from "./use-scroller";

/** How far a photo trails its slide mid-swipe, as a share of the slide's width. */
const DRIFT = 0.12;

type ViewTimelineCtor = new (options: { subject: Element; axis?: "block" | "inline" }) => AnimationTimeline;

/*
 * A sideways parallax for the swipe: each photo trails its slide a little, so the photos glide
 * past at their own pace instead of riding the slides like stickers, and settle centred as the
 * slide snaps in. Compositor-driven through a view timeline of each slide along the scroller's
 * inline axis where the browser has it (the same reasoning as parallax.tsx), a scroll listener on
 * the scroller otherwise. Still for visitors who prefer reduced motion. The slides clip with
 * overflow: hidden, the plain kind: iPhone Safari lost the photos, and the later slides' very
 * backgrounds, when they clipped with overflow: clip.
 */
function useSwipeParallax(scroller: RefObject<HTMLDivElement | null>, count: number) {
  const photos = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const track = scroller.current;
    const layers = photos.current.slice(0, count).filter((el): el is HTMLDivElement => el !== null);
    if (!track || layers.length === 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ViewTimeline = (window as unknown as { ViewTimeline?: ViewTimelineCtor }).ViewTimeline;
    if (ViewTimeline) {
      // Over a slide's trip across the scroller (entering from the right, leaving to the left) the
      // photo moves from a little left of centre to a little right of it: it is centred when the
      // slide is in place, and trails the finger on the way.
      const animations: Animation[] = [];
      try {
        for (const el of layers) {
          el.style.transform = "";
          animations.push(el.animate([{ transform: `translateX(${-DRIFT * 100}%)` }, { transform: `translateX(${DRIFT * 100}%)` }], { timeline: new ViewTimeline({ subject: el.parentElement!, axis: "inline" }), fill: "both" }));
        }
        return () => animations.forEach((a) => a.cancel());
      } catch {
        animations.forEach((a) => a.cancel());
      }
    }

    let frame = 0;
    const update = () => {
      frame = 0;
      for (const el of layers) {
        const slide = el.parentElement!;
        // Where the slide sits: 0 when in place, a slide's width when one slide to the right.
        const offset = slide.offsetLeft - track.scrollLeft;
        const limit = DRIFT * el.clientWidth;
        const shift = Math.max(-limit, Math.min(limit, -offset * DRIFT));
        el.style.transform = `translateX(${shift.toFixed(2)}px)`;
      }
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    track.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      track.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [scroller, count]);

  return photos;
}

/**
 * Product image well from the Figma product page, with the black "current image" line beneath.
 * Swipe or scroll horizontally between images; the line shows which one is in view.
 */
export default function ProductGallery({
  images,
  className = "",
}: {
  images: { src: string; alt: string }[];
  className?: string;
}) {
  const { ref, index } = useScroller(0);
  const photos = useSwipeParallax(ref, images.length);

  return (
    <div className={`relative h-full w-full ${className}`}>
      <div
        ref={ref}
        className="flex h-full snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {images.map((image, i) => (
          <div
            key={`${image.src}-${i}`}
            className="flex h-full w-full shrink-0 snap-start items-center justify-center overflow-hidden bg-[#f7f7f7] px-[24px] py-[24px] md:py-[120px]"
          >
            <div
              ref={(el) => {
                photos.current[i] = el;
              }}
              data-swipe-photo
              className="relative h-full w-full"
            >
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
