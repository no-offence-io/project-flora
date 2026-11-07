"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import "lenis/dist/lenis.css";

/**
 * Smooth scrolling for the shop, with Lenis: the wheel and keyboard glide the page instead of
 * stepping it, the way most fashion and gallery sites move. Touch stays native (a finger already
 * scrolls smoothly, and fighting it feels wrong). It respects prefers-reduced-motion, lets nested
 * scroll areas such as the product photo rows scroll on their own, and pauses whenever the menu
 * locks the page (the menu sets `overflow: hidden` on the body; we watch for it), so a wheel over
 * the open menu doesn't move the page behind it.
 */
export default function SmoothScroll() {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.25,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      syncTouch: false,
      anchors: true,
      allowNestedScroll: true,
      autoRaf: true,
      respectReducedMotion: true,
    });
    const body = document.body;
    const sync = () => {
      if (body.style.overflow === "hidden") lenis.stop();
      else lenis.start();
    };
    const observer = new MutationObserver(sync);
    observer.observe(body, { attributes: true, attributeFilter: ["style"] });
    sync();
    return () => {
      observer.disconnect();
      lenis.destroy();
    };
  }, []);
  return null;
}
