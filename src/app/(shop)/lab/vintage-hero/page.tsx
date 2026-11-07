import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import Navbar from "@/components/navbar";
import { getVintageProducts } from "@/lib/catalog";
import { getT } from "@/lib/i18n-server";
import { formatNok } from "@/lib/money";

export const metadata: Metadata = { title: "Vintage hero (test)", robots: { index: false, follow: false } };

/**
 * A try-out, not linked from anywhere: a product page for a vintage piece where the photo hangs
 * in the middle of a dark hero and turns slowly, like a found treasure in a game. Pass ?slug= to
 * see another piece; the first vintage product is shown otherwise. Reduced-motion users get the
 * piece standing still.
 */
export default async function VintageHeroLab({ searchParams }: { searchParams: Promise<{ slug?: string; bg?: string }> }) {
  const [{ slug, bg }, products, t] = await Promise.all([searchParams, getVintageProducts(), getT()]);
  // Two looks to compare: on white the photo's own white background vanishes and the piece alone
  // seems to turn in the air; on dark the photo reads as a turning card.
  const dark = bg === "dark";
  const wanted = slug ?? "wood-1-1";
  const product = products.find((p) => p.slug === wanted) ?? products[0] ?? null;
  if (!product) notFound();
  const photo = product.images[0];

  return (
    <div className="flex flex-col pb-[60px] md:pb-[120px]">
      <div className={`full-bleed ${dark ? "bg-[#141414] text-white" : "bg-white text-black"}`}>
        <div className="mx-auto flex w-full max-w-[1600px] flex-col">
          <Navbar tone={dark ? "light" : "dark"} />
          <section className="treasure-hero relative flex min-h-[calc(100svh-80px)] flex-col items-center justify-center gap-[42px] overflow-hidden px-[24px] pb-[60px] md:px-[42px] md:pb-[120px]">
            {/* A soft pool of light behind the piece, so it reads as lit rather than pasted on. */}
            {dark && <div aria-hidden className="treasure-glow pointer-events-none absolute left-1/2 top-1/2 h-[60vmin] w-[60vmin] -translate-x-1/2 -translate-y-1/2 rounded-full" />}

            <div className="treasure-stage relative h-[52vh] w-full max-w-[520px] md:h-[60vh]">
              <div className="treasure-float absolute inset-0">
                <div className="treasure-spin relative h-full w-full">
                  <Image src={photo.src} alt={photo.alt} fill priority sizes="(min-width: 768px) 520px, 90vw" className={dark ? "object-contain drop-shadow-[0_30px_60px_rgba(0,0,0,0.6)]" : "object-contain"} />
                </div>
              </div>
              <div aria-hidden className={`treasure-shadow absolute bottom-[-24px] left-1/2 h-[22px] w-[55%] -translate-x-1/2 rounded-[50%] blur-[14px] ${dark ? "bg-black/70" : "bg-black/25"}`} />
            </div>

            <div className="flex flex-col items-center gap-[12px] text-center">
              <p className={`m-0 font-gotham text-[11px] leading-normal tracking-[0.2em] uppercase ${dark ? "text-white/50" : "text-black/50"}`}>{t("vintage.oneOfAKind")}</p>
              <h1 className="m-0 font-americana text-big-header-mobile uppercase tracking-[0.04em] md:text-big-header-desktop">{product.name}</h1>
              <p className={`m-0 font-gotham text-paragraph ${dark ? "text-white/70" : "text-black/70"}`}>{formatNok(product.priceOre)}</p>
              <Link href={`/shop/${product.slug}`} className={`mt-[12px] inline-flex h-[44px] items-center justify-center px-[24px] font-gotham text-paragraph transition-opacity hover:opacity-80 ${dark ? "bg-white text-black" : "bg-black text-white"}`}>
                {t("product.add")}
              </Link>
            </div>
          </section>
        </div>
      </div>

      {product.description && (
        <section className="mx-auto flex w-full max-w-[1600px] flex-col gap-[24px] px-[24px] pt-[60px] md:px-[42px] md:pt-[120px]">
          <p className="m-0 max-w-[521px] font-gotham text-paragraph text-black/70">{product.description}</p>
          <p className="m-0 font-gotham text-[11px] leading-normal tracking-[0.2em] uppercase text-black/50">
            Test page · add ?bg=dark for the dark look · ?slug= one of: {products.map((p) => p.slug).join(", ")}
          </p>
        </section>
      )}
    </div>
  );
}
