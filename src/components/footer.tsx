import FooterDesktop from "./footer-desktop";
import FooterMobile from "./footer-mobile";

/** Renders the mobile footer below the `md` breakpoint and the desktop footer from `md` up. */
export default function Footer({ parallax = false }: { parallax?: boolean }) {
  return (
    <>
      <div className="md:hidden">
        <FooterMobile parallax={parallax} />
      </div>
      <div className="hidden md:block">
        <FooterDesktop parallax={parallax} />
      </div>
    </>
  );
}
