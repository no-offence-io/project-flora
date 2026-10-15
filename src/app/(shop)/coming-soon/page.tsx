import type { Metadata } from "next";
import { getT } from "@/lib/i18n-server";

export const metadata: Metadata = {
  title: "Flöra – Coming soon",
  description: "Flöra. Something new is growing.",
  // The placeholder must not be what search engines remember the domain for.
  robots: { index: false, follow: false },
};

/** The Flöra bud mark, same paths as the intro animation. */
const RING =
  "M17.5845 36.8429C26.5178 36.8429 30.1381 30.6407 30.1381 22.5871C30.1381 13.8855 26.5178 7.68331 17.5845 7.68331C8.65119 7.68331 5.03085 13.8855 5.03085 22.5871C5.03085 30.6407 8.65119 36.8429 17.5845 36.8429ZM17.5845 38C8.74522 38 0 32.1681 0 22.1705C0 12.3581 8.74522 6.52619 17.5845 6.52619C26.4237 6.52619 35.1689 12.3581 35.1689 22.1705C35.1689 32.1681 26.4237 38 17.5845 38Z";
const DOT_LEFT =
  "M10.6729 2.26797C10.6729 1.06456 11.6603 0 12.9768 0C14.2933 0 15.2336 1.06456 15.2336 2.26797C15.2336 3.47138 14.2933 4.48965 12.9768 4.48965C11.6603 4.48965 10.6729 3.47138 10.6729 2.26797Z";
const DOT_RIGHT =
  "M20.0294 2.26797C20.0294 1.06456 21.0167 0 22.3332 0C23.6497 0 24.5901 1.06456 24.5901 2.26797C24.5901 3.47138 23.6497 4.48965 22.3332 4.48965C21.0167 4.48965 20.0294 3.47138 20.0294 2.26797Z";

/**
 * Placeholder shown in place of every page while the shop is held back from launch.
 *
 * It covers the viewport rather than sitting in the page flow, so the site's own footer and sticky
 * navbar — rendered by the root layout on every route — stay out of sight behind it. `.coming-soon-gate`
 * is what locks the page behind it from scrolling (see globals.css).
 */
export default async function ComingSoonPage() {
  const t = await getT();
  return (
    <div className="coming-soon-gate fixed inset-0 z-[200] flex flex-col items-center justify-center gap-[24px] bg-white px-[24px] text-center">
      <svg width={36} height={38} viewBox="0 0 36 38" aria-label="Flöra" className="h-[38px] w-auto">
        <path d={RING} fill="black" />
        <path d={DOT_LEFT} fill="black" />
        <path d={DOT_RIGHT} fill="black" />
      </svg>

      <h1 className="m-0 font-americana text-big-header-mobile capitalize text-black md:text-big-header-desktop">{t("comingSoon.title")}</h1>

      <p className="m-0 max-w-[420px] font-gotham text-paragraph text-black/70">
        {t("comingSoon.text")}
      </p>
    </div>
  );
}
