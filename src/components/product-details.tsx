import AddToCartButton from "./add-to-cart-button";
import { CareInstructions } from "./care-icons";
import ProductSpecs from "./product-specs";
import { formatNok } from "@/lib/money";
import type { Product } from "@/lib/catalog-types";

/** Title, price, description, specifications, Add To Cart and care instructions from the Figma product page. */
export default function ProductDetails({ product, className = "" }: { product: Product; className?: string }) {
  return (
    <div
      className={`flex flex-col gap-[120px] px-[24px] text-black md:h-full md:min-h-0 md:flex-1 md:justify-between md:gap-[24px] md:py-[42px] md:pr-[42px] md:pl-[60px] ${className}`}
    >
      <div className="flex flex-col gap-[24px]">
        <div className="flex flex-col gap-[8px] md:gap-[24px]">
          <h1 className="m-0 font-americana text-big-header-mobile capitalize md:text-big-header-desktop">{product.name}</h1>
          <p className="flex items-center gap-[12px] font-gotham text-paragraph">
            <span>{formatNok(product.priceOre)}</span>
            {product.compareAtPriceOre !== undefined && <s className="text-[#c7c7c7]">{formatNok(product.compareAtPriceOre)}</s>}
          </p>
        </div>
        <p className="w-[312px] max-w-full font-gotham text-paragraph text-black/70">{product.description}</p>
      </div>

      <div className="flex flex-col gap-[42px] md:gap-[24px]">
        <div className="flex flex-col gap-[24px]">
          <ProductSpecs specs={product.specs} />
          <AddToCartButton product={product} />
        </div>
        <CareInstructions layout="responsive" className="text-black/50 md:text-black" />
      </div>
    </div>
  );
}
