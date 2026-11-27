"use client";

import { useMemo, useState } from "react";
import CategoryFilter, { type CategorySelection } from "./category-filter";
import ProductCard from "./product-card";
import { toSlideshowProduct, type Product } from "@/lib/catalog-types";
import { useT } from "@/components/i18n-provider";
import { search, type SearchField } from "@/lib/search";

const INTRO =
  "Browse upcoming garments in the Permanent Collection and sign up for notifications on each product page to be the first to know when they’re available.";

/**
 * Shop page content from Figma "Desktop products page" (85:2413) and "Mobile products page" (85:2350):
 * title with search (desktop) or intro (mobile), the category filter, and the product grid.
 */
export default function ShopCatalog({ products, title = "All items" }: { products: Product[]; title?: string }) {
  const [category, setCategory] = useState<CategorySelection>("All");
  const t = useT();
  const [query, setQuery] = useState("");

  // What a search looks through: the name first, then colours and the category (in English and in
  // the language shown), then the details and the description. See lib/search.ts for how words match.
  const visible = useMemo(() => {
    const inCategory = category === "All" ? products : products.filter((product) => product.category === category);
    const fieldsOf = (product: Product): SearchField[] => [
      { text: product.name, weight: 3, forgiving: true },
      { text: product.colors.map((c) => `${c.name} ${c.id ?? ""}`).join(" "), weight: 2, forgiving: true },
      { text: `${product.category} ${t(`category.${product.category}` as const)}`, weight: 2, forgiving: true },
      { text: product.specs.map((spec) => spec.value ?? "").join(" "), weight: 1 },
      { text: product.description, weight: 0.5 },
    ];
    return search(inCategory, query, fieldsOf);
  }, [products, category, query, t]);

  return (
    <div className="flex flex-col gap-[60px] md:gap-0">
      <header className="flex flex-col gap-[24px] px-[24px] md:flex-row md:items-start md:justify-between md:px-[42px] md:pt-[42px] md:pb-[60px]">
        <h1 className="m-0 font-americana text-big-header-mobile capitalize text-black md:text-big-header-desktop">{title}</h1>
        <p className="font-gotham text-paragraph text-black/70 md:hidden">{INTRO}</p>
        <label className="hidden md:block">
          <span className="sr-only">{t("shop.search")}</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("shop.searchPlaceholder")}
            className="w-[279px] border-b border-black bg-transparent py-[6px] pr-[6px] pl-[12px] font-gotham text-paragraph text-black outline-none placeholder:text-black"
          />
        </label>
      </header>

      <div className="flex flex-col gap-[24px] px-[24px] md:grid md:grid-cols-3 md:items-start md:gap-[42px] md:px-[42px]">
        <CategoryFilter value={category} onChange={setCategory} />

        <div className="grid grid-cols-2 gap-[24px] md:col-span-2 md:grid-cols-3 md:gap-[42px]">
          {visible.map((product) => (
            <ProductCard
              key={product.slug}
              product={toSlideshowProduct(product)}
              wellClassName="h-[238px] md:h-[258px]"
              imageSizes="(min-width: 768px) 30vw, 50vw"
            />
          ))}
          {visible.length === 0 && <p className="col-span-full font-gotham text-paragraph text-black/50">{t("shop.noMatch")}</p>}
        </div>
      </div>
    </div>
  );
}
