"use client";

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import gsap from "gsap";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";

/**
 * The Flöra bud mark, split into the pieces the animation needs to move independently. The ring's
 * two subpaths must stay in one element — together they cut the hole through the middle via the
 * fill rule; separated they would each fill solid.
 */
const ICON_RING =
  "M17.5845 36.8429C26.5178 36.8429 30.1381 30.6407 30.1381 22.5871C30.1381 13.8855 26.5178 7.68331 17.5845 7.68331C8.65119 7.68331 5.03085 13.8855 5.03085 22.5871C5.03085 30.6407 8.65119 36.8429 17.5845 36.8429ZM17.5845 38C8.74522 38 0 32.1681 0 22.1705C0 12.3581 8.74522 6.52619 17.5845 6.52619C26.4237 6.52619 35.1689 12.3581 35.1689 22.1705C35.1689 32.1681 26.4237 38 17.5845 38Z";
const ICON_DOT_LEFT =
  "M10.6729 2.26797C10.6729 1.06456 11.6603 0 12.9768 0C14.2933 0 15.2336 1.06456 15.2336 2.26797C15.2336 3.47138 14.2933 4.48965 12.9768 4.48965C11.6603 4.48965 10.6729 3.47138 10.6729 2.26797Z";
const ICON_DOT_RIGHT =
  "M20.0294 2.26797C20.0294 1.06456 21.0167 0 22.3332 0C23.6497 0 24.5901 1.06456 24.5901 2.26797C24.5901 3.47138 23.6497 4.48965 22.3332 4.48965C21.0167 4.48965 20.0294 3.47138 20.0294 2.26797Z";

/** Centre of the right dot, so the blink squashes it around itself rather than the icon's origin. */
const BLINK_CX = 22.3098;
const BLINK_CY = 2.2448;

/** Shared by every outline copy. `pathLength` normalises each path to 0–100 so the dash values are
 * the same regardless of the piece's real length, and `non-scaling-stroke` keeps the hairline at a
 * true 1px however the icon is scaled. */
const OUTLINE_PROPS = {
  fill: "none",
  stroke: "black",
  strokeWidth: 1,
  vectorEffect: "non-scaling-stroke",
  pathLength: 100,
  strokeDasharray: 100,
  strokeDashoffset: 100,
} as const;

/**
 * One tileable sine wave (wavelength 18, amplitude 1.6, 4 periods) with a solid body dropping away
 * below it, in the icon's own 0–36 × 0–38 coordinate space. Translating this shape by exactly one
 * wavelength (18) on x loops seamlessly; translating it on y is what rises the "liquid" fill level.
 * Generated once (see PR description) rather than computed at runtime.
 */
const WAVE_PATH =
  "M-18 0 L-17.25 0.414 L-16.5 0.8 L-15.75 1.131 L-15 1.386 L-14.25 1.545 L-13.5 1.6 L-12.75 1.545 L-12 1.386 L-11.25 1.131 L-10.5 0.8 L-9.75 0.414 L-9 0 L-8.25 -0.414 L-7.5 -0.8 L-6.75 -1.131 L-6 -1.386 L-5.25 -1.545 L-4.5 -1.6 L-3.75 -1.545 L-3 -1.386 L-2.25 -1.131 L-1.5 -0.8 L-0.75 -0.414 L0 0 L0.75 0.414 L1.5 0.8 L2.25 1.131 L3 1.386 L3.75 1.545 L4.5 1.6 L5.25 1.545 L6 1.386 L6.75 1.131 L7.5 0.8 L8.25 0.414 L9 0 L9.75 -0.414 L10.5 -0.8 L11.25 -1.131 L12 -1.386 L12.75 -1.545 L13.5 -1.6 L14.25 -1.545 L15 -1.386 L15.75 -1.131 L16.5 -0.8 L17.25 -0.414 L18 0 L18.75 0.414 L19.5 0.8 L20.25 1.131 L21 1.386 L21.75 1.545 L22.5 1.6 L23.25 1.545 L24 1.386 L24.75 1.131 L25.5 0.8 L26.25 0.414 L27 0 L27.75 -0.414 L28.5 -0.8 L29.25 -1.131 L30 -1.386 L30.75 -1.545 L31.5 -1.6 L32.25 -1.545 L33 -1.386 L33.75 -1.131 L34.5 -0.8 L35.25 -0.414 L36 0 L36.75 0.414 L37.5 0.8 L38.25 1.131 L39 1.386 L39.75 1.545 L40.5 1.6 L41.25 1.545 L42 1.386 L42.75 1.131 L43.5 0.8 L44.25 0.414 L45 0 L45.75 -0.414 L46.5 -0.8 L47.25 -1.131 L48 -1.386 L48.75 -1.545 L49.5 -1.6 L50.25 -1.545 L51 -1.386 L51.75 -1.131 L52.5 -0.8 L53.25 -0.414 L54 0 L54 100 L-18 100 Z";

/** Fully below the icon (y=38) before filling; fully above it (y=0) once filled, with clearance either side for the wave's own amplitude. */
const WAVE_Y_START = 44;
const WAVE_Y_END = -6;
const WAVE_WAVELENGTH = 18;

/**
 * Full-screen intro: the Flöra mark draws itself in outline (GSAP DrawSVGPlugin), then a black
 * liquid fill rises from the bottom to the top behind that outline with a continuously sloshing
 * wavy edge, before the whole screen fades away to reveal the site. Shown once per full page load,
 * not on client-side navigations between pages. Skipped outright for reduced-motion visitors.
 */
function subscribeReducedMotion(onChange: () => void) {
  const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}
function getReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
/** The server has no notion of the visitor's OS preference; assume motion is fine there — matched
 * on the client's first paint too (React's documented hydration-safe behaviour for this hook), then
 * corrected a frame later if it's actually preferred, at worst a one-frame flash of the overlay. */
function getReducedMotionServerSnapshot() {
  return false;
}

/** `useLayoutEffect` on the client (runs before paint, avoiding a flash of the un-hidden wave),
 * `useEffect` on the server (where layout effects are a no-op anyway and would otherwise warn). */
const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

export default function LoadingScreen() {
  const prefersReducedMotion = useSyncExternalStore(subscribeReducedMotion, getReducedMotion, getReducedMotionServerSnapshot);
  const [visible, setVisible] = useState(true);
  const overlayRef = useRef<HTMLDivElement>(null);
  const ringOutlineRef = useRef<SVGPathElement>(null);
  const leftOutlineRef = useRef<SVGPathElement>(null);
  const rightOutlineRef = useRef<SVGPathElement>(null);
  const waveRef = useRef<SVGPathElement>(null);
  const blinkRef = useRef<SVGGElement>(null);

  useIsomorphicLayoutEffect(() => {
    if (prefersReducedMotion) return;

    gsap.registerPlugin(DrawSVGPlugin);

    // The wave path sits directly inside the <clipPath> (a <g> there is silently ignored by the
    // SVG content model, which empties the clip and hides everything it's applied to), so both
    // axes ride on that one path's transform. GSAP animates a plain object rather than the element
    // itself, since clip-path contents have no rendered box for it to read a matrix from.
    const wave = { x: 0, y: WAVE_Y_START };
    const applyWaveTransform = () => {
      waveRef.current?.setAttribute("transform", `translate(${wave.x}, ${wave.y})`);
    };
    applyWaveTransform();

    const sloshTween = gsap.to(wave, {
      x: -WAVE_WAVELENGTH,
      duration: 1.1,
      ease: "none",
      repeat: -1,
      onUpdate: applyWaveTransform,
    });

    // The blink squashes the right dot vertically around its own centre — written by hand for the
    // same reason as the wave, and because scaling around a point in an SVG means translating to
    // that point and back around the scale.
    const blink = { s: 1 };
    const applyBlink = () => {
      blinkRef.current?.setAttribute(
        "transform",
        `translate(${BLINK_CX}, ${BLINK_CY}) scale(1, ${blink.s}) translate(${-BLINK_CX}, ${-BLINK_CY})`,
      );
    };

    // Hard ceiling. The whole intro runs about 3.2s; if it hasn't finished well past that, something
    // has killed the timeline mid-way (seen once in dev: the eye frozen shut, site unreachable
    // behind it). An intro must never be able to trap the store, so hide it regardless and say so.
    const failSafe = window.setTimeout(() => {
      console.warn("[loading-screen] intro did not complete within 6s; hiding it");
      sloshTween.kill();
      setVisible(false);
    }, 6000);

    const tl = gsap.timeline({
      onComplete: () => {
        window.clearTimeout(failSafe);
        sloshTween.kill();
        setVisible(false);
      },
    });
    tl.fromTo(ringOutlineRef.current, { drawSVG: "0%" }, { drawSVG: "100%", duration: 0.7, ease: "power1.inOut" })
      .fromTo(
        [leftOutlineRef.current, rightOutlineRef.current],
        { drawSVG: "0%" },
        { drawSVG: "100%", duration: 0.25, ease: "power1.out" },
        ">-0.1",
      )
      .to(wave, { y: WAVE_Y_END, duration: 1.1, ease: "power2.inOut", onUpdate: applyWaveTransform }, ">")
      .to(blink, { s: 0.08, duration: 0.09, ease: "power2.in", onUpdate: applyBlink }, "+=0.3")
      .to(blink, { s: 1, duration: 0.14, ease: "power2.out", onUpdate: applyBlink })
      .to(overlayRef.current, { opacity: 0, duration: 0.5, ease: "power1.out" }, "+=0.25");

    return () => {
      window.clearTimeout(failSafe);
      tl.kill();
      sloshTween.kill();
    };
  }, [prefersReducedMotion]);

  if (!visible || prefersReducedMotion) return null;

  const clipId = "loading-screen-wave-clip";

  return (
    <div ref={overlayRef} className="fixed inset-0 z-[100] flex items-center justify-center bg-white">
      <svg width={96} height={101} viewBox="0 0 36 38" style={{ overflow: "visible" }} aria-label="Flöra">
        <defs>
          <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
            <path ref={waveRef} d={WAVE_PATH} />
          </clipPath>
        </defs>

        {/* Each piece is a filled copy revealed by the rising wave, under an outline copy that
            draws itself in. The right dot is grouped so the blink can squash both of its copies
            together — squashing only the fill would leave its outline behind as a ghost ring. */}
        <path d={ICON_RING} fill="black" clipPath={`url(#${clipId})`} />
        <path ref={ringOutlineRef} d={ICON_RING} {...OUTLINE_PROPS} />

        <path d={ICON_DOT_LEFT} fill="black" clipPath={`url(#${clipId})`} />
        <path ref={leftOutlineRef} d={ICON_DOT_LEFT} {...OUTLINE_PROPS} />

        <g ref={blinkRef}>
          <path d={ICON_DOT_RIGHT} fill="black" clipPath={`url(#${clipId})`} />
          <path ref={rightOutlineRef} d={ICON_DOT_RIGHT} {...OUTLINE_PROPS} />
        </g>
      </svg>
    </div>
  );
}
