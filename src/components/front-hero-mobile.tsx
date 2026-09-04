import Image from "next/image";
import Link from "next/link";
import CartLink from "./cart-link";
import HeroVideo from "./hero-video";
import { BurgerButton } from "./nav-menu";

const INTRO =
  "FLÖRA is natural fabrics, honest production, and respect the bodies wearing them. Everything about FLÖRA will be 100% transparent, we won’t hide anything. We are far from perfect, but we are honest. So you will know exactly what you’re getting.";

export default function FrontHeroMobile({
  parallax = true,
  className = "",
}: {
  /** Let the background video drift as you scroll. */
  parallax?: boolean;
  className?: string;
}) {
  return (
    <section
      className={`full-bleed relative flex h-screen flex-col items-center justify-between overflow-hidden p-[24px] text-white ${className}`}
    >
      {/* Background video with parallax (photo as poster) under the vertical darkening gradient */}
      <div aria-hidden className="absolute inset-0">
        <HeroVideo src="/hero/front-hero-720.mp4" parallax={parallax} />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(180deg, rgba(0,0,0,0.25) 28.521%, rgba(0,0,0,0.41) 59.186%)",
          }}
        />
      </div>

      {/* Mobile navbar: wordmark left, cart and burger right */}
      <header className="relative flex w-full items-start justify-between">
        <Link href="/" aria-label="Flöra home">
          <Image
            src="/footer/flora-logo.svg"
            alt="Flöra"
            width={486.544}
            height={109.193}
            preload
            loading="eager"
            className="h-auto w-[172px]"
            style={{ height: "auto" }}
          />
        </Link>

        <div className="flex items-start gap-[24px]">
          <CartLink variant="icon" />

          <BurgerButton />
        </div>
      </header>

      <p className="relative w-full font-gotham text-paragraph">{INTRO}</p>
    </section>
  );
}
