"use client";

import { useState } from "react";
import Chevron from "./chevron";
import type { ProductSpec } from "@/lib/catalog-types";

/**
 * Specification rows from the Figma product page. Desktop shows label and value side by side;
 * mobile turns expandable rows into an accordion, with the first one open.
 */
export default function ProductSpecs({ specs, className = "" }: { specs: ProductSpec[]; className?: string }) {
  const firstExpandable = specs.findIndex((spec) => spec.expandable);
  const [openIndex, setOpenIndex] = useState<number | null>(firstExpandable === -1 ? null : firstExpandable);

  return (
    <dl className={`m-0 flex flex-col font-gotham text-paragraph text-black ${className}`}>
      {specs.map((spec, index) => {
        const isOpen = openIndex === index;
        const valueColor = spec.emphasis ? "text-black" : "text-black/50";
        const rowVisibility = spec.hideOnMobile ? "hidden md:flex" : "flex";

        return (
          <div
            key={spec.label}
            className={`${rowVisibility} flex-col border-t border-black/20 last:border-b md:flex-row md:items-center md:gap-[10px] md:py-[5px]`}
          >
            {spec.expandable ? (
              <>
                {/* Mobile: toggle row */}
                <dt className="md:hidden">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    className="flex w-full items-center justify-between py-[12px] text-left"
                  >
                    {spec.label}
                    <Chevron open={isOpen} />
                  </button>
                </dt>
                {spec.value && (
                  <dd className={`m-0 pb-[12px] md:hidden ${valueColor} ${isOpen ? "" : "hidden"}`}>{spec.value}</dd>
                )}
                {/* Desktop: inline row */}
                <dt className="hidden w-[220px] shrink-0 md:block">{spec.label}</dt>
                <dd className={`m-0 hidden whitespace-nowrap md:block ${valueColor}`}>{spec.value}</dd>
              </>
            ) : (
              <>
                <dt className="flex items-center justify-between py-[12px] md:w-[220px] md:shrink-0 md:py-0">
                  {spec.label}
                  {spec.value && <span className={`md:hidden ${valueColor}`}>{spec.value}</span>}
                </dt>
                {spec.value && <dd className={`m-0 hidden whitespace-nowrap md:block ${valueColor}`}>{spec.value}</dd>}
              </>
            )}
          </div>
        );
      })}
    </dl>
  );
}
