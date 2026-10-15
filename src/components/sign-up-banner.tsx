import SignUpBannerDesktop from "./sign-up-banner-desktop";
import SignUpBannerMobile from "./sign-up-banner-mobile";
import type { SignUpBannerVariant } from "./sign-up-banner-shared";
import { getSiteCopy } from "@/lib/catalog";

/** Renders the mobile card below the `md` breakpoint and the desktop banner from `md` up. */
export default async function SignUpBanner({
  variant = "default",
  mobileVariant = variant,
  parallax = false,
  className = "",
}: {
  variant?: SignUpBannerVariant;
  /** Variant for the mobile card when it should differ from desktop. */
  mobileVariant?: SignUpBannerVariant;
  /** Let the photo drift as you scroll. */
  parallax?: boolean;
  className?: string;
}) {
  const copy = await getSiteCopy();
  return (
    <>
      <div className={`md:hidden ${className}`}>
        <SignUpBannerMobile variant={mobileVariant} parallax={parallax} title={copy.signUpTitle} description={copy.signUpText} />
      </div>
      <div className={`hidden md:block ${className}`}>
        <SignUpBannerDesktop variant={variant} parallax={parallax} title={copy.signUpTitle} description={copy.signUpText} />
      </div>
    </>
  );
}
