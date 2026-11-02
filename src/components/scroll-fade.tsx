"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** How far down the page, in pixels, the content has faded out completely. */
const FADE_OVER = 160;

/** Fades its content out over the first stretch of scrolling, and back in on the way up. */
export default function ScrollFade({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frame = 0;
    const apply = () => {
      frame = 0;
      if (ref.current) ref.current.style.opacity = String(Math.max(0, 1 - window.scrollY / FADE_OVER));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(apply);
    };
    apply(); // a reload can land partway down the page
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
