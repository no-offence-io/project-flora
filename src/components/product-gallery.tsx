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
 * the scroller otherwise. Still for visitors who prefer reduced motion.
 *
 * WebKit always gets the listener: on iPhone Safari a view-timeline animation on a layer inside
 * this horizontal scroller left the photos unpainted altogether (the page's own vertical one on
 * the hero is a different case: a block-axis timeline on the page scroller). The listener's
 * transform is a plain style change, which Safari paints like anything else.
 */
const isWebKit = () => typeof navigator !== "undefined" && navigator.vendor.startsWith("Apple");
function useSwipeParallax(scroller: RefObject<HTMLDivElement | null>, count: number) {
  const photos = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const track = scroller.current;
    const layers = photos.current.slice(0, count).filter((el): el is HTMLDivElement => el !== null);
    if (!track || layers.length === 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ViewTimeline = (window as unknown as { ViewTimeline?: ViewTimelineCtor }).ViewTimeline;
    if (ViewTimeline && !isWebKit()) {
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

    // Scroll events arrive a frame behind the compositor's scrolling, and on iPhone irregularly,
    // so a transform set straight from each one jumps back and forth as the finger moves. The
    // photo instead eases towards where it should be with a short lag (a time constant of about
    // 80ms): the jumps are smoothed away and the photo feels as if it has a little weight.
    const LAG = 0.08;
    const current = layers.map(() => 0);
    let frame = 0;
    let last = 0;
    const wanted = (el: HTMLDivElement) => {
      const slide = el.parentElement!;
      // Where the slide sits: 0 when in place, a slide's width when one slide to the right. The
      // drift is the same share of the photo's width as the timeline's percent keyframes.
      const offset = slide.offsetLeft - track.scrollLeft;
      const limit = DRIFT * el.clientWidth;
      return Math.max(-limit, Math.min(limit, (-offset / slide.offsetWidth) * limit));
    };
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const k = 1 - Math.exp(-dt / LAG);
      let settled = true;
      layers.forEach((el, i) => {
        const target = wanted(el);
        current[i] += (target - current[i]) * k;
        if (Math.abs(target - current[i]) < 0.05) current[i] = target;
        else settled = false;
        el.style.transform = `translateX(${current[i].toFixed(2)}px)`;
      });
      frame = settled ? 0 : requestAnimationFrame(tick);
    };
    const schedule = () => {
      if (frame) return;
      last = performance.now();
      frame = requestAnimationFrame(tick);
    };
    // Settle into place at once on arrival; a reload can land mid-track.
    layers.forEach((el, i) => {
      current[i] = wanted(el);
      el.style.transform = `translateX(${current[i].toFixed(2)}px)`;
    });
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
