import type { Metadata } from "next";
import { mediaStyle } from "@/lib/media-transform";
import Image from "next/image";
import Navbar from "@/components/navbar";
import ProductCard from "@/components/product-card";
import SignUpBanner from "@/components/sign-up-banner";
import { getVintagePage, getVintageProducts } from "@/lib/catalog";
import { toSlideshowProduct } from "@/lib/catalog-types";
import { getT } from "@/lib/i18n-server";

export async function generateMetadata(): Promise<Metadata> {
  const [t, page] = await Promise.all([getT(), getVintagePage()]);
  return { title: t("meta.vintage"), description: page.intro.slice(0, 160) };
}

/**
 * The Vintage page: the shop's type and spacing, on paper rather than white. One-of-a-kind pieces
 * get a bigger, two-column grid and an "one of a kind" line under the price, since each sells once.
 */
export default async function VintagePage() {
  const [products, page, t] = await Promise.all([getVintageProducts(), getVintagePage(), getT()]);
  return (
    <div className="flex flex-col gap-[60px] pb-[60px] md:gap-[120px] md:pb-[120px]">
      <div className="full-bleed bg-[var(--vintage-bg,#f4f1ea)] text-black">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-[60px] md:gap-0">
          <Navbar tone="dark" />
          <header className="flex flex-col gap-[24px] px-[24px] pb-[60px] md:grid md:grid-cols-2 md:items-end md:gap-[42px] md:px-[42px] md:pt-[42px] md:pb-[120px]">
            <div className="flex flex-col gap-[24px]">
              <h1 className="m-0 font-americana text-big-header-mobile uppercase tracking-[0.04em] md:text-big-header-desktop">{page.title}</h1>
              {page.intro && <p className="m-0 max-w-[521px] font-gotham text-paragraph text-black/70">{page.intro}</p>}
            </div>
            {page.image && (
              <div className="relative aspect-[4/5] w-full overflow-hidden md:aspect-[3/4] md:max-h-[560px]">
                <Image src={page.image.src} alt={page.image.alt} fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" style={mediaStyle(page.image)} />
              </div>
            )}
          </header>
        </div>
      </div>

      <section className="flex flex-col gap-[24px] px-[24px] md:px-[42px]">
        {products.length === 0 ? (
          <p className="m-0 font-gotham text-paragraph text-black/50">{page.emptyText}</p>
        ) : (
          <div className="grid grid-cols-1 gap-[42px] md:grid-cols-2 md:gap-[60px]">
            {products.map((product) => (
              <div key={product.slug} className="flex flex-col gap-[12px]">
                <ProductCard product={toSlideshowProduct(product)} wellClassName="h-[420px] md:h-[640px]" wellBackground="bg-[var(--vintage-photo-bg,#1a1a1a)]" imageSizes="(min-width: 768px) 50vw, 100vw" />
                <p className="m-0 font-gotham text-[11px] leading-normal tracking-[0.2em] uppercase text-black/50">{t("vintage.oneOfAKind")}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <SignUpBanner variant="smaller" mobileVariant="clothing" />
    </div>
  );
}
