"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";

const DURATION = 380;
const EASING = "cubic-bezier(0.22, 1, 0.36, 1)";

/**
 * Everything on the page that comes after the box: the rest of its row's list, the button under
 * it, the sections below, the footer. Fixed elements are left out, and the walk stops at the page
 * column, so nothing outside the page is moved.
 */
function following(box: HTMLElement): HTMLElement[] {
  const out: HTMLElement[] = [];
  for (let node: HTMLElement | null = box; node && node !== document.body && !node.classList.contains("shop-content"); node = node.parentElement) {
    for (let sib = node.nextElementSibling; sib; sib = sib.nextElementSibling) {
      if (sib instanceof HTMLElement && getComputedStyle(sib).position !== "fixed") out.push(sib);
    }
  }
  return out;
}

/**
 * Content that unfolds and folds away smoothly. The layout change itself happens at once; what
 * moves is transforms only, which the compositor runs without laying the page out again: the
 * content slides out from under the row's header while everything below the row is carried down
 * by the same distance (and the reverse to close). A height animation re-laid-out and repainted
 * the whole page beneath the row on every frame, which stuttered on phones. Closed, the box is
 * inert, so hidden fields and links can't be reached from the keyboard. Visitors who prefer
 * reduced motion get the change at once.
 */
export default function Collapse({ open, children, className = "" }: { open: boolean; children: ReactNode; className?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const was = useRef(open);

  useLayoutEffect(() => {
    const el = box.current;
    const from = was.current;
    was.current = open;
    if (!el || from === open) return;
    el.style.height = open ? "auto" : "0px";
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const full = el.scrollHeight;
    const inner = el.firstElementChild as HTMLElement | null;
    if (!inner || full === 0) return;
    // While closing the box keeps its full height, so the page below stays put in layout and is
    // carried up by transform; the height drops to zero only once everything has arrived.
    if (!open) el.style.height = `${full}px`;
    const [start, end] = open ? [`translateY(${-full}px)`, "translateY(0)"] : ["translateY(0)", `translateY(${-full}px)`];
    const options = { duration: DURATION, easing: EASING, fill: "forwards" as const };
    const animations = [inner, ...following(el)].map((node) => node.animate([{ transform: start }, { transform: end }], options));
    const finish = () => {
      animations.forEach((a) => a.cancel());
      if (!open) el.style.height = "0px";
    };
    animations[0].onfinish = finish;
    return () => animations.forEach((a) => a.cancel());
  }, [open]);

  return (
    <div ref={box} inert={!open} className={`overflow-hidden ${className}`} style={{ height: open ? "auto" : 0 }}>
      <div className={`transition-opacity duration-[380ms] motion-reduce:transition-none ${open ? "opacity-100" : "opacity-0"}`}>{children}</div>
    </div>
  );
}
