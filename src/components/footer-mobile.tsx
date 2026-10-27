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
      {/* Background: the photo is scaled to 313% of the footer width and shifted so the
          figure sits behind the wordmark, matching the Figma crop at 393px. */}
      <div aria-hidden className="absolute inset-0">
        {/* The zoomed box overflows the footer by several hundred pixels, so 150px is a safe shift limit */}
        <ParallaxLayer speed={0.15} maxShift={150} enabled={parallax} className="inset-0 h-full">
          {copy.footerImage ? (
            <Image src={copy.footerImage} alt="" fill sizes="100vw" className="object-cover" />
          ) : (
            <div className="absolute top-0 left-[-107.12%] aspect-[2408/3623] w-[313.49%] -translate-y-[41.8%]">
              <Image
                src="/footer/footer-bg.jpg"
                alt=""
                fill
                sizes="320vw"
                className="object-cover"
              />
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
