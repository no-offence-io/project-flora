import FrontHero from "@/components/front-hero";
import ProductsSlideshow from "@/components/products-slideshow";
import SignUpBanner from "@/components/sign-up-banner";
import ValuesScrolly from "@/components/values-scrolly";
import { getHomePage, getProducts } from "@/lib/catalog";
import { toSlideshowProduct } from "@/lib/catalog-types";

export default async function Home() {
  const [products, home] = await Promise.all([getProducts(), getHomePage()]);
  return (
    <div className="flex flex-col gap-[60px] pb-[60px] md:gap-[120px] md:pb-[120px]">
      <FrontHero logoPosition={home.hero.logoPosition} videoSrc={home.hero.videoSrc} />

      <div id="all-items">
        <ProductsSlideshow title={home.productsTitle} products={products.map(toSlideshowProduct)} seeAllHref="/shop" columns={4} />
      </div>

      <div id="values-scrolly">
        <ValuesScrolly title={home.values.title} intro={home.values.intro} values={home.values.items} />
      </div>

      <div id="join">
        <SignUpBanner variant="smaller" mobileVariant="clothing" />
      </div>
    </div>
  );
}
