import Image from "next/image";
import Link from "next/link";
import type { SlideshowProduct } from "./products-slideshow";

/**
 * Product card from Figma: grey image well, name, price (with optional struck compare price) and colour swatches.
 * Used by the slideshow and the shop grid; size the well through `wellClassName`.
 */
export default function ProductCard({
  product,
  className = "",
  wellClassName = "",
  imageSizes = "(min-width: 768px) 33vw, 50vw",
}: {
  product: SlideshowProduct;
  className?: string;
  wellClassName?: string;
  imageSizes?: string;
}) {
  return (
    <Link href={product.href} className={`flex flex-col justify-end gap-[12px] font-gotham text-paragraph text-black ${className}`}>
      <div className={`flex w-full items-center justify-center bg-[#f7f7f7] px-[24px] py-[42px] ${wellClassName}`}>
        <div className="relative h-full w-full">
          <Image src={product.image.src} alt={product.image.alt} fill sizes={imageSizes} className="object-contain" />
        </div>
      </div>

      <div className="flex items-start gap-[24px]">
        <div className="flex flex-col gap-[12px] whitespace-nowrap">
          <span>{product.name}</span>
          <span className="flex gap-[12px]">
            <span>{product.price}</span>
            {product.compareAtPrice && <s className="text-[#c7c7c7]">{product.compareAtPrice}</s>}
          </span>
        </div>
        {product.colors && product.colors.length > 0 && (
          <ul className="flex gap-[8px]" aria-label="Available colours">
            {product.colors.map((color) => (
              <li key={color} className="size-[8px]" style={{ backgroundColor: color }} />
            ))}
          </ul>
        )}
      </div>
    </Link>
  );
}
