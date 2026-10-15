"use client";

import { useEffect, useState } from "react";
import { useCart } from "./cart-context";
import type { Product } from "@/lib/catalog-types";
import { useT } from "@/components/i18n-provider";

/** Black full-width Add To Cart button from the Figma product page; adds the product and confirms briefly. */
export default function AddToCartButton({ product, className = "" }: { product: Product; className?: string }) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  const t = useT();

  useEffect(() => {
    if (!added) return;
    const timer = window.setTimeout(() => setAdded(false), 1500);
    return () => window.clearTimeout(timer);
  }, [added]);

  return (
    <button
      type="button"
      onClick={() => {
        add(product);
        setAdded(true);
      }}
      aria-live="polite"
      className={`flex w-full items-center justify-center bg-black px-[12px] py-[8px] font-gotham text-paragraph text-white hover:opacity-80 transition-opacity ${className}`}
    >
      {added ? t("product.added") : t("product.add")}
    </button>
  );
}
