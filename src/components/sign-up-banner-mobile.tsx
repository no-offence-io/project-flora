import Image from "next/image";
import { ParallaxLayer } from "./parallax";
import {
  SIGN_UP_DESCRIPTION,
  SIGN_UP_TITLE,
  YogaWearTitle,
  type SignUpBannerVariant,
} from "./sign-up-banner-shared";
import SignUpForm from "./sign-up-form";

/**
 * Figma "Sign up banner mobile" (194:1023): a 607px rounded card inset by the 24px page margin.
 * Figma only draws the clothing (YOGA WEAR™) version; the other variants fall back to the text title.
 */
export default async function SignUpBannerMobile({
  variant = "clothing",
  parallax = false,
  className = "",
  title = SIGN_UP_TITLE,
  description = SIGN_UP_DESCRIPTION,
  buttonLabel,
  image,
}: {
  variant?: SignUpBannerVariant;
  /** A photo uploaded in the admin; the built-in one otherwise. It gets a plain cover crop, not the Figma zoom tuned to the built-in photo. */
  image?: string;
  /** Let the photo drift as you scroll. */
  parallax?: boolean;
  className?: string;
  title?: string;
  description?: string;
  buttonLabel?: string;
}) {
  return (
    <section
      data-keep-colors
      className={`relative mx-[24px] flex h-[607px] flex-col items-center justify-center gap-[24px] overflow-hidden rounded-[12px] bg-black p-[24px] text-white ${className}`}
    >
      {/* signup-bg-mobile.jpg is the mirrored part of the photo in the Figma crop, under a 41% black
          overlay. A pre-cut file, not the whole photo zoomed to 224% and clipped, which iPhone
          Safari drops off-screen and redraws late (see footer-mobile.tsx). It overflows the card
          by over 150px, so that is the parallax limit. */}
      <div aria-hidden className="absolute inset-0">
        <ParallaxLayer
          speed={0.15}
          maxShift={150}
          enabled={parallax}
          className="inset-0 h-full"
        >
          {image ? (
            <Image src={image} alt="" fill sizes="100vw" className="object-cover" />
          ) : (
          <div className="absolute top-0 left-0 aspect-[1085/2828] w-full -translate-y-[5.9%]">
            <Image src="/signup/signup-bg-mobile.jpg" alt="" fill sizes="100vw" className="object-cover" />
          </div>
          )}
        </ParallaxLayer>
        <div className="absolute inset-0 bg-black/41" />
      </div>

      <div className="relative flex w-full flex-col items-center gap-[24px]">
        {variant === "clothing" ? (
          <YogaWearTitle />
        ) : (
          <h2 className="font-americana text-big-header-mobile text-center uppercase">
            {title}
          </h2>
        )}
        <p className="w-full text-center font-gotham text-paragraph">
          {description}
        </p>
      </div>

      <SignUpForm layout="mobile" buttonLabel={buttonLabel} />
    </section>
  );
}
