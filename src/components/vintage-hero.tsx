import TreasureCard from "./treasure-card";
import { formatNok } from "@/lib/money";
import { isSoldOut, type Product } from "@/lib/catalog-types";

/**
 * The top of a vintage product page: the piece as a real 3D card (see treasure-card.tsx) hanging
 * in the middle of a full-height screen, swaying slowly like a found treasure in a game and
 * turning when grabbed, with the piece's name and price under it. `dark` lights it on a
 * near-black screen instead of white.
 */
export default function VintageHero({ product, labels, dark = false, children }: { product: Product; labels: { oneOfAKind: string; soldOut: string }; dark?: boolean; children?: React.ReactNode }) {
  const photo = product.images[0];
  const muted = dark ? "text-white/50" : "text-black/50";
  return (
    <section className={`relative flex min-h-[calc(100svh-80px)] flex-col items-center justify-center gap-[24px] overflow-hidden px-[24px] pt-[24px] pb-[60px] md:px-[42px] md:pt-[42px] md:pb-[60px] ${dark ? "text-white" : "text-black"}`}>
      <div className="relative h-[52vh] w-full md:h-[56vh]">
        {photo && <TreasureCard src={photo.src} alt={photo.alt} dark={dark} />}
      </div>

      <div className="flex flex-col items-center gap-[12px] text-center">
        <p className={`m-0 font-gotham text-[11px] leading-normal tracking-[0.2em] uppercase ${muted}`}>{labels.oneOfAKind}</p>
        <h1 className="m-0 font-americana text-big-header-mobile uppercase tracking-[0.04em] md:text-big-header-desktop">{product.name}</h1>
        <p className={`m-0 flex items-center gap-[12px] font-gotham text-paragraph ${dark ? "text-white/70" : "text-black/70"}`}>
          <span>{formatNok(product.priceOre)}</span>
          {product.compareAtPriceOre !== undefined && <s className="text-[#c7c7c7]">{formatNok(product.compareAtPriceOre)}</s>}
          {isSoldOut(product) && <span className={muted}>{labels.soldOut}</span>}
        </p>
        {children}
      </div>
    </section>
  );
}
