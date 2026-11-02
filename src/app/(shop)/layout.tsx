import type { ReactNode } from "react";
import PageTransition from "@/components/page-transition";
import Footer from "@/components/footer";
import { NavMenuOverlay, NavMenuProvider } from "@/components/nav-menu";
import StickyNavbar from "@/components/sticky-navbar";
import Navbar from "@/components/navbar";
import { CartProvider } from "@/components/cart-context";
import LoadingScreen from "@/components/loading-screen";
import { SanityLive } from "@/sanity/lib/live";
import CartPill from "@/components/cart-pill";
import { getAnalyticsId, getLoadingStyle, getLogoSrc, getPageTransition } from "@/lib/brand";
import { getLanguage } from "@/lib/language";
import { cookies } from "next/headers";
import { parseTheme, THEME_COOKIE } from "@/lib/theme-shared";
import { I18nProvider } from "@/components/i18n-provider";
import VisitTracker from "@/components/visit-tracker";
import AnalyticsConsent from "@/components/analytics-consent";

/**
 * The shop's chrome: cart, menu, sticky navbar, footer and the intro animation. Everything a
 * customer sees lives in this group. The admin and account areas are siblings with their own
 * layouts, so they get the fonts and global styles from the root but none of this.
 */
export default async function ShopLayout({ children }: { children: ReactNode }) {
  const [lang, logo, jar, analyticsId, transition, loading] = await Promise.all([getLanguage(), getLogoSrc(), cookies(), getAnalyticsId(), getPageTransition(), getLoadingStyle()]);
  const theme = parseTheme(jar.get(THEME_COOKIE)?.value);
  return (
    <I18nProvider lang={lang}>
      <CartProvider>
        <NavMenuProvider>
          {/* The site is capped at 1600px and centred on wide desktops */}
          <div data-loader={loading} className="shop-content mx-auto flex w-full max-w-[1600px] flex-1 flex-col bg-white">
            {children}
            <Footer />
          </div>
          <StickyNavbar>
            <Navbar tone="dark" />
          </StickyNavbar>
          <NavMenuOverlay lang={lang} logoSrc={logo} theme={theme} />
          <PageTransition setting={transition} logoSrc={logo} />
          <CartPill />
          <VisitTracker />
          <AnalyticsConsent measurementId={analyticsId} />
        </NavMenuProvider>
      </CartProvider>
      <LoadingScreen />
      {/* Subscribes the page to Sanity content changes; required for sanityFetch to stay live. */}
      <SanityLive />
    </I18nProvider>
  );
}
