import Image from "next/image";
import { formatNok } from "@/lib/money";
import { isSoldOut, type Product } from "@/lib/catalog-types";

/**
 * The top of a vintage product page: the photo hangs in the middle of a full-height screen and
 * turns slowly, like a found treasure in a game: a rounded card with the photo on its front, the
 * brand on its back and a real edge, with the piece's name and price under it. `dark` lights it
 * on a near-black screen instead of white. The animation lives in globals.css (treasure-*), and stops for
 * people who prefer reduced motion.
 */
/** The card's thickness, in 1px layers. */
const THICKNESS = 10;
const EDGE = Array.from({ length: THICKNESS }, (_, i) => i + 1);

export default function VintageHero({ product, labels, dark = false, children }: { product: Product; labels: { oneOfAKind: string; soldOut: string }; dark?: boolean; children?: React.ReactNode }) {
  const photo = product.images[0];
  const muted = dark ? "text-white/50" : "text-black/50";
  return (
    <section className={`treasure-hero relative flex min-h-[calc(100svh-80px)] flex-col items-center justify-center gap-[42px] overflow-hidden px-[24px] pt-[42px] pb-[60px] md:px-[42px] md:pt-[60px] md:pb-[60px] ${dark ? "text-white" : "text-black"}`}>
      {dark && <div aria-hidden className="treasure-glow pointer-events-none absolute left-1/2 top-1/2 h-[60vmin] w-[60vmin] -translate-x-1/2 -translate-y-1/2 rounded-full" />}

      {/*
        The card: the photo printed on the front, the brand on the back, and a stack of thin
        solid layers between them so the edge has real thickness when it turns side-on. The front
        and back hide their reverse sides; the edge layers are seen from both, which is the point.
      */}
      <div className="treasure-stage relative flex h-[48vh] w-full items-center justify-center md:h-[50vh]">
        <div className="treasure-float flex h-full items-center justify-center">
          <div className="treasure-spin relative aspect-[3/4] h-full max-h-full max-w-[min(82vw,440px)]">
            {EDGE.map((z) => (
              <div key={z} aria-hidden className={`absolute inset-0 rounded-[20px] ${dark ? "bg-[#2a2a2a]" : "bg-[#d8d3c8]"}`} style={{ transform: `translateZ(${-z}px)` }} />
            ))}
            <div aria-hidden className="absolute inset-0 flex items-center justify-center rounded-[20px] bg-[#141414] [backface-visibility:hidden]" style={{ transform: `rotateY(180deg) translateZ(${THICKNESS}px)` }}>
              <div className="absolute inset-[14px] rounded-[12px] border border-white/15" />
              <span className="font-americana text-[22px] uppercase tracking-[0.3em] text-white/80">Flöra</span>
            </div>
            <div className="absolute inset-0 overflow-hidden rounded-[20px] bg-white shadow-[0_30px_60px_rgba(0,0,0,0.35)] ring-1 ring-black/10 [backface-visibility:hidden]" style={{ transform: "translateZ(1px)" }}>
              {photo && <Image src={photo.src} alt={photo.alt} fill priority sizes="(min-width: 768px) 440px, 82vw" className="object-cover" />}
            </div>
          </div>
        </div>
        <div aria-hidden className={`treasure-shadow absolute bottom-[-28px] left-1/2 h-[26px] w-[min(60vw,300px)] -translate-x-1/2 rounded-[50%] blur-[16px] ${dark ? "bg-black/70" : "bg-black/30"}`} />
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
