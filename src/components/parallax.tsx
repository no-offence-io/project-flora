"use client";

import { useEffect, useRef, type ReactNode } from "react";

/*
 * Parallax layers move at `speed` × the scroll distance, relative to where their parent sits in the
 * viewport: the parent scrolls normally and the layer inside lags behind. The shift is clamped to
 * the layer's overflow beyond its parent (or `maxShift`), so no edge shows, and the layer stays
 * still for visitors who prefer reduced motion.
 *
 * Where the browser has scroll-driven animations (Chrome 115+, Safari 26+) the shift is a Web
 * Animation on a view timeline of the parent, so the compositor moves the layer in the very frame
 * it scrolls the page. The old way, a scroll listener setting a transform, runs on the main thread
 * after the compositor has already moved the page; on phones, where scrolling never waits for
 * script, that showed as the hero video juddering and trailing the finger. The listener remains
 * as the fallback for browsers without the timeline API.
 */

type ViewTimelineCtor = new (options: { subject: Element; axis?: "block" | "inline" }) => AnimationTimeline;
const viewTimelineCtor = (): ViewTimelineCtor | undefined => (window as unknown as { ViewTimeline?: ViewTimelineCtor }).ViewTimeline;

/** How far the layer may move before an edge would show. */
const limitFor = (el: HTMLElement, parent: HTMLElement, maxShift?: number) => maxShift ?? Math.max(0, (el.offsetHeight - parent.offsetHeight) / 2);

/**
 * True when the page itself scrolls the element. A view timeline measures against the nearest
 * scroll container, and `overflow: hidden` makes one, so a host section clipping its oversized
 * layer that way would leave the timeline inert; the hosts clip with `overflow: clip` instead,
 * and anything else gets the listener.
 */
function scrolledByPage(el: HTMLElement): boolean {
  for (let node = el.parentElement; node && node !== document.body && node !== document.documentElement; node = node.parentElement) {
    const { overflowX, overflowY } = getComputedStyle(node);
    if (/auto|scroll|hidden|overlay/.test(overflowX + overflowY)) return false;
  }
  return true;
}

const shiftBy = (px: number) => ({ transform: `translate3d(0, ${px.toFixed(2)}px, 0)` });

/**
 * The shift across the parent's whole trip through the viewport (the view timeline's `cover`
 * range): from its top entering at the bottom edge, through the centre where the shift is zero,
 * to its bottom leaving at the top edge. Where the unclamped shift would pass the limit, the
 * layer holds still at the limit for the rest of the trip, as the scroll listener's clamp did.
 */
function keyframesFor(speed: number, limit: number, viewport: number, parentHeight: number): Keyframe[] {
  const full = (speed * (viewport + parentHeight)) / 2;
  if (full <= 0) return [shiftBy(0), shiftBy(0)];
  if (full <= limit) return [shiftBy(-full), shiftBy(full)];
  const reach = limit / full / 2;
  return [
    { ...shiftBy(-limit), offset: 0 },
    { ...shiftBy(-limit), offset: 0.5 - reach },
    { ...shiftBy(limit), offset: 0.5 + reach },
    { ...shiftBy(limit), offset: 1 },
  ];
}

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

    const ViewTimeline = viewTimelineCtor();
    if (ViewTimeline && scrolledByPage(parent)) {
      // Compositor-driven: rebuilt only when a size it depends on changes (the phone's toolbar
      // collapsing, a rotation, the layer's media arriving).
      el.style.transform = "";
      let animation: Animation | null = null;
      let built = "";
      const build = () => {
        const viewport = document.documentElement.clientHeight;
        const limit = limitFor(el, parent, maxShift);
        const key = `${viewport}/${parent.offsetHeight}/${limit}`;
        if (key === built) return;
        built = key;
        animation?.cancel();
        animation = el.animate(keyframesFor(speed, limit, viewport, parent.offsetHeight), { timeline: new ViewTimeline({ subject: parent, axis: "block" }), fill: "both" });
      };
      try {
        build();
        const observer = new ResizeObserver(build);
        observer.observe(parent);
        observer.observe(el);
        window.addEventListener("resize", build);
        return () => {
          observer.disconnect();
          window.removeEventListener("resize", build);
          animation?.cancel();
        };
      } catch {
        // The constructor exists but the animation was refused: carry on with the listener below.
        (animation as Animation | null)?.cancel();
      }
    }

    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = parent.getBoundingClientRect();
      const delta = rect.top + rect.height / 2 - window.innerHeight / 2;
      const limit = limitFor(el, parent, maxShift);
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
