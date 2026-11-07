import type { Metadata } from "next";
import Navbar from "@/components/navbar";
import ShopCatalog from "@/components/shop-catalog";
import SignUpBanner from "@/components/sign-up-banner";
import VintageSection from "@/components/vintage-section";
import { getHomePage, getProducts, getVintagePage, getVintageProducts } from "@/lib/catalog";
import { getT } from "@/lib/i18n-server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("meta.shop") };
}

export default async function ShopPage() {
  const [products, home, vintage, vintagePage] = await Promise.all([getProducts(), getHomePage(), getVintageProducts(), getVintagePage()]);
  return (
    <div className="flex flex-col gap-[60px] pb-[60px] md:gap-[120px] md:pb-[120px]">
      <div className="flex flex-col gap-[60px] md:gap-0">
        <Navbar tone="dark" />
        <ShopCatalog products={products} title={home.productsTitle} />
      </div>
      <VintageSection products={vintage} page={vintagePage} />
      <SignUpBanner variant="smaller" mobileVariant="clothing" />
    </div>
  );
}
