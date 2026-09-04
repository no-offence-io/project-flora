"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Moves the referenced element at `speed` × the scroll distance, relative to its parent's position
 * in the viewport, so the parent scrolls normally while the layer inside lags behind.
 * The shift is clamped to the layer's overflow beyond its parent (or `maxShift`), so no edge shows.
 * Stays still when the visitor prefers reduced motion.
 */
export function useParallax<T extends HTMLElement>(speed = 0.15, maxShift?: number, enabled = true) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    const parent = el?.parentElement;
    if (!el || !parent) return;
    if (!enabled) {
      el.style.transform = "";
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = parent.getBoundingClientRect();
      const delta = rect.top + rect.height / 2 - window.innerHeight / 2;
      const limit = maxShift ?? Math.max(0, (el.offsetHeight - parent.offsetHeight) / 2);
      const shift = Math.max(-limit, Math.min(limit, -delta * speed));
      el.style.transform = `translate3d(0, ${shift.toFixed(2)}px, 0)`;
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [speed, maxShift, enabled]);

  return ref;
}

/**
 * Absolutely positioned layer that drifts with `useParallax`. Size it taller than its parent
 * through `className` (for example `-top-[20%] h-[140%]`) to give it room to move.
 */
export function ParallaxLayer({
  speed = 0.15,
  maxShift,
  enabled = true,
  className = "",
  staticClassName = "inset-0",
  children,
}: {
  speed?: number;
  maxShift?: number;
  /** Set false to render the layer as a plain, non-moving fill. */
  enabled?: boolean;
  /** Oversized position used while moving. */
  className?: string;
  /** Position used when parallax is off (defaults to filling the parent). */
  staticClassName?: string;
  children: ReactNode;
}) {
  const ref = useParallax<HTMLDivElement>(speed, maxShift, enabled);
  return (
    <div ref={ref} className={`absolute left-0 w-full ${enabled ? `will-change-transform ${className}` : staticClassName}`}>
      {children}
    </div>
  );
}
