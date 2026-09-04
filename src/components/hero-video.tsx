"use client";

import { useParallax } from "./parallax";

/**
 * Looping, muted background video. With `parallax` on it is oversized by 30% and drifts as you scroll;
 * off, it simply fills the hero. The shared hook keeps it still for reduced-motion visitors.
 */
export default function HeroVideo({
  src,
  poster,
  speed = 0.15,
  parallax = true,
  className = "",
}: {
  src: string;
  poster?: string;
  speed?: number;
  parallax?: boolean;
  className?: string;
}) {
  const ref = useParallax<HTMLVideoElement>(speed, undefined, parallax);

  return (
    <video
      ref={ref}
      src={src}
      poster={poster}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      aria-hidden
      className={`absolute left-0 w-full object-cover ${parallax ? "-top-[15%] h-[130%] will-change-transform" : "inset-0 h-full"} ${className}`}
    />
  );
}
