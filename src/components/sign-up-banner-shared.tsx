import Image from "next/image";

export type SignUpBannerVariant = "default" | "clothing" | "smaller";

export const SIGN_UP_TITLE = "Join the family";

export const SIGN_UP_DESCRIPTION =
  "We've spent the last months developing a collection built around one idea: movement should feel as good as it looks. Soft, considered fabrics. Cuts that hold their shape. Pieces made to move from the studio into the rest of your day.";

/** "YOGA WEAR™" wordmark used by the clothing variant. Scales to its container width. */
export function YogaWearTitle({ className = "" }: { className?: string }) {
  return (
    <Image
      src="/signup/yoga-wear.svg"
      alt="Yoga Wear"
      width={521}
      height={51.664}
      className={`h-auto w-full ${className}`}
      style={{ height: "auto" }}
    />
  );
}
