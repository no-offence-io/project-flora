"use client";

import { useEffect, useRef, useState } from "react";

/** Reading speed, in pixels per second. */
const SPEED = 28;
/** Seconds for a hold at either end, so the start and the end can both be read. The slide takes 30% of the loop each way. */
const HOLD = 1.6;

/**
 * Text that doesn't fit fades at the edge, then slides to its end and back so all of it can be read,
 * as a long song title does in Spotify. Text that fits is left alone.
 */
export default function TextScroll({ text, className = "" }: { text: string; className?: string }) {
  const box = useRef<HTMLSpanElement>(null);
  const inner = useRef<HTMLSpanElement>(null);
  const [overflow, setOverflow] = useState(0);

  useEffect(() => {
    const measure = () => {
      if (box.current && inner.current) setOverflow(Math.max(0, Math.ceil(inner.current.scrollWidth - box.current.clientWidth)));
    };
    measure();
    const seen = new ResizeObserver(measure);
    if (box.current) seen.observe(box.current);
    if (inner.current) seen.observe(inner.current); // fonts arriving change the width
    return () => seen.disconnect();
  }, [text]);

  const travel = overflow / SPEED;
  const style = overflow
    ? ({ "--scroll-by": `${-overflow}px`, "--scroll-time": `${Math.max(7, (travel + HOLD) / 0.3)}s` } as React.CSSProperties)
    : undefined;

  return (
    <span ref={box} className={`text-scroll ${overflow ? "is-long" : ""} ${className}`} style={style}>
      <span ref={inner}>{text}</span>
    </span>
  );
}
