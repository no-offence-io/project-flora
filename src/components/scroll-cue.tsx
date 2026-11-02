import { getT } from "@/lib/i18n-server";
import ScrollFade from "./scroll-fade";

/** "Explore" over the hero, with a hairline that reaches down and draws back up: there is more below. Gone once the visitor starts scrolling. */
export default async function ScrollCue({ className = "" }: { className?: string }) {
  const t = await getT();
  return (
    <ScrollFade className={`flex flex-col items-center gap-[12px] ${className}`}>
      {/* The left padding balances the tracking after the last letter, so the word centres on the line. */}
      <span aria-hidden className="pl-[0.2em] font-gotham text-[11px] leading-normal tracking-[0.2em] uppercase">{t("hero.explore")}</span>
      <span className="scroll-cue-line block h-[42px] w-px bg-white" />
    </ScrollFade>
  );
}
