import type { Metadata } from "next";
import Navbar from "@/components/navbar";
import ShopCatalog from "@/components/shop-catalog";
import SignUpBanner from "@/components/sign-up-banner";
import { PRODUCTS } from "@/data/products";

export const metadata: Metadata = { title: "All items – Flöra" };

export default function ShopPage() {
  return (
    <div className="flex flex-col gap-[60px] pb-[60px] md:gap-[120px] md:pb-[120px]">
      <div className="flex flex-col gap-[60px] md:gap-0">
        <Navbar tone="dark" />
        <ShopCatalog products={PRODUCTS} />
      </div>
      <SignUpBanner variant="smaller" mobileVariant="clothing" />
    </div>
  );
}
