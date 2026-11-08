"use client";

import { useEffect } from "react";

/**
 * Keeps a focused field clear of the phone keyboard. The browser scrolls a focused field into
 * view on its own, but often only just, with the field sitting right on the keyboard's edge;
 * once the keyboard has opened (the visual viewport shrinks) the page is scrolled so the field
 * sits in the middle of what is left of the screen.
 */
export default function KeyboardAware() {
  useEffect(() => {
    const vv = window.visualViewport;
    let timer = 0;
    const settle = (field: HTMLElement) => {
      const rect = field.getBoundingClientRect();
      const top = vv?.offsetTop ?? 0;
      const height = vv?.height ?? window.innerHeight;
      // Only move the page if the field isn't already comfortably inside the visible part.
      const margin = Math.min(120, height * 0.2);
      if (rect.top >= top + margin && rect.bottom <= top + height - margin) return;
      window.scrollBy({ top: rect.top + rect.height / 2 - (top + height / 2), behavior: "smooth" });
    };
    const onFocus = (e: FocusEvent) => {
      const field = e.target as HTMLElement | null;
      if (!field || !field.matches("input:not([type=checkbox]):not([type=radio]):not([type=submit]), textarea, select")) return;
      window.clearTimeout(timer);
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        vv?.removeEventListener("resize", finish);
        // A moment more, so the keyboard has finished rising before the page moves.
        timer = window.setTimeout(() => {
          if (document.activeElement === field) settle(field);
        }, 120);
      };
      vv?.addEventListener("resize", finish);
      // No keyboard appeared (a laptop, or a field already above it): check anyway shortly after.
      timer = window.setTimeout(finish, 400);
    };
    document.addEventListener("focusin", onFocus);
    return () => {
      document.removeEventListener("focusin", onFocus);
      window.clearTimeout(timer);
    };
  }, []);
  return null;
}
