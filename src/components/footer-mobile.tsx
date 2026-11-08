import Image from "next/image";
import Link from "next/link";
import { FooterOverlay, NAV_LINKS, SocialLinks } from "./footer-shared";
import { ParallaxLayer } from "./parallax";
import { getSiteCopy } from "@/lib/catalog";
import { getT } from "@/lib/i18n-server";
import RolloverText from "./rollover-text";
import { getLogoSrc } from "@/lib/brand";

export default async function FooterMobile({ parallax = true, className = "" }: { parallax?: boolean; className?: string }) {
  const logo = await getLogoSrc();
  const [t, copy] = await Promise.all([getT(), getSiteCopy()]);
  return (
    <footer
      data-keep-colors
      className={`full-bleed relative flex h-svh flex-col items-center justify-end gap-[10px] overflow-hidden p-[24px] text-white ${className}`}
    >
      {/* Background: footer-bg-mobile.jpg is the part of the photo seen at the Figma crop, with the
          figure behind the wordmark. A pre-cut file, not the whole photo zoomed to 313% and clipped:
          a layer that wide is around 3700×5500px on an iPhone, and Safari drops it off-screen, so
          it flashed as it came back. Black underneath for the moment any photo is being redrawn. */}
      <div aria-hidden className="absolute inset-0 bg-black">
        {/* The crop runs well past the footer top and bottom, so 150px is a safe shift limit */}
        <ParallaxLayer speed={0.15} maxShift={150} enabled={parallax} className="inset-0 h-full">
          {copy.footerImage ? (
            <Image src={copy.footerImage} alt="" fill sizes="100vw" className="object-cover" />
          ) : (
            <div className="absolute left-0 aspect-[768/2536] w-full" style={{ top: "-55.6vw" }}>
              <Image src="/footer/footer-bg-mobile.jpg" alt="" fill sizes="100vw" className="object-cover" />
            </div>
          )}
        </ParallaxLayer>
        <FooterOverlay />
      </div>

      <div className="relative flex w-full flex-col items-center gap-[220px]">
        <Image
          src={logo}
          alt="Flöra"
          width={486.544}
          height={109.193}
          className="h-auto w-full"
          style={{ height: "auto" }}
        />

        <div className="flex flex-col items-center gap-[12px]">
          <nav
            aria-label="Footer"
            className="flex w-[259px] flex-wrap content-center items-center justify-center gap-x-[24px] gap-y-[12px] font-gotham text-paragraph whitespace-nowrap"
          >
            {NAV_LINKS.map((link) => (
              <Link key={t(link.key)} href={link.href}>
                <RolloverText text={t(link.key)} />
              </Link>
            ))}
          </nav>

          <SocialLinks instagram={copy.instagram} />

          <p className="text-center font-americana text-[12px] leading-normal uppercase whitespace-nowrap">
            {t("footer.credit")}
            <br />
            © 2026 Flöra
          </p>
        </div>
      </div>
    </footer>
  );
}
