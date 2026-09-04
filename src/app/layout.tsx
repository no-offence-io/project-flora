import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import Footer from "@/components/footer";
import { NavMenuOverlay, NavMenuProvider } from "@/components/nav-menu";
import StickyNavbar from "@/components/sticky-navbar";
import { CartProvider } from "@/components/cart-context";
import LoadingScreen from "@/components/loading-screen";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const gotham = localFont({
  src: "./fonts/GothamBook.otf",
  weight: "325",
  variable: "--font-gotham",
});

const americana = localFont({
  src: "./fonts/AmericanaStdRoman.otf",
  weight: "400",
  variable: "--font-americana",
});

export const metadata: Metadata = {
  title: "Flöra",
  description: "Flöra",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${gotham.variable} ${americana.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <CartProvider>
          <NavMenuProvider>
            {/* The site is capped at 1500px and centred on wide desktops */}
            <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col">
              {children}
              <Footer />
            </div>
            <StickyNavbar />
            <NavMenuOverlay />
          </NavMenuProvider>
        </CartProvider>
        <LoadingScreen />
      </body>
    </html>
  );
}
