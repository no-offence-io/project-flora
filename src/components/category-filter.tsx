"use client";

import { useState } from "react";
import { CATEGORIES, type Category } from "@/lib/catalog-types";
import { useT } from "@/components/i18n-provider";
import RolloverText from "./rollover-text";

export type CategorySelection = Category | "All";

const ROWS: CategorySelection[] = [...CATEGORIES, "All"];

/**
 * Category list from the Figma products page. Desktop shows it as a sidebar under a
 * "Product Categories" title; mobile hides it behind a right-aligned "Filter" toggle.
 */
export default function CategoryFilter({
  value,
  onChange,
  className = "",
}: {
  value: CategorySelection;
  onChange: (value: CategorySelection) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const t = useT();
  const labelOf = (row: CategorySelection) => (row === "All" ? t("shop.all") : t(`category.${row}` as const));

  const list = (
    <ul className="flex w-full flex-col font-gotham text-paragraph text-black">
      {ROWS.map((row, index) => {
        const active = row === value;
        const last = index === ROWS.length - 1;
        return (
          <li
            key={row}
            className={`border-t border-black/20 ${last ? "border-b border-b-black/20" : ""} ${active ? "border-b-[0.5px] border-b-black" : ""}`}
          >
            <button
              type="button"
              aria-pressed={active}
              onClick={() => {
                onChange(row);
                setOpen(false);
              }}
              className={`flex h-[26px] w-full items-center text-left transition-opacity ${active ? "text-black" : "text-black/50 hover:text-black"}`}
            >
              <RolloverText text={labelOf(row)} />
            </button>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className={className}>
      {/* Desktop sidebar */}
      <div className="hidden flex-col gap-[24px] md:flex">
        <p className="font-gotham text-paragraph text-black">{t("shop.categories")}</p>
        {list}
      </div>

      {/* Mobile toggle */}
      <div className="flex flex-col gap-[24px] md:hidden">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="flex items-center justify-end gap-[12px] font-gotham text-paragraph text-black"
        >
          {t("shop.filter")}
          <svg
            width={9}
            height={11}
            viewBox="0 0 9 11"
            fill="none"
            aria-hidden
          >
            <path strokeLinecap="round" d="M0.5 1.61111H3.5M3.5 1.61111C3.5 2.22476 3.9477 2.72222 4.5 2.72222C5.0523 2.72222 5.5 2.22476 5.5 1.61111M3.5 1.61111C3.5 0.997461 3.9477 0.5 4.5 0.5C5.0523 0.5 5.5 0.997461 5.5 1.61111M5.5 1.61111H8.5M0.5 5.5H6.5M6.5 5.5C6.5 6.11367 6.9477 6.61111 7.5 6.61111C8.0523 6.61111 8.5 6.11367 8.5 5.5C8.5 4.88633 8.0523 4.38889 7.5 4.38889C6.9477 4.38889 6.5 4.88633 6.5 5.5ZM2.5 9.38889H8.5M2.5 9.38889C2.5 8.77522 2.05229 8.27778 1.5 8.27778C0.947715 8.27778 0.5 8.77522 0.5 9.38889C0.5 10.0026 0.947715 10.5 1.5 10.5C2.05229 10.5 2.5 10.0026 2.5 9.38889Z" stroke="black" strokeWidth={1} />
          </svg>
        </button>
        {open && list}
      </div>
    </div>
  );
}
