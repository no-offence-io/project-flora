"use client";

import { useEffect, useState, useRef } from "react";
import { Busy } from "./busy";
import { useCart } from "./cart-context";
import Chevron from "./chevron";
import Collapse from "./collapse";
import RolloverText from "./rollover-text";
import ProductSpecs from "./product-specs";
import { isSoldOut, type Product, type ProductSpec } from "@/lib/catalog-types";
import type { SizingSettings } from "@/lib/catalog";
import { useT } from "@/components/i18n-provider";
import { useColourChoice } from "./product-colour";
import { formatNok } from "@/lib/money";

const FIELD = "w-full border border-black/20 bg-transparent p-[12px] font-gotham text-paragraph text-black outline-none placeholder:text-black/50 focus:border-black/60";
const CM = /^\d{1,3}([.,]\d)?$/;

/** The "size" picked when the customer chooses Tailored instead of a standard size. */
const TAILORED = "\u0000tailored";

/** Saving to the cart is instant; this short pause lets the press register. */
const ADD_PAUSE = 450;

/**
 * The specification list, how the customer picks what to buy, then the black Add To Cart button
 * from the Figma product page. Made-to-measure products ask for the measurements Site settings
 * lists (in cm) in a closed row at the end of the specification list: it opens on a tap, or when
 * Add To Cart is pressed before it is filled in, the button then reading "Fill in measurements"
 * until it is. Sized products show their sizes as bordered chips with the empty ones struck
 * through, and, when the product is also made to measure, a Tailored chip that opens the same
 * measurements row. A product in several colours shows its colours first; choosing one switches
 * the gallery to that colour's photos. One-size products just have the button. Whatever was chosen
 * rides along on the cart line and ends up on the order (the server re-checks all of it).
 */
