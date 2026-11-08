"use client";

import { useEffect } from "react";

/**
 * Keeps a focused field clear of the phone keyboard. The browser scrolls a focused field into
 * view on its own, but often only just, with the field sitting right on the keyboard's edge or
 * under it. Once the browser has finished (the keyboard has risen and the page has stopped
 * moving) the page is corrected once: if the field isn't comfortably inside the visible part of
 * the screen it is scrolled so the field sits in the middle of that. One correction only, after
 * everything else has settled, so it never fights the browser's own scrolling.
 *
 * The visible part is what the keyboard leaves of the screen. Some browsers report it through
 * the visual viewport; iPhone Safari doesn't always shrink it, so on a touch screen where the
 * viewport hasn't shrunk the keyboard is assumed to take the lower half, and the field goes to
 * the middle of the upper half.
 */
export default function KeyboardAware() {
  useEffect(() => {
    const vv = window.visualViewport;
    let poll = 0;
    const stop = () => window.clearInterval(poll);
    const onFocus = (e: FocusEvent) => {
      const field = e.target as HTMLElement | null;
      if (!field || !field.matches("input:not([type=checkbox]):not([type=radio]):not([type=submit]), textarea, select")) return;
      stop();
      const started = performance.now();
      let lastChange = started;
      let seen = `${window.scrollY}|${vv?.height ?? 0}|${vv?.offsetTop ?? 0}`;
      poll = window.setInterval(() => {
        if (document.activeElement !== field) return stop();
        const now = performance.now();
        const state = `${Math.round(window.scrollY)}|${Math.round(vv?.height ?? 0)}|${Math.round(vv?.offsetTop ?? 0)}`;
        if (state !== seen) {
          seen = state;
          lastChange = now;
        }
        // Settled: nothing has moved for 200ms, and the keyboard has had time to rise. Or give up waiting after 1.5s.
        if (now - started < 350 || (now - lastChange < 200 && now - started < 1500)) return;
        stop();
        const rect = field.getBoundingClientRect();
        const top = vv?.offsetTop ?? 0;
        const reported = vv?.height ?? window.innerHeight;
        const shrunk = reported < window.innerHeight - 100;
        const touch = window.matchMedia("(pointer: coarse)").matches;
        const height = touch && !shrunk ? reported * 0.5 : reported;
        const margin = Math.min(120, height * 0.2);
        if (rect.top >= top + margin && rect.bottom <= top + height - margin) return;
        window.scrollBy({ top: rect.top + rect.height / 2 - (top + height / 2), behavior: "smooth" });
      }, 50);
    };
    document.addEventListener("focusin", onFocus);
    return () => {
      document.removeEventListener("focusin", onFocus);
      stop();
    };
  }, []);
  return null;
}
