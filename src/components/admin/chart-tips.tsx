"use client";

import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import type { Tip } from "./charts";

type Shown = Tip & { x: number; y: number; width: number };

/**
 * The plot area of a graph, with a note that follows the pointer. The graph itself stays plain
 * server-rendered markup: each mark carries what to say in a `data-tip` attribute (see `tipOf` in
 * charts.tsx), and this reads it from whichever mark is under the pointer.
 *
 * The note is positioned inside the plot, not on the screen: night mode puts a filter on the admin's
 * wrapper, and a filter pins "fixed" boxes to that wrapper instead of the window. It flips to the
 * left of the pointer in the right half and below it near the top, so it never leaves the graph's
 * card. On a touch screen a tap shows it and it fades by itself.
 */
export default function ChartTips({ className = "", children }: { className?: string; children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [tip, setTip] = useState<Shown | null>(null);

  const clear = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => clear, []);

  const show = (event: PointerEvent<HTMLDivElement>) => {
    const el = box.current;
    const mark = (event.target as Element | null)?.closest?.("[data-tip]");
    clear();
    if (!el || !mark || !el.contains(mark)) return setTip(null);
    let data: Tip;
    try {
      data = JSON.parse(mark.getAttribute("data-tip") ?? "") as Tip;
    } catch {
      return setTip(null);
    }
    const rect = el.getBoundingClientRect();
    setTip({ ...data, x: event.clientX - rect.left, y: event.clientY - rect.top, width: rect.width });
    if (event.pointerType !== "mouse") timer.current = setTimeout(() => setTip(null), 2500);
  };

  const left = tip ? tip.x > tip.width / 2 : false;
  const below = tip ? tip.y < 72 : false;

  return (
    <div
      ref={box}
      className={className}
      onPointerMove={show}
      onPointerDown={show}
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse") {
          clear();
          setTip(null);
        }
      }}
    >
      {children}
      {tip && (
        <div
          aria-hidden
          className="pointer-events-none absolute z-20 flex min-w-[120px] flex-col gap-[7px] whitespace-nowrap border-[0.5px] border-black bg-white px-[10px] py-[9px] font-gotham text-[11px] leading-none text-black shadow-[0_4px_16px_rgba(0,0,0,0.08)]"
          style={{ left: tip.x, top: tip.y, transform: `translate(${left ? "calc(-100% - 14px)" : "14px"}, ${below ? "16px" : "calc(-100% - 12px)"})` }}
        >
          <span className="text-black/50">{tip.title}</span>
          {tip.rows.map((row, i) => (
            <span key={i} className="flex items-center gap-[6px]">
              {row.name !== undefined && <span className={`inline-block h-[8px] w-[8px] shrink-0 ${row.tone === "ink" ? "bg-black" : "bg-black/20"}`} />}
              {row.name !== undefined && <span className="text-black/50">{row.name}</span>}
              <span className={`tabular-nums ${row.name !== undefined ? "ml-auto pl-[14px]" : ""}`}>{row.value}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
