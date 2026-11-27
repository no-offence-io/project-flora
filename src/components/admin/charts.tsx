import type { ReactNode } from "react";
import ChartTips from "./chart-tips";

/*
 * The dashboard's graphs. Plain server-rendered HTML and SVG, no chart library: bars are boxes sized
 * in percent, so they are sharp at any width and follow night mode's inversion like everything else.
 * Each mark carries its exact figures, shown in a note that follows the pointer (hover on a computer,
 * tap on a phone; chart-tips.tsx is the only client code here), and every graph on a page sits next
 * to a table of the same numbers.
 *
 * Two inks only: black for the period being looked at, a light grey for what it is compared with.
 */

export type Unit = "money" | "count";
export type Series = { name: string; values: number[]; tone: "ink" | "ghost"; /** A shorter name for the note under the pointer, when `name` is a whole phrase. */ short?: string };

/** What the note under the pointer says for one mark: a heading and a line per series. */
export type Tip = { title: string; rows: { name?: string; value: string; tone: "ink" | "ghost" }[] };
const tipOf = (tip: Tip) => ({ "data-tip": JSON.stringify(tip) });

const whole = new Intl.NumberFormat("nb-NO", { maximumFractionDigits: 0 });
const compact = new Intl.NumberFormat("nb-NO", { notation: "compact", maximumFractionDigits: 1 });

/** Values are øre for money, plain numbers otherwise. */
export function formatValue(v: number, unit: Unit): string {
  return unit === "money" ? `${whole.format(Math.round(v / 100))} kr` : whole.format(v);
}
const axisValue = (v: number, unit: Unit) => (unit === "money" ? (Math.abs(v) >= 1_000_000 ? `${compact.format(v / 100)} kr` : `${whole.format(v / 100)} kr`) : whole.format(v));

/** The top of the axis: the next 1, 2, 2.5 or 5 times a power of ten above the largest value, so the gridlines land on round numbers. */
export function niceMax(max: number, unit: Unit): number {
  const floor = unit === "money" ? 10000 : 4;
  if (!(max > 0)) return floor;
  const scaled = unit === "money" ? max / 100 : max;
  const power = Math.pow(10, Math.floor(Math.log10(scaled)));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * power >= scaled) ?? 10;
  return Math.max(floor, step * power * (unit === "money" ? 100 : 1));
}

const TONE = { ink: "bg-black", ghost: "bg-black/20" } as const;

export function Legend({ series }: { series: { name: string; tone: "ink" | "ghost" }[] }) {
  return (
    <ul className="m-0 flex list-none flex-wrap gap-x-[18px] gap-y-[4px] p-0 font-gotham text-[11px] leading-normal text-black/50">
      {series.map((s) => (
        <li key={s.name} className="flex items-center gap-[6px]">
          <span aria-hidden className={`inline-block h-[8px] w-[8px] ${TONE[s.tone]}`} />
          {s.name}
        </li>
      ))}
    </ul>
  );
}

function Axis({ top, unit, children, height }: { top: number; unit: Unit; children: ReactNode; height: number }) {
  const ticks = [1, 0.75, 0.5, 0.25, 0];
  return (
    <div className="flex gap-[8px] font-gotham text-[11px] leading-none text-black/50">
      <div aria-hidden className="relative w-[58px] shrink-0 md:w-[72px]" style={{ height }}>
        {ticks.map((t) => (
          <span key={t} className="absolute right-0 -translate-y-1/2 whitespace-nowrap" style={{ top: `${(1 - t) * 100}%` }}>
            {axisValue(top * t, unit)}
          </span>
        ))}
      </div>
      <div className="relative min-w-0 flex-1" style={{ height }}>
        {ticks.map((t) => (
          <span key={t} aria-hidden className={`absolute inset-x-0 h-px ${t === 0 ? "bg-black/40" : "bg-black/10"}`} style={{ top: `${(1 - t) * 100}%` }} />
        ))}
        {children}
      </div>
    </div>
  );
}

/** Which labels to print under the bars so they never collide: all of them when few, every nth when many, always the first and the last. */
function shownLabels(count: number, room: number): Set<number> {
  const every = Math.max(1, Math.ceil(count / room));
  const shown = new Set<number>();
  for (let i = 0; i < count; i += every) shown.add(i);
  if (count > 1 && (count - 1) % every !== 0) {
    shown.delete(Math.floor((count - 1) / every) * every);
    shown.add(count - 1);
  }
  return shown;
}

/**
 * Bars, one group per label. With two series each group is a pair: the comparison first in grey,
 * the current one in black beside it.
 */