export default function ProductOptions({ product, sizing, specs = [], className = "" }: { product: Product; sizing: SizingSettings; specs?: ProductSpec[]; className?: string }) {
  const { add } = useCart();
  const t = useT();
  const [size, setSize] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState<"idle" | "pending" | "done">("idle");
  const [guideOpen, setGuideOpen] = useState(false);
  const [measureOpen, setMeasureOpen] = useState(false);
  // Set once Add To Cart was pressed without the measurements: the button asks for them until they are in.
  const [prompted, setPrompted] = useState(false);
  const commit = useRef<(() => void) | null>(null);
  const soldOut = isSoldOut(product);
  const tailoredChosen = product.tailored && size === TAILORED;
  const measured = (product.sizing === "measurements" || tailoredChosen) && !soldOut;
  // Colour: chosen here, shared with the gallery when the page provides the shared choice.
  const shared = useColourChoice();
  const [ownColour, setOwnColour] = useState<string | null>(null);
  const colour = shared ? shared.colour : ownColour;
  const setColour = (id: string | null) => (shared ? shared.setColour(id) : setOwnColour(id));
  const colours = product.colors.filter((c) => c.id);
  const needsColour = colours.length > 1;
  const chosenColour = colours.find((c) => c.id === colour);
  const measurements = sizing.fields.map((f) => ({
    label: f.label,
    value: (values[f.label] ?? "").trim().replace(",", "."),
  }));
  const measurementsMissing = measurements.some((m) => !CM.test(m.value));

  useEffect(() => {
    if (adding === "idle") return;
    const timer = window.setTimeout(
      () => {
        if (adding === "pending") {
          commit.current?.();
          setAdding("done");
        } else setAdding("idle");
      },
      adding === "pending" ? ADD_PAUSE : 1500,
    );
    return () => window.clearTimeout(timer);
  }, [adding]);

  const onAdd = () => {
    if (needsColour && !chosenColour) return setError(t("product.chooseColour"));
    const withColour = chosenColour ? { colour: chosenColour.id } : colours.length === 1 ? { colour: colours[0].id } : {};
    if (product.sizing === "sizes" && !tailoredChosen) {
      if (!size) return setError(t(product.tailored ? "product.chooseSizeOrTailored" : "product.chooseSize"));
      commit.current = () => add(product, 1, { size, ...withColour });
    } else if (product.sizing === "measurements" || tailoredChosen) {
      if (measurementsMissing) {
        // Open the row and let the button say what is needed, rather than adding.
        setMeasureOpen(true);
        setPrompted(true);
        return;
      }
      commit.current = () => add(product, 1, { measurements, ...withColour });
    } else {
      commit.current = () => add(product, 1, withColour);
    }
    setError(null);
    setAdding("pending");
  };

  const leftInStock = tailoredChosen || !product.trackStock ? null : product.sizing === "sizes" ? (size ? (product.sizes.find((s) => s.label === size)?.stock ?? 0) : null) : product.stock;

  const measurementsRow = measured
    ? {
        label: t("product.measurements"),
        open: measureOpen,
        onToggle: () => setMeasureOpen((v) => !v),
        children: (
          <div className="flex flex-col gap-[12px]">
            <span className="text-[11px] leading-normal text-black/50">{t("product.measurementsHint")}</span>
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
              <div className="border-t border-black/20">
                <button type="button" aria-expanded={guideOpen} onClick={() => setGuideOpen((v) => !v)} className="flex w-full items-center justify-between py-[12px] text-left">
                  {t("product.sizeGuide")}
                  <Chevron open={guideOpen} />
                </button>
                <Collapse open={guideOpen}>
                  <div className="flex flex-col gap-[10px] pb-[12px] text-black/70">
                    {sizing.sizeGuide.split(/\n\s*\n/).map((para, i) => (
                      <p key={i} className="m-0">
                        {para}
                      </p>
                    ))}
                  </div>
                </Collapse>
              </div>
            )}
          </div>
        ),
      }
    : undefined;

  return (
    <div className={`flex flex-col gap-[24px] font-gotham text-paragraph text-black ${className}`}>
      {(specs.length > 0 || measurementsRow) && <ProductSpecs specs={specs} extra={measurementsRow} />}

      {needsColour && !soldOut && (
        <div className="flex flex-col gap-[12px]">
          <span className="text-[11px] leading-normal">
            {t("product.colour")}
            {chosenColour && <span className="text-black/50"> · {chosenColour.name}</span>}
          </span>
          <ul className="m-0 flex list-none flex-wrap gap-[10px] p-0" aria-label={t("product.colour")}>
            {colours.map((c) => {
              const active = colour === c.id;
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    aria-pressed={active}
                    aria-label={c.name}
                    title={c.name}
                    onClick={() => {
                      setColour(active ? null : c.id!);
                      setError(null);
                    }}
                    className={`flex h-[32px] w-[32px] items-center justify-center rounded-full border transition-colors ${active ? "border-black" : "border-transparent hover:border-black/40"}`}
                  >
                    <span className="block h-[22px] w-[22px] rounded-full border-[0.5px] border-black/25" style={{ backgroundColor: c.hex }} />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {product.sizing === "sizes" && !soldOut && (
        <div className="flex flex-col gap-[12px]">
          <span className="text-[11px] leading-normal">{t("product.size")}</span>
          <ul className="m-0 flex list-none flex-wrap gap-[8px] p-0" aria-label={t("product.size")}>
            {product.sizes.map((s) => {
              const out = product.trackStock && s.stock <= 0;
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
            {product.tailored && (
              <li>
                <button
                  type="button"
                  aria-pressed={tailoredChosen}
                  onClick={() => {
                    setSize(TAILORED);
                    setMeasureOpen(true);
                    setError(null);
                  }}
                  className={`border-[0.5px] px-[12px] py-[6px] transition-colors ${tailoredChosen ? "border-black bg-black text-white" : "border-black text-black hover:bg-[#f7f7f7]"}`}
                >
                  {t("product.tailored")}
                </button>
              </li>
            )}
          </ul>
          {tailoredChosen && (
            <span className="text-[11px] leading-normal text-black/50">
              {t("product.tailoredNote")}
              {product.tailoredExtraOre > 0 && <> · {t("product.tailoredExtra", { price: formatNok(product.tailoredExtraOre) })}</>}
            </span>
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
            <RolloverText text={soldOut ? t("product.soldOut") : prompted && measurementsMissing ? t("product.fillMeasurements") : t("product.add")} />
          </Busy>
        </button>
        {error && (
          <p className="m-0 text-[11px] leading-normal text-[#b00020]" role="alert">
            {error}
          </p>
        )}
        {!soldOut && leftInStock !== null && leftInStock > 0 && leftInStock <= 3 && <p className="m-0 text-[11px] leading-normal text-black/50">{t("product.leftInStock", { count: leftInStock })}</p>}
      </div>
    </div>
  );
}
