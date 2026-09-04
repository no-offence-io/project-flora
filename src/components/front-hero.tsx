import FrontHeroDesktop, { type HeroLogoPosition } from "./front-hero-desktop";
import FrontHeroMobile from "./front-hero-mobile";

/** Renders the mobile hero below the `md` breakpoint and the desktop hero from `md` up. */
export default function FrontHero({
  parallax = true,
  logoPosition = "left",
}: {
  parallax?: boolean;
  /** Desktop hero header: "left" is the Figma layout, "center" puts the wordmark between the links. */
  logoPosition?: HeroLogoPosition;
}) {
  return (
    <>
      <div className="md:hidden">
        <FrontHeroMobile parallax={parallax} />
      </div>
      <div className="hidden md:block">
        <FrontHeroDesktop parallax={parallax} logoPosition={logoPosition} />
      </div>
    </>
  );
}
