import type { ReactNode } from "react";
import Footer from "@/components/footer";
import { NavMenuOverlay, NavMenuProvider } from "@/components/nav-menu";
import StickyNavbar from "@/components/sticky-navbar";
import Navbar from "@/components/navbar";
import { CartProvider } from "@/components/cart-context";
import LoadingScreen from "@/components/loading-screen";
import { SanityLive } from "@/sanity/lib/live";
import { getLanguage } from "@/lib/language";

/**
 * The shop's chrome: cart, menu, sticky navbar, footer and the intro animation. Everything a
 * customer sees lives in this group. The admin and account areas are siblings with their own
 * layouts, so they get the fonts and global styles from the root but none of this.
 */
export default async function ShopLayout({ children }: { children: ReactNode }) {
  const lang = await getLanguage();
  return (
    <>
      <CartProvider>
        <NavMenuProvider>
          {/* The site is capped at 1600px and centred on wide desktops */}
          <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col">
            {children}
            <Footer />
          </div>
          <StickyNavbar>
            <Navbar tone="dark" />
          </StickyNavbar>
          <NavMenuOverlay lang={lang} />
        </NavMenuProvider>
      </CartProvider>
      <LoadingScreen />
      {/* Subscribes the page to Sanity content changes; required for sanityFetch to stay live. */}
      <SanityLive />
    </>
  );
}
