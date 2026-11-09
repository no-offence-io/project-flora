import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import Navbar from "@/components/navbar";
import PhotoSlideshow from "@/components/photo-slideshow";
import ProductDetails from "@/components/product-details";
import ProductGallery from "@/components/product-gallery";
import ProductOptions from "@/components/product-options";
import ProductsSlideshow from "@/components/products-slideshow";
import { CareInstructions } from "@/components/care-icons";
import VintageHero from "@/components/vintage-hero";
import { getProduct, getProducts, getSizingSettings, getVintageCard, getVintageProducts } from "@/lib/catalog";
import { isSoldOut } from "@/lib/catalog-types";
import { LIFESTYLE_PHOTOS, toSlideshowProduct } from "@/lib/catalog-types";
import { getT } from "@/lib/i18n-server";
import { mediaStyle } from "@/lib/media-transform";

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
  const [product, t, sizing, card] = await Promise.all([getProduct(slug), getT(), getSizingSettings(), getVintageCard()]);
  if (!product) notFound();

  // A vintage piece keeps company with the other vintage pieces; the collection with the collection.
  const all = product.vintage ? await getVintageProducts() : await getProducts();
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

  // A vintage piece gets the turning card unless the dashboard asked for the normal page.
  if (product.vintage && product.vintageLayout === "card") {
    // Every attached photo, the one on the card included: a photo wrapped round a turning glass block is a hard read.
    const more = product.images;
    return (
      <div className="flex flex-col gap-[60px] pb-[60px] md:gap-[120px] md:pb-[120px]">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        {/* Top screen: the piece turning in the middle of a white screen, then everything about it in one centred column. */}
        <div className="flex flex-col">
          <Navbar tone="dark" />
          <VintageHero product={product} card={card} labels={{ oneOfAKind: t("vintage.oneOfAKind"), soldOut: t("product.soldOut") }} />
        </div>

        <section id="details" className="mx-auto flex w-full max-w-[521px] flex-col gap-[42px] px-[24px] text-black md:px-0">
          <p className="m-0 whitespace-pre-line font-gotham text-paragraph text-black/70">{product.description}</p>
          <ProductOptions product={product} sizing={sizing} specs={product.specs} />
          <CareInstructions layout="responsive" className="text-black/50 md:text-black" />
        </section>

        {more.length > 0 && (
          <div id="photos" className="grid grid-cols-1 gap-[24px] px-[24px] md:grid-cols-4 md:gap-[42px] md:px-[42px]">
            {more.map((image) => (
              <div key={image.src} className="flex aspect-[4/5] w-full items-center justify-center overflow-hidden bg-[var(--photo-bg,#f7f7f7)] p-[24px]">
                <div className="relative h-full w-full shrink-0" style={mediaStyle(image)}>
                  <Image src={image.src} alt={image.alt} fill sizes="(min-width: 768px) 25vw, 100vw" className="object-contain" />
                </div>
              </div>
            ))}
          </div>
        )}

        <div id="also-like">
          <ProductsSlideshow title={t("product.alsoLike")} products={related} seeAllHref="/vintage" />
        </div>
      </div>
    );
  }

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
        <ProductsSlideshow title={t("product.alsoLike")} products={related} seeAllHref={product.vintage ? "/vintage" : "/shop"} />
      </div>
    </div>
  );
}
