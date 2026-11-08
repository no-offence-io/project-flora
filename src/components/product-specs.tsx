"use client";

import { useState, type ReactNode } from "react";
import Chevron from "./chevron";
import Collapse from "./collapse";
import type { ProductSpec } from "@/lib/catalog-types";

/** A row the caller controls, opening below the label on every screen size (the measurements form). */
export type SpecsExtraRow = { label: string; open: boolean; onToggle: () => void; children: ReactNode };

/**
 * Specification rows from the Figma product page. Desktop shows label and value side by side;
 * mobile turns expandable rows into an accordion, with the first one open. An `extra` row, if
 * given, closes the list: it looks like the others but holds whatever the caller puts in it.
 */
export default function ProductSpecs({ specs, extra, className = "" }: { specs: ProductSpec[]; extra?: SpecsExtraRow; className?: string }) {
  const firstExpandable = specs.findIndex((spec) => spec.expandable);
  const [openIndex, setOpenIndex] = useState<number | null>(firstExpandable === -1 ? null : firstExpandable);

  return (
    <dl className={`m-0 flex flex-col font-gotham text-paragraph text-black ${className}`}>
      {specs.map((spec, index) => {
        const isOpen = openIndex === index;
        const valueColor = spec.emphasis ? "text-black" : "text-black/50";
        const rowVisibility = spec.hideOnMobile ? "hidden md:flex" : "flex";

        return (
          <div key={spec.label} className={`${rowVisibility} flex-col border-t border-black/20 last:border-b md:flex-row md:items-center md:gap-[10px] md:py-[5px]`}>
            {spec.expandable ? (
              <>
                {/* Mobile: toggle row */}
                <dt className="md:hidden">
                  <button type="button" aria-expanded={isOpen} onClick={() => setOpenIndex(isOpen ? null : index)} className="flex w-full items-center justify-between py-[12px] text-left">
                    {spec.label}
                    <Chevron open={isOpen} />
                  </button>
                </dt>
                {spec.value && (
                  <dd className={`m-0 md:hidden ${valueColor}`}>
                    <Collapse open={isOpen}>
                      <div className="pb-[12px]">{spec.value}</div>
                    </Collapse>
                  </dd>
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
      {extra && (
        <div className="flex flex-col border-t border-black/20 last:border-b">
          <dt>
            <button type="button" aria-expanded={extra.open} onClick={extra.onToggle} className="flex w-full items-center justify-between py-[12px] text-left md:py-[5px]">
              {extra.label}
              <Chevron open={extra.open} />
            </button>
          </dt>
          <dd className="m-0">
            <Collapse open={extra.open}>
              <div className="pt-[4px] pb-[18px] md:pt-[12px]">{extra.children}</div>
            </Collapse>
          </dd>
        </div>
      )}
    </dl>
  );
}
