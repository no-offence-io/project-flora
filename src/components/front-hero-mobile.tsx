import Image from "next/image";
import Link from "next/link";
import CartLink from "./cart-link";
import HeroVideo from "./hero-video";
import { BurgerButton } from "./nav-menu";
import ScrollCue from "./scroll-cue";
import { getLogoSrc } from "@/lib/brand";

const INTRO =
  "FLÖRA is natural fabrics, honest production, and respect the bodies wearing them. Everything about FLÖRA will be 100% transparent, we won’t hide anything. We are far from perfect, but we are honest. So you will know exactly what you’re getting.";

export default async function FrontHeroMobile({
  parallax = true,
  className = "",
  videoSrc = "/hero/front-hero-720.mp4",
}: {
  /** Let the background video drift as you scroll. */
  parallax?: boolean;
  videoSrc?: string;
  className?: string;
}) {
  const logo = await getLogoSrc();
  return (
    <section
      data-keep-colors
      className={`full-bleed relative flex h-svh flex-col items-center justify-between overflow-hidden p-[24px] text-white ${className}`}
    >
      {/* Background video with parallax (photo as poster) under the vertical darkening gradient */}
      {/* Dark under the video, so it fades in from black and the white text is readable before it does */}
      <div aria-hidden className="absolute inset-0 bg-black">
        <HeroVideo src={videoSrc} parallax={parallax} />
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
            src={logo}
            alt="Flöra"
            width={486.544}
            height={109.193}
            preload
            loading="eager"
            className="h-auto w-[138px]"
            style={{ height: "auto" }}
          />
        </Link>

        <div className="flex items-start gap-[24px]">
          <CartLink variant="icon" />

          <BurgerButton />
        </div>
      </header>

      <div className="relative flex w-full flex-col items-center gap-[24px]">
        <p className="w-full font-gotham text-paragraph">{INTRO}</p>
        <ScrollCue />
      </div>
    </section>
  );
}