export function Bars({ labels, series, unit, height = 220, label, labelRoom = 12, details, emptyText = "No sales in this period." }: { labels: string[]; series: Series[]; unit: Unit; height?: number; label: string; labelRoom?: number; details?: string[]; emptyText?: string }) {
  const top = niceMax(Math.max(0, ...series.flatMap((s) => s.values)), unit);
  // Half as many labels fit under the bars on a phone; both rows are rendered and the stylesheet picks one.
  const shownWide = shownLabels(labels.length, labelRoom);
  const shownNarrow = shownLabels(labels.length, Math.max(2, Math.floor(labelRoom / 2)));
  const dense = labels.length > 45;
  const empty = series.every((s) => s.values.every((v) => !v));
  return (
    <figure className="m-0 flex flex-col gap-[10px]" role="group" aria-label={label}>
      {series.length > 1 && <Legend series={series} />}
      <Axis top={top} unit={unit} height={height}>
        <ChartTips className={`absolute inset-0 flex items-end ${dense ? "gap-px" : "gap-[2px] md:gap-[6px]"}`}>
          {labels.map((l, i) => (
            <div
              key={`${l}-${i}`}
              className="flex h-full min-w-0 flex-1 items-end justify-center gap-px transition-colors hover:bg-black/[0.05]"
              {...tipOf({ title: details?.[i] ?? l, rows: series.map((s) => ({ ...(series.length > 1 ? { name: s.short ?? s.name } : {}), value: formatValue(s.values[i] ?? 0, unit), tone: s.tone })) })}
            >
              {series.map((s) => {
                const v = s.values[i] ?? 0;
                return <span key={s.name} className={`block min-w-0 flex-1 ${TONE[s.tone]} ${series.length > 1 ? "max-w-[28px]" : "max-w-[56px]"}`} style={{ height: v > 0 ? `max(2px, ${(v / top) * 100}%)` : 0 }} />;
              })}
            </div>
          ))}
        </ChartTips>
        {empty && <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[11px] text-black/50">{emptyText}</span>}
      </Axis>
      {[
        { shown: shownNarrow, only: "flex md:hidden" },
        { shown: shownWide, only: "hidden md:flex" },
      ].map(({ shown, only }) => (
        <div key={only} aria-hidden className={`${only} gap-[8px] font-gotham text-[11px] leading-none text-black/50`}>
          <span className="w-[58px] shrink-0 md:w-[72px]" />
          <div className={`flex min-w-0 flex-1 ${dense ? "gap-px" : "gap-[2px] md:gap-[6px]"}`}>
            {labels.map((l, i) => (
              <span key={`${l}-${i}`} className="relative h-[12px] min-w-0 flex-1">
                {shown.has(i) && <span className={`absolute top-0 whitespace-nowrap ${i === 0 ? "left-0" : i === labels.length - 1 ? "right-0" : "left-1/2 -translate-x-1/2"}`}>{l}</span>}
              </span>
            ))}
          </div>
        </div>
      ))}
    </figure>
  );
}

/**
 * Lines that climb through a period: running totals, one per series, over the same number of steps.
 * A series may stop early (this month so far); the other carries on to the end.
 */
export function Lines({ steps, series, unit, height = 220, label, startLabel, endLabel, stepLabels }: { steps: number; series: Series[]; unit: Unit; height?: number; label: string; startLabel: string; endLabel: string; /** What each step is called in the note under the pointer; "Day 1", "Day 2" … when left out. */ stepLabels?: string[] }) {
  const top = niceMax(Math.max(0, ...series.flatMap((s) => s.values)), unit);
  const x = (i: number) => (steps <= 1 ? 50 : (i / (steps - 1)) * 100);
  const y = (v: number) => 100 - (v / top) * 100;
  // One invisible column per step for the pointer, centred on its point: half a step wider than the plot on each side.
  const half = steps > 1 ? 50 / (steps - 1) : 0;
  return (
    <figure className="m-0 flex flex-col gap-[10px]" role="group" aria-label={label}>
      <Legend series={series} />
      <Axis top={top} unit={unit} height={height}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden>
          {series.map((s) => (
            <polyline key={s.name} points={s.values.map((v, i) => `${x(i).toFixed(2)},${y(v).toFixed(2)}`).join(" ")} fill="none" stroke="currentColor" strokeOpacity={s.tone === "ink" ? 1 : 0.25} strokeWidth={s.tone === "ink" ? 2 : 1.5} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
          ))}
        </svg>
        {series.map((s) => {
          const last = s.values.length - 1;
          if (last < 0) return null;
          return (
            <span key={s.name} className={`absolute h-[7px] w-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full ${s.tone === "ink" ? "bg-black" : "bg-[#c7c7c7]"}`} style={{ left: `${x(last)}%`, top: `${y(s.values[last])}%` }} />
          );
        })}
        <div className="absolute inset-y-0" style={{ left: `-${half}%`, right: `-${half}%` }}>
          <ChartTips className="absolute inset-0 flex">
            {Array.from({ length: steps }, (_, i) => {
              const rows = series.filter((s) => i < s.values.length).map((s) => ({ name: s.short ?? s.name, value: formatValue(s.values[i], unit), tone: s.tone }));
              return (
                <div key={i} className="group relative h-full min-w-0 flex-1" {...(rows.length ? tipOf({ title: stepLabels?.[i] ?? `Day ${i + 1}`, rows }) : {})}>
                  <span aria-hidden className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-black/25 opacity-0 group-hover:opacity-100" />
                </div>
              );
            })}
          </ChartTips>
        </div>
      </Axis>
      <div aria-hidden className="flex gap-[8px] font-gotham text-[11px] leading-none text-black/50">
        <span className="w-[58px] shrink-0 md:w-[72px]" />
        <div className="flex min-w-0 flex-1 justify-between">
          <span>{startLabel}</span>
          <span>{endLabel}</span>
        </div>
      </div>
    </figure>
  );
}

/** "+12 %" in words a glance can read: up, down, or nothing to compare with. */
export function Delta({ pct, against }: { pct: number | null; against: string }) {
  if (pct === null) return <span className="text-[11px] leading-normal text-black/50">– vs. {against} (nothing then)</span>;
  return (
    <span className="text-[11px] leading-normal text-black/50">
      <span className="text-black">
        {pct > 0 ? "▲" : pct < 0 ? "▼" : "•"} {pct > 0 ? "+" : ""}
        {pct} %
      </span>{" "}
      vs. {against}
    </span>
  );
}
