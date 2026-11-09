import Image from "next/image";
import Link from "next/link";
import { Heading, Muted } from "@/components/admin/ui";
import { mediaStyle, parseTransform } from "@/lib/media-transform";
import { getText, type LocalizedString } from "@/lib/admin/localized";
import { adminClient, kr } from "@/lib/admin/sanity";

type Row_ = { _id: string; name?: LocalizedString; category?: string; priceOre?: number; compareAtPriceOre?: number; stock?: number; visible?: boolean; vintage?: boolean; image?: { src?: string | null; scale?: number | null; x?: number | null; y?: number | null } | null };

export default async function ProductsPage() {
  const products = await adminClient().fetch<Row_[]>(
    `*[_type == "product"] | order(category asc, name[_key == "en"][0].value asc){_id, name, category, priceOre, compareAtPriceOre, stock, visible, vintage, "image": images[0]{ "src": asset->url, scale, x, y }}`,
  );
  return (
    <>
      <div className="flex flex-col gap-[12px] md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-[12px]">
          <Heading>Products</Heading>
          <Muted>{products.length} products. Tap one to edit it.</Muted>
        </div>
        <Link href="/admin/products/new" className="flex items-center justify-center bg-black px-[24px] py-[12px] font-gotham text-paragraph text-white hover:opacity-80 transition-opacity md:w-auto">
          New product
        </Link>
      </div>
      {products.length === 0 ? (
        <Muted>No products yet.</Muted>
      ) : (
        /* Two across, like the shop's grid on a phone: the thumbnail as the shop card draws it (whole photo, margin, its placement), then the facts. */
        <ul className="m-0 grid list-none grid-cols-2 gap-[12px] p-0 md:gap-[24px]">
          {products.map((p) => (
            <li key={p._id} className="flex min-w-0">
              <Link href={`/admin/products/${p._id}`} className="flex h-full flex-col gap-[8px] border-[0.25px] border-black/25 p-[12px] font-gotham text-paragraph text-black transition-colors hover:bg-[#fafbfc]">
                <span className={`relative flex aspect-[159/238] w-full items-center justify-center overflow-hidden px-[15%] py-[17.6%] ${p.vintage ? "bg-[#1a1a1a]" : "bg-[#f7f7f7]"}`}>
                  <span className="relative block h-full w-full shrink-0" style={mediaStyle(parseTransform(p.image))}>
                    {p.image?.src && <Image src={p.image.src} alt="" fill sizes="(min-width: 768px) 25vw, 50vw" className="object-contain" />}
                  </span>
                  {(p.visible === false || p.compareAtPriceOre || p.vintage) && (
                    <span className="absolute top-[8px] right-[8px] flex flex-col items-end gap-[4px]">
                      {p.visible === false && <span className="bg-white px-[8px] py-[3px] text-[11px] leading-normal text-black/50">hidden</span>}
                      {p.vintage && <span className="bg-white px-[8px] py-[3px] text-[11px] leading-normal text-black">vintage</span>}
                      {p.compareAtPriceOre ? <span className="bg-black px-[8px] py-[3px] text-[11px] leading-normal text-white">sale</span> : null}
                    </span>
                  )}
                </span>
                <span className="flex min-w-0 flex-col gap-[2px]">
                  <span className="truncate">{getText(p.name, "en") || "Untitled"}</span>
                  <span className="flex justify-between gap-[8px] text-[11px] leading-normal text-black/50">
                    <span className="truncate">{p.category}</span>
                    <span className="shrink-0">{p.stock ?? 0} in stock</span>
                  </span>
                  <span className="flex items-center justify-between gap-[8px]">
                    <span className="flex gap-[8px]">
                      <span>{kr(p.priceOre)}</span>
                      {p.compareAtPriceOre ? <s className="text-black/40">{kr(p.compareAtPriceOre)}</s> : null}
                    </span>
                    {/* The whole card opens the editor; this names it, like the Edit button on every photo and page. */}
                    <span className="shrink-0 border border-black px-[10px] py-[5px] text-[11px] leading-normal text-black">Edit</span>
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
