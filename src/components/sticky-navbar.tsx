"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Navbar from "./navbar";

/**
 * Fixed copy of the dark navbar that stays hidden above the viewport and slides down when you
 * scroll up, then slides away again when you scroll down. It only arms itself past the top of
 * the page: past the hero on the front page, past the in-flow navbar everywhere else.
 */
export default function StickyNavbar({ threshold = 12 }: { threshold?: number }) {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let lastY = window.scrollY;
    let travelled = 0;
    let frame = 0;

    const revealAfter = () => (pathname === "/" ? window.innerHeight : 120);

    const update = () => {
      frame = 0;
      const y = window.scrollY;
      const delta = y - lastY;
      lastY = y;

      if (y <= revealAfter()) {
        travelled = 0;
        setVisible(false);
        return;
      }
      // Accumulate movement in one direction; reset when the direction flips.
      travelled = Math.sign(delta) === Math.sign(travelled) ? travelled + delta : delta;
      if (travelled <= -threshold) setVisible(true);
      else if (travelled >= threshold) setVisible(false);
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
      aria-hidden={!visible}
      className={`fixed inset-x-0 top-0 z-40 bg-white transition-transform duration-300 ease-out ${
        visible ? "translate-y-0" : "pointer-events-none -translate-y-full"
      }`}
    >
      <div className="mx-auto w-full max-w-[1500px]">
        <Navbar tone="dark" />
      </div>
    </div>
  );
}
