import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Navbar from "@/components/navbar";
import PhotoSlideshow from "@/components/photo-slideshow";
import ProductDetails from "@/components/product-details";
import ProductGallery from "@/components/product-gallery";
import ProductsSlideshow from "@/components/products-slideshow";
import { getProduct, getProducts, getSizingSettings } from "@/lib/catalog";
import { isSoldOut } from "@/lib/catalog-types";
import { LIFESTYLE_PHOTOS, toSlideshowProduct } from "@/lib/catalog-types";
import { getT } from "@/lib/i18n-server";

export async function generateMetadata({ params }: PageProps<"/shop/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return { title: "Flöra" };
  const description = product.description.slice(0, 160);
  return {
    title: `${product.name} – Flöra`,
    description,
    openGraph: { title: product.name, description, images: product.images[0] ? [{ url: product.images[0].src, alt: product.images[0].alt }] : undefined, type: "website" },
    alternates: { canonical: `/shop/${product.slug}` },
  };
}

export default async function ProductPage({ params }: PageProps<"/shop/[slug]">) {
  const { slug } = await params;
  const [product, all, t, sizing] = await Promise.all([getProduct(slug), getProducts(), getT(), getSizingSettings()]);
  if (!product) notFound();

  const related = all.filter((item) => item.slug !== product.slug).map(toSlideshowProduct);
  // Structured data so search results and shared links carry price and availability.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.images.map((i) => i.src),
    url: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.prosjectflora.com"}/shop/${product.slug}`,
    brand: { "@type": "Brand", name: "Flöra" },
    offers: {
      "@type": "Offer",
      priceCurrency: "NOK",
      price: (product.priceOre / 100).toFixed(2),
      availability: isSoldOut(product) ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
      itemCondition: product.vintage ? "https://schema.org/UsedCondition" : "https://schema.org/NewCondition",
      priceSpecification: { "@type": "PriceSpecification", price: (product.priceOre / 100).toFixed(2), priceCurrency: "NOK", valueAddedTaxIncluded: true },
    },
  };

  return (
    <div className="flex flex-col gap-[60px] pb-[60px] md:gap-[120px] md:pb-[120px]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {/* Top screen: on desktop the navbar, gallery and details fill the viewport; mobile keeps the fixed Figma heights */}
      <div className="flex flex-col gap-[24px] md:h-screen md:gap-0">
        <Navbar tone="dark" />
        <section className="flex flex-col gap-[24px] md:min-h-0 md:flex-1 md:flex-row md:gap-0">
          <div className="h-[386px] w-full md:h-full md:w-1/2 md:max-w-[720px] md:shrink-0">
            <ProductGallery images={product.images} />
          </div>
          <div id="details" className="md:contents">
            <ProductDetails product={product} sizing={sizing} soldOutLabel={t("product.soldOut")} />
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
