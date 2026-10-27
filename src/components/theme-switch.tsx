"use client";

import { useState } from "react";
import { THEME_COOKIE, type Theme } from "@/lib/theme-shared";

function saveTheme(next: Theme) {
  document.cookie = next === "auto" ? `${THEME_COOKIE}=; path=/; max-age=0` : `${THEME_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
  const html = document.documentElement;
  html.classList.remove("theme-auto", "theme-light", "theme-dark");
  html.classList.add(`theme-${next}`);
}

/**
 * "Light – Dark – Auto" in the language switch's style. Auto follows the device; the others are
 * remembered for this browser. Applied at once by swapping the class on <html>.
 */
export default function ThemeSwitch({ current, labels, tone = "light", className = "" }: { current: Theme; labels: Record<Theme, string>; tone?: "dark" | "light"; className?: string }) {
  const [theme, setTheme] = useState<Theme>(current);
  const on = tone === "dark" ? "text-black" : "text-white";
  const off = tone === "dark" ? "text-black/50" : "text-white/50";
  return (
    <span role="radiogroup" aria-label="Theme" className={`inline-flex items-center font-gotham text-paragraph whitespace-nowrap ${className}`}>
      {(["light", "dark", "auto"] as const).map((value, i) => (
        <span key={value} className="inline-flex items-center">
          {i > 0 && <span className={off}>&nbsp;–&nbsp;</span>}
          <button
            type="button"
            role="radio"
            aria-checked={theme === value}
            onClick={() => {
              setTheme(value);
              saveTheme(value);
            }}
            className={`hover:opacity-70 transition-opacity ${theme === value ? on : off}`}
          >
            {labels[value]}
          </button>
        </span>
      ))}
    </span>
  );
}
