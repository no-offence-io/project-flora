import Image from "next/image";
import { CareInstructions } from "./care-icons";
import { ParallaxLayer } from "./parallax";
import {
  SIGN_UP_DESCRIPTION,
  SIGN_UP_TITLE,
  YogaWearTitle,
  type SignUpBannerVariant,
} from "./sign-up-banner-shared";
import { getT } from "@/lib/i18n-server";

/**
 * Figma "Sign up banner desktop" (181:769).
 * - default: full-bleed, "Join the family" title
 * - clothing: full-bleed, "YOGA WEAR™" wordmark and care instructions along the bottom
 * - smaller: 673px rounded card inset by the 42px page margin
 */
export default async function SignUpBannerDesktop({
  variant = "default",
  parallax = false,
  className = "",
  title = SIGN_UP_TITLE,
  description = SIGN_UP_DESCRIPTION,
  buttonLabel,
}: {
  variant?: SignUpBannerVariant;
  /** Let the photo drift as you scroll. */
  parallax?: boolean;
  className?: string;
  title?: string;
  description?: string;
  buttonLabel?: string;
}) {
  const t = await getT();
  const isSmaller = variant === "smaller";
  const isClothing = variant === "clothing";

  return (
    <section
      className={`relative flex flex-col items-center justify-center overflow-hidden text-white ${
        isSmaller ? "mx-[42px] h-[673px] rounded-[24px]" : "h-[891px] w-full"
      } ${className}`}
    >
      {/* Photo, mirrored horizontally as in Figma, drifting with parallax under the diagonal darkening gradient */}
      <div aria-hidden className="absolute inset-0">
        <ParallaxLayer
          speed={0.15}
          enabled={parallax}
          className="-top-[20%] h-[140%]"
        >
          <Image
            src="/signup/signup-bg.jpg"
            alt=""
            fill
            sizes="100vw"
            className="-scale-x-100 object-cover object-[50%_28%]"
          />
        </ParallaxLayer>
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(165.8deg, rgba(0,0,0,0.48) 11.974%, rgba(0,0,0,0.298) 84.984%)",
          }}
        />
      </div>

      <div className="relative flex flex-col items-center gap-[24px]">
        <div className="flex w-[537px] flex-col items-center gap-[45px]">
          <div className="flex h-[52px] w-full items-start justify-center">
            {isClothing ? (
              <YogaWearTitle className="w-[521px]" />
            ) : (
              <h2 className="font-americana text-banner-title text-center uppercase whitespace-nowrap">
                {title}
              </h2>
            )}
          </div>
          <p className="w-full text-center font-gotham text-paragraph">
            {description}
          </p>
        </div>

        <form action="#" method="post" className="w-[512px]">
          <label htmlFor="signup-email-desktop" className="sr-only">
            E-mail
          </label>
          <div className="flex items-center justify-between rounded-full border border-white py-[6px] pr-[6px] pl-[12px]">
            <input
              id="signup-email-desktop"
              name="email"
              type="email"
              required
              placeholder={t("signup.placeholder")}
              autoComplete="email"
              className="min-w-0 flex-1 bg-transparent font-gotham text-paragraph text-white outline-none placeholder:text-white"
            />
            <button
              type="submit"
              className="shrink-0 rounded-full bg-black px-[12px] py-[6px] font-gotham text-paragraph whitespace-nowrap hover:opacity-80 transition-opacity"
            >
              {buttonLabel ?? t("signup.button")}
            </button>
          </div>
        </form>
      </div>

      {isClothing && (
        <CareInstructions className="absolute bottom-[24px] left-1/2 w-max -translate-x-1/2 gap-[42px]" />
      )}
    </section>
  );
}
