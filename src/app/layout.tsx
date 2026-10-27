import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { brandStyle, getBrand } from "@/lib/brand";
import { cookies } from "next/headers";
import { parseTheme, THEME_COOKIE } from "@/lib/theme-shared";

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
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.prosjectflora.com"),
  title: "Flöra",
  description: "Flöra — natural fabrics, honest production, made to your measurements in Norway.",
  openGraph: { siteName: "Flöra", type: "website", locale: "en_GB", alternateLocale: ["nb_NO"] },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Settings → Brand can swap fonts, sizes and colours; it does so by overriding the variables the
  // stylesheet already uses, so nothing else has to know.
  const { style, fontHref } = brandStyle(await getBrand());
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${gotham.variable} ${americana.variable} h-full antialiased theme-${theme}`}
      style={style as React.CSSProperties}
    >
      {fontHref && (
        <head>
          <link rel="stylesheet" href={fontHref} />
        </head>
      )}
      {/* Only fonts and global styles live here; each area (shop, admin, account) brings its own chrome in its own layout. */}
      <body className="min-h-full flex flex-col">
        {children}
        {/* Cookieless visitor counts; needs Analytics enabled once on the Vercel project. */}
        <Analytics />
      </body>
    </html>
  );
}
