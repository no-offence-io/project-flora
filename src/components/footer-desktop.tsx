import Image from "next/image";
import Link from "next/link";
import { FooterOverlay, NAV_LINKS, SocialLinks } from "./footer-shared";
import { ParallaxLayer } from "./parallax";

export default function FooterDesktop({ parallax = true, className = "" }: { parallax?: boolean; className?: string }) {
  return (
    <footer
      className={`full-bleed relative flex h-screen flex-col items-center justify-end gap-[10px] overflow-hidden px-[42px] py-[24px] text-white ${className}`}
    >
      {/* Background image, drifting with parallax, under the dark overlays */}
      <div aria-hidden className="absolute inset-0">
        <ParallaxLayer speed={0.15} enabled={parallax} className="-top-[20%] h-[140%]">
          <Image
            src="/footer/footer-bg.jpg"
            alt=""
            fill
            sizes="100vw"
            className="object-cover object-[50%_65%]"
          />
        </ParallaxLayer>
        <FooterOverlay />
      </div>

      {/* Centered wordmark */}
      <Image
        src="/footer/flora-logo.svg"
        alt="Flöra"
        width={486.544}
        height={109.193}
        className="absolute top-1/2 left-1/2 h-[109.193px] w-[486.544px] -translate-x-1/2 -translate-y-1/2"
      />

      <div className="relative flex flex-col items-center gap-[12px]">
        <nav
          aria-label="Footer"
          className="flex items-start gap-[24px] font-gotham text-paragraph whitespace-nowrap"
        >
          {NAV_LINKS.map((link) => (
            <Link key={link.label} href={link.href} className="hover:opacity-70 transition-opacity">
              {link.label}
            </Link>
          ))}
        </nav>

        <SocialLinks />

        <p className="flex items-start gap-[12px] font-americana text-[12px] leading-normal uppercase whitespace-nowrap">
          <span>© 2026 Flöra</span>
          <span aria-hidden>|</span>
          <span>Design & website by No Offence</span>
        </p>
      </div>
    </footer>
  );
}
