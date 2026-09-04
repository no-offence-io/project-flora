"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Horizontal snap scroller state: whether it can move each way, and a step function. */
export function useScroller(gap = 10) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState({ canPrev: false, canNext: true, index: 0 });

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const card = el.firstElementChild as HTMLElement | null;
    const step = card ? card.offsetWidth + gap : el.clientWidth;
    setState({
      canPrev: el.scrollLeft > 1,
      canNext: el.scrollLeft + el.clientWidth < el.scrollWidth - 1,
      index: step > 0 ? Math.round(el.scrollLeft / step) : 0,
    });
  }, [gap]);

  useEffect(() => {
    update();
    const el = ref.current;
    if (!el) return;
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [update]);

  const scrollByItem = useCallback(
    (direction: 1 | -1) => {
      const el = ref.current;
      const card = el?.firstElementChild as HTMLElement | null;
      if (!el || !card) return;
      el.scrollBy({ left: direction * (card.offsetWidth + gap), behavior: "smooth" });
    },
    [gap],
  );

  return { ref, ...state, scrollByItem };
}

/** Previous / Next text controls used above every slideshow. */
export function PrevNextControls({
  canPrev,
  canNext,
  onPrev,
  onNext,
  className = "",
}: {
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-[10px] font-gotham text-paragraph ${className}`}>
      <button type="button" onClick={onPrev} aria-disabled={!canPrev} className={`transition-colors ${canPrev ? "text-black" : "text-black/50"}`}>
        Previous
      </button>
      <button type="button" onClick={onNext} aria-disabled={!canNext} className={`transition-colors ${canNext ? "text-black" : "text-black/50"}`}>
        Next
      </button>
    </div>
  );
}
