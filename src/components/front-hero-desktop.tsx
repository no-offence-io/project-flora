import Image from "next/image";
import Link from "next/link";
import CartLink from "./cart-link";
import HeroVideo from "./hero-video";

const NAV_LINKS = [
  { label: "Shop", href: "/shop" },
  { label: "Values", href: "/values" },
  { label: "About", href: "/about" },
];

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

export default function FrontHeroDesktop({
  parallax = true,
  logoPosition = "left",
  className = "",
}: {
  /** Let the background video drift as you scroll. */
  parallax?: boolean;
  /** "left" is the Figma layout with all links right; "center" puts the wordmark between two links each side. */
  logoPosition?: HeroLogoPosition;
  className?: string;
}) {
  return (
    <section
      className={`full-bleed relative flex h-screen flex-col overflow-hidden p-[42px] text-white ${className}`}
    >
      {/* Background video with parallax (photo as poster) under the vertical darkening gradient */}
      <div aria-hidden className="absolute inset-0">
        <HeroVideo src="/hero/front-hero-1080.mp4" parallax={parallax} />
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
                <Link key={link.label} href={link.href} className="hover:opacity-70 transition-opacity">
                  {link.label}
                </Link>
              ))}
            </nav>
            <Logo />
            <div className={`${NAV_TEXT} justify-start`}>
              {NAV_LINKS.slice(2).map((link) => (
                <Link key={link.label} href={link.href} className="hover:opacity-70 transition-opacity">
                  {link.label}
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
                  <Link key={link.label} href={link.href} className="hover:opacity-70 transition-opacity">
                    {link.label}
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
