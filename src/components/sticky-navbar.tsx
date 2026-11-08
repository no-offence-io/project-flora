"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

/*
 * Fixed copy of the dark navbar that stays hidden above the viewport and slides down when you
 * scroll up, then slides away again when you scroll down. It only arms itself past the top of the
 * page: past the hero on the front page, past the in-flow navbar everywhere else.
 *
 * The hand-off at the top has to look like one navbar. While this copy is showing, the page's own
 * navbar is kept invisible (a class on <html>, see globals.css), so as the top of the page comes
 * back into view there is only the copy, with the page sliding in beneath it; the moment the page
 * reaches the very top the two sit pixel for pixel over each other and the copy is switched off
 * with no transition. From the top, the page's own navbar scrolls away by itself; the copy only
 * slides in or out once that navbar is fully out of view, so the two are never seen together.
 *
 * The navbar itself comes in as a child: it is a server component (it reads the language cookie),
 * and a client component can hold one but not import one.
 */
export default function StickyNavbar({ threshold = 12, children }: { threshold?: number; children: ReactNode }) {
  const pathname = usePathname();
  const box = useRef<HTMLDivElement>(null);
  const [state, setState] = useState({ visible: false, animate: true });
  const visible = useRef(false);

  useEffect(() => {
    document.documentElement.classList.toggle("sticky-nav-shown", state.visible);
    return () => document.documentElement.classList.remove("sticky-nav-shown");
  }, [state.visible]);

  useEffect(() => {
    let lastY = window.scrollY;
    let travelled = 0;
    let frame = 0;
    const show = (next: boolean, animate = true) => {
      visible.current = next;
      setState({ visible: next, animate });
    };
    // Where the copy may start sliding: below the hero on the front page, below the page's own navbar elsewhere.
    const armedBelow = () => (pathname === "/" ? window.innerHeight : (box.current?.offsetHeight ?? 120));

    const update = () => {
      frame = 0;
      const y = window.scrollY;
      const delta = y - lastY;
      lastY = y;

      if (pathname !== "/" && y <= 0) {
        // At the very top the copy and the page's navbar coincide: swap without motion.
        travelled = 0;
        if (visible.current) show(false, false);
        return;
      }
      if (y < armedBelow()) {
        // The page's own navbar is in view: hold whatever state we are in. On the front page there
        // is no navbar in the hero to hand over to, so the copy slides off over the video instead.
        travelled = 0;
        if (pathname === "/" && visible.current) show(false);
        return;
      }
      // Accumulate movement in one direction; reset when the direction flips.
      travelled = Math.sign(delta) === Math.sign(travelled) ? travelled + delta : delta;
      if (travelled <= -threshold && !visible.current) show(true);
      else if (travelled >= threshold && visible.current) show(false);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [pathname, threshold]);

  return (
    <div
      ref={box}
      aria-hidden={!state.visible}
      className={`shop-fixed fixed inset-x-0 top-0 z-40 bg-white ${state.animate ? "transition-transform duration-300 ease-out" : ""} ${
        state.visible ? "translate-y-0" : "pointer-events-none -translate-y-full"
      }`}
    >
      {/* The same width as the page column, so the copy lands exactly on the page's own navbar. */}
      <div className="mx-auto w-full max-w-[1600px]">{children}</div>
    </div>
  );
}
