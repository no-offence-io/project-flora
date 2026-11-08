"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";

const DURATION = 380;
const EASING = "cubic-bezier(0.22, 1, 0.36, 1)";

/**
 * Content that unfolds and folds away smoothly. The box's height is animated from its measured
 * content height (a plain height animation, which every engine has run smoothly for years) while
 * the content fades with it. Closed, it is also inert, so hidden fields and links can't be reached
 * from the keyboard. Visitors who prefer reduced motion get the change at once.
 */
export default function Collapse({ open, children, className = "" }: { open: boolean; children: ReactNode; className?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const was = useRef(open);

  useLayoutEffect(() => {
    const el = box.current;
    const from = was.current;
    was.current = open;
    if (!el || from === open) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // React has already set the final height (auto or 0); the animation overrides it on the way
    // there and is dropped on arrival, leaving that final value in place.
    const full = el.scrollHeight;
    const animation = el.animate([{ height: `${from ? full : 0}px` }, { height: `${open ? full : 0}px` }], { duration: DURATION, easing: EASING, fill: "forwards" });
    animation.onfinish = () => animation.cancel();
    return () => animation.cancel();
  }, [open]);

  return (
    <div ref={box} inert={!open} className={`overflow-hidden ${className}`} style={{ height: open ? "auto" : 0 }}>
      <div className={`transition-opacity duration-[380ms] motion-reduce:transition-none ${open ? "opacity-100" : "opacity-0"}`}>{children}</div>
    </div>
  );
}
