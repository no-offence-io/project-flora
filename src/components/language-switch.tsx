import { setLanguage } from "@/lib/language-actions";
import type { Lang } from "@/lib/language-shared";

/**
 * "EN – NO", in the checkout-steps style: the current language black, the other at 50%. A form
 * per language rather than a client toggle, so it works before JavaScript loads and the choice is
 * stored server-side in a cookie that every page reads.
 */
export default function LanguageSwitch({ current, tone = "dark", className = "" }: { current: Lang; tone?: "dark" | "light"; className?: string }) {
  const on = tone === "dark" ? "text-black" : "text-white";
  const off = tone === "dark" ? "text-black/50" : "text-white/50";
  return (
    <span className={`inline-flex items-center font-gotham text-paragraph whitespace-nowrap ${className}`} aria-label="Language">
      {(["en", "no"] as const).map((lang, i) => (
        <span key={lang} className="inline-flex items-center">
          {i > 0 && <span className={off}>&nbsp;–&nbsp;</span>}
          <form action={setLanguage} className="inline">
            <input type="hidden" name="lang" value={lang} />
            <button type="submit" aria-current={lang === current ? "true" : undefined} className={`uppercase hover:opacity-70 transition-opacity ${lang === current ? on : off}`}>
              {lang}
            </button>
          </form>
        </span>
      ))}
    </span>
  );
}
