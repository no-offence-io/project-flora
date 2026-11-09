"use client";

import Image from "next/image";
import { isDefaultTransform, mediaStyle, type MediaTransform } from "@/lib/media-transform";
import { useId, useState } from "react";
import Chevron from "./chevron";

export type DropdownListItem = {
  title: string;
  /** Body copy. Pass an array to render several paragraphs with the Figma 10px gap. */
  content: string | string[];
  /** Optional photo shown under the body copy, as in the Figma "With photo" variant. */
  image?: { src: string; alt: string } & MediaTransform;
};

/**
 * Accordion from Figma "Dropdown list desktop" (194:1458) and "Dropdown list mobile" (194:1525).
 * Both frames share one layout; only the width differs, so the component fills its container.
 */
export default function DropdownList({
  items,
  defaultOpen = 0,
  className = "",
}: {
  items: DropdownListItem[];
  /** Index of the item open on first render, or null for all closed. */
  defaultOpen?: number | null;
  className?: string;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(defaultOpen);
  const baseId = useId();

  return (
    <div className={`flex w-full flex-col font-gotham text-paragraph text-black ${className}`}>
      {items.map((item, index) => {
        const isOpen = openIndex === index;
        const number = String(index + 1).padStart(2, "0");
        const paragraphs = Array.isArray(item.content) ? item.content : [item.content];
        const buttonId = `${baseId}-button-${index}`;
        const panelId = `${baseId}-panel-${index}`;

        return (
          <div
            key={item.title}
            className={`border-t border-black/20 ${index === items.length - 1 ? "border-b" : ""}`}
          >
            <h3 className="m-0">
              <button
                type="button"
                id={buttonId}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpenIndex(isOpen ? null : index)}
                className="flex w-full cursor-pointer items-start gap-[12px] py-[12px] text-left"
              >
                <span className="shrink-0 whitespace-nowrap">{number}</span>
                <span className="flex-1">{item.title}</span>
                <Chevron open={isOpen} className="mt-[5px]" />
              </button>
            </h3>

            <div id={panelId} role="region" aria-labelledby={buttonId} hidden={!isOpen}>
              <div className="flex flex-col gap-[10px] pr-[24px] pb-[12px] pl-[28px] text-black/70">
                {paragraphs.map((paragraph, i) => (
                  <p key={i}>{paragraph}</p>
                ))}
                {item.image && (
                  <div className="relative aspect-[459/517] w-full overflow-hidden bg-[#f7f7f7]">
                    {isDefaultTransform(item.image) ? (
                      /* Figma zooms the photo to 182% of the box width; the wrapper reproduces that crop. */
                      <div className="absolute top-0 left-[-40.82%] aspect-[2432/3626] w-[181.56%] -translate-y-[19.3%]">
                        <Image src={item.image.src} alt={item.image.alt} fill sizes="(min-width: 768px) 521px, 100vw" className="object-cover" />
                      </div>
                    ) : (
                      /* Placed in the dashboard's media editor: drawn as the editor showed it, the whole box as the frame. */
                      <Image src={item.image.src} alt={item.image.alt} fill sizes="(min-width: 768px) 521px, 100vw" className="object-cover" style={mediaStyle(item.image)} />
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
