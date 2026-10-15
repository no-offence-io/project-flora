import Image from "next/image";
import { ParallaxLayer } from "./parallax";
import {
  SIGN_UP_DESCRIPTION,
  SIGN_UP_TITLE,
  YogaWearTitle,
  type SignUpBannerVariant,
} from "./sign-up-banner-shared";

/**
 * Figma "Sign up banner mobile" (194:1023): a 607px rounded card inset by the 24px page margin.
 * Figma only draws the clothing (YOGA WEAR™) version; the other variants fall back to the text title.
 */
export default function SignUpBannerMobile({
  variant = "clothing",
  parallax = false,
  className = "",
  title = SIGN_UP_TITLE,
  description = SIGN_UP_DESCRIPTION,
}: {
  variant?: SignUpBannerVariant;
  /** Let the photo drift as you scroll. */
  parallax?: boolean;
  className?: string;
  title?: string;
  description?: string;
}) {
  return (
    <section
      className={`relative mx-[24px] flex h-[607px] flex-col items-center justify-center gap-[24px] overflow-hidden rounded-[12px] p-[24px] text-white ${className}`}
    >
      {/* Photo scaled to 224% of the card width and mirrored, matching the Figma crop, drifting with parallax under a 41% black overlay.
          The zoomed box already overflows the card by well over 150px top and bottom, so that is the shift limit. */}
      <div aria-hidden className="absolute inset-0">
        <ParallaxLayer
          speed={0.15}
          maxShift={150}
          enabled={parallax}
          className="inset-0 h-full"
        >
          <div className="absolute top-0 left-[-69.3%] aspect-[2432/3626] w-[224.3%] -translate-y-[19.6%]">
            <Image
              src="/signup/signup-bg.jpg"
              alt=""
              fill
              sizes="230vw"
              className="-scale-x-100 object-cover"
            />
          </div>
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

      <form
        action="#"
        method="post"
        className="relative flex w-full flex-col gap-[8px]"
      >
        <label htmlFor="signup-email-mobile" className="sr-only">
          E-mail
        </label>
        <input
          id="signup-email-mobile"
          name="email"
          type="email"
          required
          placeholder="E-mail..."
          autoComplete="email"
          className="h-[39px] w-full rounded-full border border-white bg-white pl-[12px] pr-[6px] font-gotham text-paragraph text-black outline-none placeholder:text-[#939393]"
        />
        <button
          type="submit"
          className="flex h-[39px] w-full items-center justify-center rounded-full bg-black px-[12px] font-gotham text-paragraph text-white hover:opacity-80 transition-opacity"
        >
          Get Notified
        </button>
      </form>
    </section>
  );
}
