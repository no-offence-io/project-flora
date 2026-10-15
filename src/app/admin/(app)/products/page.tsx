import Image from "next/image";
import Link from "next/link";
import { Heading, Muted, Row, Tag } from "@/components/admin/ui";
import { getText, type LocalizedString } from "@/lib/admin/localized";
import { adminClient, kr } from "@/lib/admin/sanity";

type Row_ = { _id: string; name?: LocalizedString; category?: string; priceOre?: number; compareAtPriceOre?: number; stock?: number; visible?: boolean; image?: string };

export default async function ProductsPage() {
  const products = await adminClient().fetch<Row_[]>(
    `*[_type == "product"] | order(category asc, name[_key == "en"][0].value asc){_id, name, category, priceOre, compareAtPriceOre, stock, visible, "image": images[0].asset->url}`,
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
        <div className="flex flex-col gap-[12px]">
          {products.map((p) => (
            <Row key={p._id} href={`/admin/products/${p._id}`}>
              <span className="relative h-[56px] w-[44px] shrink-0 bg-[#f7f7f7]">{p.image && <Image src={p.image} alt="" fill sizes="44px" className="object-cover" />}</span>
              <span className="min-w-0 flex-1 truncate">
                {getText(p.name, "en") || "Untitled"} <span className="text-black/50">{p.category}</span>
              </span>
              {p.visible === false && <Tag tone="muted">hidden</Tag>}
              {p.compareAtPriceOre ? <Tag>sale</Tag> : null}
              <span className="text-[11px] text-black/50">{p.stock ?? 0} in stock</span>
              <span className="w-[90px] text-right">{kr(p.priceOre)}</span>
            </Row>
          ))}
        </div>
      )}
    </>
  );
}
