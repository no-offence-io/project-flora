import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
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
      {/* Only fonts and global styles live here; each area (shop, admin, account) brings its own chrome in its own layout. */}
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
