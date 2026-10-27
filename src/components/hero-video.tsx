"use client";

import { useEffect, useState } from "react";
import { preload } from "react-dom";
import { useParallax } from "./parallax";

/**
 * Looping, muted background video filling the hero. With `parallax` on it is oversized by 30% and
 * drifts as you scroll; off, it simply fills the hero. The shared hook keeps it still for
 * reduced-motion visitors.
 *
 * There is deliberately no poster layer and no `poster` attribute. Both a native poster and a
 * hand-rolled cross-fading one put a still image in front of the video that has to be swapped out
 * later — an abrupt cut in the native case, and on a client-side navigation back to this page a
 * pointless re-fade of an already-cached video in the hand-rolled one. The video is simply always
 * what's shown, and the loading screen covers the initial page load while it buffers.
 */
export default function HeroVideo({
  src,
  speed = 0.15,
  parallax = true,
  className = "",
}: {
  src: string;
  speed?: number;
  parallax?: boolean;
  className?: string;
}) {
  const ref = useParallax<HTMLVideoElement>(speed, undefined, parallax);
  // Ask for the file as early as the page starts, and reveal the video with a fade once it has a
  // frame to show, rather than letting it pop in over the dark backdrop.
  preload(src, { as: "video", fetchPriority: "high" });
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const video = ref.current;
    if (video && video.readyState >= 2) setReady(true);
  }, [ref, src]);

  return (
    <video
      ref={ref}
      src={src}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      onLoadedData={() => setReady(true)}
      aria-hidden
      className={`absolute left-0 w-full object-cover transition-opacity duration-[900ms] ease-out ${ready ? "opacity-100" : "opacity-0"} ${
        parallax ? "-top-[15%] h-[130%] will-change-transform" : "inset-0 h-full"
      } ${className}`}
    />
  );
}
