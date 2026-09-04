"use client";

import { useEffect, useId, useRef, useState } from "react";

const OUTER_RADIUS = 32.5;
const INNER_RADIUS = 19.5;
/** Centre of the ring band: text sits equidistant from the outer edge and the grey centre. */
const TEXT_RADIUS = (OUTER_RADIUS + INNER_RADIUS) / 2;
const CIRCUMFERENCE = 2 * Math.PI * TEXT_RADIUS;
const REPEATS = 3;
const WORD = "Sale";
const DOT = "·";
const FONT_SIZE = 8.2;
const FONT_WEIGHT = 700;
const LETTER_SPACING = 0.5;

type Offsets = { words: number[]; dots: number[] };

/**
 * Spinning "SALE" badge from the Figma product card.
 *
 * The three "SALE" words and three dots are positioned mathematically rather than left to the
 * browser's text-on-a-path stretching (which distributes leftover space unevenly across mixed
 * glyphs and produces uneven gaps). Two hidden probes measure the real rendered width of "SALE"
 * and "·" in the exact font, weight and letter-spacing used, then:
 *
 *   gap = (circumference − 3 × wordWidth − 3 × dotWidth) / 6
 *
 * gives the one gap size that, repeated six times between three words and three dots, exactly
 * fills the ring — so every gap is provably equal, and the layout self-corrects for any future
 * change to font, weight, size or ring radius instead of relying on guessed constants.
 */
export default function SaleBadge({ size = 65, className = "" }: { size?: number; className?: string }) {
  const pathId = useId();
  const wordRef = useRef<SVGTextElement>(null);
  const dotRef = useRef<SVGTextElement>(null);
  const [offsets, setOffsets] = useState<Offsets | null>(null);

  useEffect(() => {
    let cancelled = false;
    const measure = () => {
      if (cancelled || !wordRef.current || !dotRef.current) return;
      const wordWidth = wordRef.current.getComputedTextLength();
      const dotWidth = dotRef.current.getComputedTextLength();
      const gap = Math.max(0, (CIRCUMFERENCE - REPEATS * wordWidth - REPEATS * dotWidth) / (REPEATS * 2));

      const words: number[] = [];
      const dots: number[] = [];
      let t = gap;
      for (let i = 0; i < REPEATS; i++) {
        words.push(t);
        t += wordWidth + gap;
        dots.push(t);
        t += dotWidth + gap;
      }
      setOffsets({ words, dots });
    };
    const fonts: FontFaceSet | undefined = typeof document !== "undefined" ? document.fonts : undefined;
    if (fonts) fonts.ready.then(measure);
    else measure();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 65 65"
      role="img"
      aria-label="On sale"
      className={`motion-safe:animate-[spin_9s_linear_infinite] ${className}`}
    >
      <circle cx={32.5} cy={32.5} r={OUTER_RADIUS} fill="black" />
      <circle cx={32.5} cy={32.5} r={INNER_RADIUS} fill="#F7F7F7" />
      <defs>
        {/* Text path centred in the ring band, starting at the top and running clockwise */}
        <path
          id={pathId}
          d={`M32.5 ${32.5 - TEXT_RADIUS}a${TEXT_RADIUS} ${TEXT_RADIUS} 0 1 1 -0.01 0`}
          fill="none"
        />
      </defs>

      {/* Invisible probes: same font, weight and spacing as the real text, used once to measure it */}
      <text ref={wordRef} fill="none" fontSize={FONT_SIZE} fontWeight={FONT_WEIGHT} letterSpacing={LETTER_SPACING} className="font-gotham uppercase" aria-hidden>
        {WORD}
      </text>
      <text ref={dotRef} fill="none" fontSize={FONT_SIZE} fontWeight={FONT_WEIGHT} letterSpacing={LETTER_SPACING} className="font-gotham" aria-hidden>
        {DOT}
      </text>

      {offsets?.words.map((offset, i) => (
        <text
          key={`word-${i}`}
          fill="white"
          fontSize={FONT_SIZE}
          fontWeight={FONT_WEIGHT}
          letterSpacing={LETTER_SPACING}
          dominantBaseline="middle"
          className="font-gotham uppercase"
        >
          <textPath href={`#${pathId}`} startOffset={offset}>
            {WORD}
          </textPath>
        </text>
      ))}
      {offsets?.dots.map((offset, i) => (
        <text
          key={`dot-${i}`}
          fill="white"
          fontSize={FONT_SIZE}
          fontWeight={FONT_WEIGHT}
          letterSpacing={LETTER_SPACING}
          dominantBaseline="middle"
          className="font-gotham"
        >
          <textPath href={`#${pathId}`} startOffset={offset}>
            {DOT}
          </textPath>
        </text>
      ))}
    </svg>
  );
}
