import Image from "next/image";
import Link from "next/link";
import CartLink from "./cart-link";
import HeroVideo from "./hero-video";
import { getT } from "@/lib/i18n-server";
import RolloverText from "./rollover-text";

const NAV_LINKS = [
  { key: "nav.shop", href: "/shop" },
  { key: "nav.vintage", href: "/vintage" },
  { key: "nav.values", href: "/values" },
  { key: "nav.about", href: "/about" },
] as const;

const NAV_TEXT = "flex items-center gap-[42px] font-americana text-big-header-mobile capitalize whitespace-nowrap";

function Logo() {
  return (
    <Link href="/" aria-label="Flöra home">
      <Image
        src="/footer/flora-logo.svg"
        alt="Flöra"
        width={486.544}
        height={109.193}
        preload
        loading="eager"
        className="h-[109.193px] w-[486.544px]"
      />
    </Link>
  );
}

const INTRO =
  "FLÖRA is natural fabrics, honest production, and respect the bodies wearing them. Everything about FLÖRA will be 100% transparent, we won’t hide anything. We are far from perfect, but we are honest. So you will know exactly what you’re getting.";

export type HeroLogoPosition = "left" | "center";

export default async function FrontHeroDesktop({
  parallax = true,
  logoPosition = "left",
  className = "",
  videoSrc = "/hero/front-hero-1080.mp4",
}: {
  /** Let the background video drift as you scroll. */
  parallax?: boolean;
  videoSrc?: string;
  /** "left" is the Figma layout with all links right; "center" puts the wordmark between two links each side. */
  logoPosition?: HeroLogoPosition;
  className?: string;
}) {
  const t = await getT();
  return (
    <section
      className={`full-bleed relative flex h-screen flex-col overflow-hidden p-[42px] text-white ${className}`}
    >
      {/* Background video with parallax (photo as poster) under the vertical darkening gradient */}
      <div aria-hidden className="absolute inset-0">
        <HeroVideo src={videoSrc} parallax={parallax} />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(180deg, rgba(0,0,0,0.25) 28.521%, rgba(0,0,0,0.41) 59.186%)",
          }}
        />
      </div>

      <div className="relative mx-auto flex w-full max-w-[1500px] flex-1 flex-col items-start justify-between">
        {logoPosition === "center" ? (
          /* Wordmark centred with two links each side: Shop, Values | FLÖRA | About, Cart */
          <header className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-[42px]">
            <nav aria-label="Primary" className={`${NAV_TEXT} justify-end`}>
              {NAV_LINKS.slice(0, 2).map((link) => (
                <Link key={t(link.key)} href={link.href}>
                  <RolloverText text={t(link.key)} capitalize />
                </Link>
              ))}
            </nav>
            <Logo />
            <div className={`${NAV_TEXT} justify-start`}>
              {NAV_LINKS.slice(2).map((link) => (
                <Link key={t(link.key)} href={link.href}>
                  <RolloverText text={t(link.key)} capitalize />
                </Link>
              ))}
              <CartLink />
            </div>
          </header>
        ) : (
          /* Figma layout: wordmark left, links and cart right */
          <header className="flex w-full items-start justify-between">
            <Logo />
            <div className="flex items-start gap-[120px]">
              <nav aria-label="Primary" className={NAV_TEXT}>
                {NAV_LINKS.map((link) => (
                  <Link key={t(link.key)} href={link.href}>
                    <RolloverText text={t(link.key)} capitalize />
                  </Link>
                ))}
              </nav>
              <CartLink className="font-americana text-big-header-mobile capitalize whitespace-nowrap" />
            </div>
          </header>
        )}

        <p className="w-[521px] font-gotham text-paragraph">{INTRO}</p>
      </div>
    </section>
  );
}
