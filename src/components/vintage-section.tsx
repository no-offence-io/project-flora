import Link from "next/link";
import ProductCard from "./product-card";
import { toSlideshowProduct, type Product } from "@/lib/catalog-types";
import type { VintageContent } from "@/lib/catalog";
import { getT } from "@/lib/i18n-server";

/**
 * The vintage pieces, shown under the permanent collection on the shop page: the same paper colour
 * as the Vintage page and near-black behind each photo (both set under Settings → Brand), so the change of section reads at a
 * glance, with the shop's card size so the page stays one grid rhythm. Nothing is drawn when there are no vintage pieces to show.
 */
export default async function VintageSection({ products, page }: { products: Product[]; page: VintageContent }) {
  if (products.length === 0) return null;
  const t = await getT();
  return (
    <section id="vintage" className="full-bleed bg-[var(--vintage-bg,#f4f1ea)] text-black">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-[42px] px-[24px] py-[60px] md:gap-[60px] md:px-[42px] md:py-[120px]">
        <header className="flex flex-col gap-[24px] md:flex-row md:items-end md:justify-between md:gap-[42px]">
          <div className="flex flex-col gap-[24px]">
            <h2 className="m-0 font-americana text-big-header-mobile uppercase tracking-[0.04em] md:text-big-header-desktop">{page.title}</h2>
            {page.intro && <p className="m-0 max-w-[521px] font-gotham text-paragraph text-black/70">{page.intro}</p>}
          </div>
          <Link href="/vintage" className="font-gotham text-paragraph text-black underline underline-offset-[4px] transition-opacity hover:opacity-70">
            {t("vintage.seeAll")}
          </Link>
        </header>
        <div className="grid grid-cols-2 gap-[24px] md:grid-cols-4 md:gap-[42px]">
          {products.map((product) => (
            <div key={product.slug} className="flex flex-col gap-[12px]">
              <ProductCard product={toSlideshowProduct(product)} wellClassName="h-[238px] md:h-[258px]" wellBackground="bg-[var(--vintage-photo-bg,#1a1a1a)]" imageSizes="(min-width: 768px) 25vw, 50vw" />
              <p className="m-0 font-gotham text-[11px] leading-normal tracking-[0.2em] uppercase text-black/50">{t("vintage.oneOfAKind")}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
