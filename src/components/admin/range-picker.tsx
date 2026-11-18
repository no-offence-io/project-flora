import Link from "next/link";
import { PRESETS, type Range } from "@/lib/admin/reports";

/*
 * "Which period?" for the pages that report on one: the usual periods as one-tap links, and two
 * date fields for any day or stretch of days. A plain GET form, so a period is an address that can
 * be bookmarked, shared or reloaded, and it works before any script has loaded.
 */
export default function RangePicker({ path, range, today, keep = {} }: { path: string; range: Range; today: string; keep?: Record<string, string | undefined> }) {
  const kept = Object.entries(keep).filter((e): e is [string, string] => Boolean(e[1]));
  const href = (preset: string) => `${path}?${new URLSearchParams([...kept, ["range", preset]]).toString()}`;
  const field = "h-[40px] min-w-0 flex-1 border border-black/20 bg-transparent px-[10px] font-gotham text-paragraph text-black outline-none focus:border-black md:w-[160px] md:flex-none";
  return (
    <div className="flex flex-col gap-[14px] border-[0.5px] border-black/25 p-[12px] font-gotham text-paragraph text-black md:p-[18px]">
      <div className="flex flex-wrap items-baseline justify-between gap-x-[18px] gap-y-[4px]">
        <span className="text-[11px] leading-normal tracking-[0.2em] uppercase text-black/50">Period</span>
        <span>{range.label}</span>
      </div>
      <nav aria-label="Period" className="flex flex-wrap gap-[6px]">
        {PRESETS.map((p) => (
          <Link key={p.key} href={href(p.key)} aria-current={range.preset === p.key ? "true" : undefined} className={`border px-[10px] py-[6px] text-[11px] leading-normal transition-colors ${range.preset === p.key ? "border-black bg-black text-white" : "border-black/20 text-black hover:border-black"}`}>
            {p.label}
          </Link>
        ))}
      </nav>
      <form action={path} method="get" className="flex flex-wrap items-end gap-[10px]">
        {kept.map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
        <label className="flex min-w-0 flex-1 flex-col gap-[4px] text-[11px] leading-normal text-black/50 md:flex-none">
          From
          <input type="date" name="from" defaultValue={range.from} max={today} required className={field} />
        </label>
        <label className="flex min-w-0 flex-1 flex-col gap-[4px] text-[11px] leading-normal text-black/50 md:flex-none">
          To
          <input type="date" name="to" defaultValue={range.to} max={today} className={field} />
        </label>
        <button className={`h-[40px] border px-[18px] text-paragraph transition-colors ${range.preset === "custom" ? "border-black bg-black text-white" : "border-black text-black hover:bg-black hover:text-white"}`}>Show</button>
      </form>
    </div>
  );
}
