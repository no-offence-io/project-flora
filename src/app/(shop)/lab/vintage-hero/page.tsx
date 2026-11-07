import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Navbar from "@/components/navbar";
import VintageHero from "@/components/vintage-hero";
import InstagramExport from "@/components/admin/instagram-export";
import { getVintageCard, getVintageProducts } from "@/lib/catalog";
import { getT } from "@/lib/i18n-server";
import type { VintageCardSetting } from "@/lib/vintage-card-shared";

export const metadata: Metadata = { title: "Vintage hero (test)", robots: { index: false, follow: false } };

/**
 * A try-out, not linked from anywhere: the vintage hero on its own, to compare the white look
 * (default) with the dark one (?bg=dark), and the saved card look with ?variant=glass or ?variant=card forced. Pass ?slug= to see another piece. The real vintage
 * product pages use the same hero.
 */
export default async function VintageHeroLab({ searchParams }: { searchParams: Promise<{ slug?: string; bg?: string; variant?: string }> }) {
  const [{ slug, bg, variant }, products, t, saved] = await Promise.all([searchParams, getVintageProducts(), getT(), getVintageCard()]);
  const wanted = slug ?? "wood-1-1";
  const product = products.find((p) => p.slug === wanted) ?? products[0] ?? null;
  if (!product) notFound();
  const dark = bg === "dark";
  // The saved setting, with ?variant=glass or ?variant=card forcing one look.
  const card: VintageCardSetting = variant === "glass" || variant === "card" ? { ...saved, variant } : saved;

  return (
    <div className="flex flex-col pb-[60px] md:pb-[120px]">
      <div className={`full-bleed ${dark ? "bg-[#141414]" : "bg-white"}`}>
        <div className="mx-auto flex w-full max-w-[1600px] flex-col">
          <Navbar tone={dark ? "light" : "dark"} />
          <VintageHero product={product} dark={dark} card={card} labels={{ oneOfAKind: t("vintage.oneOfAKind"), soldOut: t("product.soldOut") }}>
            <Link href={`/shop/${product.slug}`} className={`mt-[12px] inline-flex h-[44px] items-center justify-center px-[24px] font-gotham text-paragraph transition-opacity hover:opacity-80 ${dark ? "bg-white text-black" : "bg-black text-white"}`}>
              {t("product.add")}
            </Link>
          </VintageHero>
        </div>
      </div>
      {process.env.NODE_ENV === "development" && (
        <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-[24px] px-[24px] pt-[60px] md:px-[42px]">
          <InstagramExport pieces={products.flatMap((p) => (p.images[0] ? [{ slug: p.slug, name: { en: p.name, no: p.name }, priceOre: p.priceOre, src: p.images[0].src, alt: p.images[0].alt }] : []))} setting={card} oneOfAKind={{ en: "One of a kind", no: "Unikt plagg" }} />
        </div>
      )}
      <p className="mx-auto w-full max-w-[1600px] px-[24px] pt-[60px] font-gotham text-[11px] leading-normal tracking-[0.2em] uppercase text-black/50 md:px-[42px]">
        Test page · add ?bg=dark for the dark look · ?variant=glass or ?variant=card to force a look · ?slug= one of: {products.map((p) => p.slug).join(", ")}
      </p>
    </div>
  );
}
