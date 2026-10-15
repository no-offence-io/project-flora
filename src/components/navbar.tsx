import Image from "next/image";
import Link from "next/link";
import CartLink from "./cart-link";
import { BurgerButton } from "./nav-menu";
import LanguageSwitch from "./language-switch";
import { getLanguage } from "@/lib/language";

export const NAV_LINKS = [
  { label: "Shop", href: "/shop" },
  { label: "Values", href: "/#values" },
  { label: "About", href: "/about" },
];

/**
 * Page navbar from Figma "Navbar desktop" (99:312) and "Navbar mobile" (41:1499).
 * `tone="dark"` is black-on-white for content pages; `tone="light"` is white for photo backgrounds.
 */
export default async function Navbar({ tone = "dark", className = "" }: { tone?: "dark" | "light"; className?: string }) {
  const lang = await getLanguage();
  const color = tone === "dark" ? "text-black" : "text-white";
  const logoFilter = tone === "dark" ? "invert" : "";

  return (
    <header className={`w-full ${color} ${className}`}>
      {/* Mobile: large wordmark, cart, burger */}
      <div className="flex items-start justify-between p-[24px] md:hidden">
        <Link href="/" aria-label="Flöra home">
          <Image
            src="/footer/flora-logo.svg"
            alt="Flöra"
            width={486.544}
            height={109.193}
            className={`h-auto w-[172px] ${logoFilter}`}
            style={{ height: "auto" }}
          />
        </Link>
        <div className="flex items-start gap-[24px]">
          <CartLink variant="icon" />
          <BurgerButton className={color} />
        </div>
      </div>

      {/* Desktop: small wordmark, Gotham links, cart */}
      <div className="hidden items-center justify-between px-[42px] py-[12px] md:flex">
        <Link href="/" aria-label="Flöra home">
          <Image
            src="/footer/flora-logo.svg"
            alt="Flöra"
            width={486.544}
            height={109.193}
            className={`h-[20px] w-[89px] ${logoFilter}`}
          />
        </Link>
        <div className="flex items-center gap-[120px]">
          <nav aria-label="Primary" className="flex items-center gap-[42px] font-gotham text-paragraph whitespace-nowrap">
            {NAV_LINKS.map((link) => (
              <Link key={link.label} href={link.href} className="hover:opacity-70 transition-opacity">
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-[42px]">
            <LanguageSwitch current={lang} tone={tone} />
            <CartLink className="font-gotham text-paragraph" />
          </div>
        </div>
      </div>
    </header>
  );
}
