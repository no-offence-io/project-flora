import Image from "next/image";
import { formatNok } from "@/lib/money";
import { isSoldOut, type Product } from "@/lib/catalog-types";

/**
 * The top of a vintage product page: the photo hangs in the middle of a full-height screen and
 * turns slowly, like a found treasure in a game, with the piece's name and price under it. On
 * white the photo's own white background vanishes so the piece alone seems to turn; `dark` gives
 * a lit, turning-card look instead. The animation lives in globals.css (treasure-*), and stops for
 * people who prefer reduced motion.
 */
export default function VintageHero({ product, labels, dark = false, children }: { product: Product; labels: { oneOfAKind: string; soldOut: string }; dark?: boolean; children?: React.ReactNode }) {
  const photo = product.images[0];
  const muted = dark ? "text-white/50" : "text-black/50";
  return (
    <section className={`treasure-hero relative flex min-h-[calc(100svh-80px)] flex-col items-center justify-center gap-[42px] overflow-hidden px-[24px] pb-[60px] md:px-[42px] md:pb-[120px] ${dark ? "text-white" : "text-black"}`}>
      {dark && <div aria-hidden className="treasure-glow pointer-events-none absolute left-1/2 top-1/2 h-[60vmin] w-[60vmin] -translate-x-1/2 -translate-y-1/2 rounded-full" />}

      <div className="treasure-stage relative h-[52vh] w-full max-w-[520px] md:h-[60vh]">
        <div className="treasure-float absolute inset-0">
          <div className="treasure-spin relative h-full w-full">
            {photo && <Image src={photo.src} alt={photo.alt} fill priority sizes="(min-width: 768px) 520px, 90vw" className={dark ? "object-contain drop-shadow-[0_30px_60px_rgba(0,0,0,0.6)]" : "object-contain"} />}
          </div>
        </div>
        <div aria-hidden className={`treasure-shadow absolute bottom-[-24px] left-1/2 h-[22px] w-[55%] -translate-x-1/2 rounded-[50%] blur-[14px] ${dark ? "bg-black/70" : "bg-black/25"}`} />
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
