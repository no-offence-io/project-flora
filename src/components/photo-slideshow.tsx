"use client";

import Image from "next/image";
import { useEffect, useRef, type RefObject } from "react";
import { PrevNextControls, useScroller } from "./use-scroller";

/** How far a photo may slide inside its card, as a share of the card's width; the photo is that much wider on each side. */
const DRIFT = 0.12;

type ViewTimelineCtor = new (options: { subject: Element; axis?: "block" | "inline" }) => AnimationTimeline;
const isWebKit = () => typeof navigator !== "undefined" && navigator.vendor.startsWith("Apple");

/*
 * A sideways parallax for the swipe: each photo, cut a little wider than its card, slides inside
 * the card against the direction of travel, so the cards glide past while the photos seem to turn
 * with you. Compositor-driven through a view timeline of each card along the scroller's inline
 * axis in Chrome; on WebKit (where such an animation inside a horizontal scroller left photos
 * unpainted on iPhone) and anywhere without the API, a scroll listener eases the photo towards
 * where it should be with a short lag, which smooths the uneven scroll events of a touch swipe.
 * Still for visitors who prefer reduced motion.
 */
function useSwipeParallax(scroller: RefObject<HTMLDivElement | null>, count: number) {
  const photos = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const track = scroller.current;
    const layers = photos.current.slice(0, count).filter((el): el is HTMLDivElement => el !== null);
    if (!track || layers.length === 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // The drift as a share of the photo's own (wider) width, for the percent keyframes.
    const pct = (DRIFT / (1 + 2 * DRIFT)) * 100;
    const ViewTimeline = (window as unknown as { ViewTimeline?: ViewTimelineCtor }).ViewTimeline;
    if (ViewTimeline && !isWebKit()) {
      const animations: Animation[] = [];
      try {
        for (const el of layers) {
          el.style.transform = "";
          animations.push(el.animate([{ transform: `translateX(${-pct}%)` }, { transform: `translateX(${pct}%)` }], { timeline: new ViewTimeline({ subject: el.parentElement!, axis: "inline" }), fill: "both" }));
        }
        return () => animations.forEach((a) => a.cancel());
      } catch {
        animations.forEach((a) => a.cancel());
      }
    }

    const LAG = 0.08;
    const current = layers.map(() => 0);
    let frame = 0;
    let last = 0;
    const wanted = (el: HTMLDivElement) => {
      const card = el.parentElement!;
      const width = track.clientWidth;
      const offset = card.getBoundingClientRect().left - track.getBoundingClientRect().left;
      // Zero with the card centred in the scroller, the full drift at either end of its trip across it.
      const centre = (width - card.offsetWidth) / 2;
      const half = (width + card.offsetWidth) / 2;
      const limit = DRIFT * card.offsetWidth;
      return Math.max(-limit, Math.min(limit, (-(offset - centre) / half) * limit));
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
  const layers = useSwipeParallax(ref, photos.length);

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
        {photos.map((photo, i) => (
          <div
            key={photo.src}
            className="relative h-full w-[244px] shrink-0 snap-start overflow-hidden bg-[#f7f7f7] md:w-[calc((100%-20px)/3)]"
          >
            {/* Wider than the card by the drift on each side, so no edge shows as it slides. */}
            <div
              ref={(el) => {
                layers.current[i] = el;
              }}
              data-swipe-photo
              className="absolute inset-y-0"
              style={{ left: `${-DRIFT * 100}%`, width: `${(1 + 2 * DRIFT) * 100}%` }}
            >
              <Image src={photo.src} alt={photo.alt} fill sizes="(min-width: 768px) 40vw, 300px" className="object-cover" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
