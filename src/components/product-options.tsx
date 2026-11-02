"use client";

import { useEffect, useState, useRef } from "react";
import { Busy } from "./busy";
import { useCart } from "./cart-context";
import Chevron from "./chevron";
import RolloverText from "./rollover-text";
import { isSoldOut, type Product } from "@/lib/catalog-types";
import type { SizingSettings } from "@/lib/catalog";
import { useT } from "@/components/i18n-provider";

const FIELD = "w-full border border-black/20 bg-transparent p-[12px] font-gotham text-paragraph text-black outline-none placeholder:text-black/50 focus:border-black/60";
const CM = /^\d{1,3}([.,]\d)?$/;

/** Saving to the cart is instant; this short pause lets the press register. */
const ADD_PAUSE = 450;

/**
 * How the customer picks what to buy, then the black Add To Cart button from the Figma product page.
 * Made-to-measure products ask for the measurements Site settings lists (in cm); sized products show
 * their sizes as bordered chips with the empty ones struck through; one-size products just have the
 * button. Whatever was chosen rides along on the cart line and ends up on the order.
 */
export default function ProductOptions({ product, sizing, className = "" }: { product: Product; sizing: SizingSettings; className?: string }) {
  const { add } = useCart();
  const t = useT();
  const [size, setSize] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState<"idle" | "pending" | "done">("idle");
  const [guideOpen, setGuideOpen] = useState(false);
  const commit = useRef<(() => void) | null>(null);
  const soldOut = isSoldOut(product);

  useEffect(() => {
    if (adding === "idle") return;
    const timer = window.setTimeout(() => {
      if (adding === "pending") {
        commit.current?.();
        setAdding("done");
      } else setAdding("idle");
    }, adding === "pending" ? ADD_PAUSE : 1500);
    return () => window.clearTimeout(timer);
  }, [adding]);

  const onAdd = () => {
    if (product.sizing === "sizes") {
      if (!size) return setError(t("product.chooseSize"));
      commit.current = () => add(product, 1, { size });
    } else if (product.sizing === "measurements") {
      const measurements = sizing.fields.map((f) => ({ label: f.label, value: (values[f.label] ?? "").trim().replace(",", ".") }));
      if (measurements.some((m) => !CM.test(m.value))) return setError(t("product.addMeasurements"));
      commit.current = () => add(product, 1, { measurements });
    } else {
      commit.current = () => add(product);
    }
    setError(null);
    setAdding("pending");
  };

  const leftInStock = product.sizing === "sizes" ? (size ? product.sizes.find((s) => s.label === size)?.stock ?? 0 : null) : product.stock;

  return (
    <div className={`flex flex-col gap-[24px] font-gotham text-paragraph text-black ${className}`}>
      {product.sizing === "sizes" && !soldOut && (
        <div className="flex flex-col gap-[12px]">
          <span className="text-[11px] leading-normal">{t("product.size")}</span>
          <ul className="m-0 flex list-none flex-wrap gap-[8px] p-0" aria-label={t("product.size")}>
            {product.sizes.map((s) => {
              const out = s.stock <= 0;
              const active = size === s.label;
              return (
                <li key={s.label}>
                  <button
                    type="button"
                    disabled={out}
                    aria-pressed={active}
                    onClick={() => {
                      setSize(s.label);
                      setError(null);
                    }}
                    className={`min-w-[44px] border-[0.5px] px-[12px] py-[6px] transition-colors ${
                      out ? "cursor-not-allowed border-black/25 text-black/25 line-through" : active ? "border-black bg-black text-white" : "border-black text-black hover:bg-[#f7f7f7]"
                    }`}
                  >
                    {s.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {product.sizing === "measurements" && !soldOut && (
        <div className="flex flex-col gap-[12px]">
          <div className="flex flex-col gap-[5px]">
            <span className="text-[11px] leading-normal">{t("product.measurements")}</span>
            <span className="text-[11px] leading-normal text-black/50">{t("product.measurementsHint")}</span>
          </div>
          <div className="grid grid-cols-2 gap-[12px]">
            {sizing.fields.map((f) => (
              <label key={f.label} className="flex min-w-0 flex-col gap-[6px]">
                <span className="text-[11px] leading-normal">{f.label}</span>
                <span className="relative block">
                  <input
                    inputMode="decimal"
                    autoComplete="off"
                    value={values[f.label] ?? ""}
                    onChange={(e) => {
                      setValues((v) => ({ ...v, [f.label]: e.target.value }));
                      setError(null);
                    }}
                    placeholder="0"
                    className={`${FIELD} pr-[36px]`}
                  />
                  <span className="pointer-events-none absolute top-1/2 right-[12px] -translate-y-1/2 text-black/50">cm</span>
                </span>
                {f.hint && <span className="text-[11px] leading-normal text-black/50">{f.hint}</span>}
              </label>
            ))}
          </div>
          {sizing.sizeGuide && (
            <div className="border-t border-b border-black/20">
              <button type="button" aria-expanded={guideOpen} onClick={() => setGuideOpen((v) => !v)} className="flex w-full items-center justify-between py-[12px] text-left">
                {t("product.sizeGuide")}
                <Chevron open={guideOpen} />
              </button>
              {guideOpen && (
                <div className="flex flex-col gap-[10px] pb-[12px] text-black/70">
                  {sizing.sizeGuide.split(/\n\s*\n/).map((para, i) => (
                    <p key={i} className="m-0">
                      {para}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-[8px]">
        <button
          type="button"
          onClick={onAdd}
          disabled={soldOut}
          aria-live="polite"
          className="flex w-full items-center justify-center bg-black px-[12px] py-[8px] font-gotham text-paragraph text-white disabled:cursor-not-allowed disabled:bg-black/25"
        >
          <Busy state={adding} done={t("product.added")}>
            <RolloverText text={soldOut ? t("product.soldOut") : t("product.add")} />
          </Busy>
        </button>
        {error && (
          <p className="m-0 text-[11px] leading-normal text-[#b00020]" role="alert">
            {error}
          </p>
        )}
        {!soldOut && leftInStock !== null && leftInStock > 0 && leftInStock <= 3 && (
          <p className="m-0 text-[11px] leading-normal text-black/50">{t("product.leftInStock", { count: leftInStock })}</p>
        )}
      </div>
    </div>
  );
}
