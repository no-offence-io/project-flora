import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Navbar from "@/components/navbar";
import PhotoSlideshow from "@/components/photo-slideshow";
import ProductDetails from "@/components/product-details";
import ProductGallery from "@/components/product-gallery";
import ProductsSlideshow from "@/components/products-slideshow";
import { getProduct, getProducts } from "@/lib/catalog";
import { LIFESTYLE_PHOTOS, toSlideshowProduct } from "@/lib/catalog-types";
import { getT } from "@/lib/i18n-server";

export async function generateMetadata({ params }: PageProps<"/shop/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  return { title: product ? `${product.name} – Flöra` : "Flöra" };
}

export default async function ProductPage({ params }: PageProps<"/shop/[slug]">) {
  const { slug } = await params;
  const [product, all, t] = await Promise.all([getProduct(slug), getProducts(), getT()]);
  if (!product) notFound();

  const related = all.filter((item) => item.slug !== product.slug).map(toSlideshowProduct);

  return (
    <div className="flex flex-col gap-[60px] pb-[60px] md:gap-[120px] md:pb-[120px]">
      {/* Top screen: on desktop the navbar, gallery and details fill the viewport; mobile keeps the fixed Figma heights */}
      <div className="flex flex-col gap-[24px] md:h-screen md:gap-0">
        <Navbar tone="dark" />
        <section className="flex flex-col gap-[24px] md:min-h-0 md:flex-1 md:flex-row md:gap-0">
          <div className="h-[386px] w-full md:h-full md:w-[720px] md:shrink-0">
            <ProductGallery images={product.images} />
          </div>
          <div id="details" className="md:contents">
            <ProductDetails product={product} />
          </div>
        </section>
      </div>

      <div id="photos">
        <PhotoSlideshow photos={LIFESTYLE_PHOTOS} />
      </div>

      <div id="also-like">
        <ProductsSlideshow title={t("product.alsoLike")} products={related} seeAllHref="/shop" />
      </div>
    </div>
  );
}
