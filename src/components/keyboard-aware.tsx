"use client";

import { useEffect } from "react";

/**
 * Keeps a focused field clear of the phone keyboard. The browser scrolls a focused field into
 * view on its own, but often only just, with the field sitting right on the keyboard's edge or
 * under it. For a second after a field takes focus the page is checked a few times, and if the
 * field isn't comfortably inside the visible part of the screen (what the keyboard leaves of it,
 * read from the visual viewport) the page is scrolled so the field sits in the middle of it.
 */
export default function KeyboardAware() {
  useEffect(() => {
    const vv = window.visualViewport;
    const timers: number[] = [];
    const settle = (field: HTMLElement) => {
      if (document.activeElement !== field) return;
      const rect = field.getBoundingClientRect();
      const top = vv?.offsetTop ?? 0;
      const height = vv?.height ?? window.innerHeight;
      const margin = Math.min(120, height * 0.2);
      if (rect.top >= top + margin && rect.bottom <= top + height - margin) return;
      window.scrollBy({ top: rect.top + rect.height / 2 - (top + height / 2), behavior: "smooth" });
    };
    const onFocus = (e: FocusEvent) => {
      const field = e.target as HTMLElement | null;
      if (!field || !field.matches("input:not([type=checkbox]):not([type=radio]):not([type=submit]), textarea, select")) return;
      timers.splice(0).forEach((t) => window.clearTimeout(t));
      // The keyboard takes about 300ms to rise; check once it has, and again in case the browser
      // moved the page itself in the meantime.
      for (const delay of [350, 650, 1000]) timers.push(window.setTimeout(() => settle(field), delay));
    };
    document.addEventListener("focusin", onFocus);
    return () => {
      document.removeEventListener("focusin", onFocus);
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, []);
  return null;
}
