"use client";

import Image from "next/image";
import { mediaStyle, type MediaTransform } from "@/lib/media-transform";
import { useEffect, useRef, useState } from "react";

export type ScrollyValue = {
  title: string;
  description: string;
  image: { src: string; alt: string } & MediaTransform;
};

/**
 * Scrollytelling take on the values section: from `md` up the visuals pin to the viewport while the
 * text scrolls past them, each block swapping the pinned image beneath it.
 *
 * The two tracks are grid columns, so the visual column stretches to the full height of the text
 * column and its inner `sticky` element has that whole run to travel through. Each text block is a
 * viewport tall, which is what paces one value per screen of scrolling.
 *
 * An IntersectionObserver decides which value is current: its root margin collapses the viewport to
 * a line across the middle, so a block is "intersecting" exactly while it is the one crossing the
 * centre. The images are stacked and cross-faded on that index rather than mounted and unmounted,
 * so nothing has to load mid-scroll.
 *
 * Below `md` the whole conceit is dropped — no pinning, no stacking. Each value simply shows its own
 * image above its own text, since a sticky split-screen has nowhere to go on a phone.
 */
export default function ValuesScrolly({
  title = "Values",
  intro,
  values,
  className = "",
}: {
  title?: string;
  intro?: string;
  values: ScrollyValue[];
  className?: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const blockRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const blocks = blockRefs.current.filter((el): el is HTMLDivElement => el !== null);
    if (blocks.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const index = Number((entry.target as HTMLElement).dataset.index);
          if (!Number.isNaN(index)) setActiveIndex(index);
        }
      },
      // Collapse the root to a line across the viewport's middle: whichever block is crossing the
      // centre is the active one.
      { rootMargin: "-50% 0px -50% 0px", threshold: 0 },
    );
    blocks.forEach((block) => observer.observe(block));
    return () => observer.disconnect();
  }, [values.length]);

  const fade = (active: boolean) => (active ? "md:translate-y-0 md:opacity-100" : "md:opacity-40 md:motion-safe:translate-y-[12px]");

  return (
    <section className={`w-full ${className}`}>
      <div className="flex flex-col gap-[24px] px-[24px] md:px-[42px]">
        <h2 className="m-0 font-americana text-big-header-mobile capitalize text-black md:text-big-header-desktop">{title}</h2>
        {intro && <p className="w-full font-gotham text-paragraph text-black/70 md:w-[521px]">{intro}</p>}
      </div>

      {/* No `items-start` here: grid items must keep the default `stretch` so the visual column is
          as tall as the whole text column. Collapsed to its own content it would be exactly as tall
          as the sticky element inside it, leaving that element zero distance to travel — which
          looks precisely like sticky "not working". */}
      <div className="mt-[42px] md:grid md:grid-cols-2 md:gap-[42px] md:px-[42px]">
        {/* Pinned visual track, desktop only */}
        <div className="hidden md:block">
          <div className="sticky top-0 h-screen overflow-hidden bg-[#f7f7f7]">
            {values.map((value, i) => (
              <div
                key={value.image.src}
                aria-hidden
                className="absolute inset-0 [will-change:opacity] transition-opacity duration-700 ease-out"
                style={{ opacity: activeIndex === i ? 1 : 0 }}
              >
                <Image src={value.image.src} alt="" fill sizes="50vw" className="object-cover" style={mediaStyle(value.image)} />
              </div>
            ))}
          </div>
        </div>

        {/* Scrolling text track */}
        <div className="flex flex-col">
          {values.map((value, i) => (
            <div
              key={value.title}
              data-index={i}
              ref={(el) => {
                blockRefs.current[i] = el;
              }}
              className="flex flex-col justify-center gap-[24px] px-[24px] pb-[60px] md:relative md:h-screen md:px-0 md:pb-0"
            >
              {/* Mobile keeps each value's image with its own text instead of pinning it */}
              <div className="relative aspect-[4/5] w-full overflow-hidden bg-[#f7f7f7] md:hidden">
                <Image src={value.image.src} alt={value.image.alt} fill sizes="100vw" className="object-cover" style={mediaStyle(value.image)} />
              </div>

              {/* Desktop: the title sits at the very top left of the block, while the
                  text stays centred beside the photo. Phones keep title and text together. */}
              <div className="flex flex-col gap-[12px] md:contents">
                <h3 className={`m-0 font-americana text-big-header-mobile capitalize text-black transition-[opacity,transform] duration-500 ease-out md:absolute md:left-0 md:top-0 ${fade(activeIndex === i)}`}>{value.title}</h3>
                <p className={`m-0 max-w-[521px] font-gotham text-paragraph text-black/70 transition-[opacity,transform] duration-500 ease-out ${fade(activeIndex === i)}`}>{value.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
