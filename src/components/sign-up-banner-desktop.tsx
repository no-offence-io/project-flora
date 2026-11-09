import Image from "next/image";
import { mediaStyle, type MediaTransform } from "@/lib/media-transform";
import { CareInstructions } from "./care-icons";
import { ParallaxLayer } from "./parallax";
import {
  SIGN_UP_DESCRIPTION,
  SIGN_UP_TITLE,
  YogaWearTitle,
  type SignUpBannerVariant,
} from "./sign-up-banner-shared";
import SignUpForm from "./sign-up-form";

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
  image,
  imageFit,
}: {
  variant?: SignUpBannerVariant;
  /** A photo uploaded in the admin; the built-in one otherwise. */
  image?: string;
  /** How the uploaded photo sits in the banner, from the media editor. */
  imageFit?: MediaTransform;
  /** Let the photo drift as you scroll. */
  parallax?: boolean;
  className?: string;
  title?: string;
  description?: string;
  buttonLabel?: string;
}) {
  const isSmaller = variant === "smaller";
  const isClothing = variant === "clothing";

  return (
    <section
      data-keep-colors
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
          {image ? (
            <Image src={image} alt="" fill sizes="100vw" className="object-cover" style={mediaStyle(imageFit)} />
          ) : (
            <Image
              src="/signup/signup-bg.jpg"
              alt=""
              fill
              sizes="100vw"
              className="-scale-x-100 object-cover object-[50%_28%]"
            />
          )}
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

        <SignUpForm layout="desktop" buttonLabel={buttonLabel} />
      </div>

      {isClothing && (
        <CareInstructions className="absolute bottom-[24px] left-1/2 w-max -translate-x-1/2 gap-[42px]" />
      )}
    </section>
  );
}
