import Link from "next/link";
import { ALL_TIME, PRESETS, rangeParams, type Range } from "@/lib/admin/reports";

/** One choice among a few, shown as a row of links: which shop, which status, which order. */
export type Filter = {
  /** The address parameter. */
  name: string;
  label: string;
  value: string;
  /** The value that means "no filter"; it is left out of the address. */
  fallback: string;
  options: readonly { value: string; label: string; count?: number }[];
};

/*
 * "Which period, and which part of it?" for every page that reports on one: the usual periods as
 * one-tap links, two date fields for any day or stretch of days, and under them the page's own
 * filters as rows of links. Everything is a plain link or GET form, so what is being looked at is
 * an address that can be bookmarked, shared or reloaded, and it works before any script has loaded.
 * Choosing one thing keeps the others: a new period keeps the filters, a filter keeps the period.
 *
 * `all` adds "All time", for the lists; graphs leave it out.
 */
export default function RangePicker({ path, range, today, keep = {}, filters = [], all = false }: { path: string; range: Range; today: string; keep?: Record<string, string | undefined>; filters?: Filter[]; all?: boolean }) {
  const kept = Object.entries(keep).filter((e): e is [string, string] => Boolean(e[1]));
  const chosen = (override?: { name: string; value: string }): [string, string][] =>
    filters.map((f): [string, string] => [f.name, override?.name === f.name ? override.value : f.value]).filter(([name, value]) => value !== filters.find((f) => f.name === name)!.fallback);
  const address = (pairs: [string, string][]) => {
    const query = new URLSearchParams(pairs).toString();
    return query ? `${path}?${query}` : path;
  };
  const periodHref = (preset: string) => address([...kept, ["range", preset], ...chosen()]);
  const filterHref = (name: string, value: string) => address([...kept, ...rangeParams(range), ...chosen({ name, value })]);

  const chip = (on: boolean) => `border px-[10px] py-[6px] text-[11px] leading-normal transition-colors ${on ? "border-black bg-black text-white" : "border-black/20 text-black hover:border-black"}`;
  const caption = "text-[11px] leading-normal tracking-[0.2em] uppercase text-black/50";
  const field = "h-[40px] min-w-0 flex-1 border border-black/20 bg-transparent px-[10px] font-gotham text-paragraph text-black outline-none focus:border-black md:w-[160px] md:flex-none";
  const presets = all ? [{ key: ALL_TIME, label: "All time" }, ...PRESETS] : PRESETS;

  return (
    <div className="flex flex-col gap-[14px] border-[0.5px] border-black/25 p-[12px] font-gotham text-paragraph text-black md:p-[18px]">
      <div className="flex flex-wrap items-baseline justify-between gap-x-[18px] gap-y-[4px]">
        <span className={caption}>Period</span>
        <span>{range.label}</span>
      </div>
      <nav aria-label="Period" className="flex flex-wrap gap-[6px]">
        {presets.map((p) => (
          <Link key={p.key} href={periodHref(p.key)} scroll={false} aria-current={range.preset === p.key ? "true" : undefined} className={chip(range.preset === p.key)}>
            {p.label}
          </Link>
        ))}
      </nav>
      <form action={path} method="get" className="flex flex-wrap items-end gap-[10px]">
        {[...kept, ...chosen()].map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
        <label className="flex min-w-0 flex-1 flex-col gap-[4px] text-[11px] leading-normal text-black/50 md:flex-none">
          From
          <input type="date" name="from" defaultValue={range.preset === "all" ? "" : range.from} max={today} required className={field} />
        </label>
        <label className="flex min-w-0 flex-1 flex-col gap-[4px] text-[11px] leading-normal text-black/50 md:flex-none">
          To
          <input type="date" name="to" defaultValue={range.preset === "all" ? "" : range.to} max={today} className={field} />
        </label>
        <button className={`h-[40px] border px-[18px] text-paragraph transition-colors ${range.preset === "custom" ? "border-black bg-black text-white" : "border-black text-black hover:bg-black hover:text-white"}`}>Show</button>
      </form>
      {filters.map((f) => (
        <div key={f.name} className="flex flex-col gap-[8px] border-t border-black/10 pt-[14px]">
          <span className={caption}>{f.label}</span>
          <nav aria-label={f.label} className="flex flex-wrap gap-[6px]">
            {f.options.map((o) => (
              <Link key={o.value} href={filterHref(f.name, o.value)} scroll={false} aria-current={f.value === o.value ? "true" : undefined} className={chip(f.value === o.value)}>
                {o.label}
                {o.count !== undefined && <span className={f.value === o.value ? "text-white/60" : "text-black/50"}> {o.count}</span>}
              </Link>
            ))}
          </nav>
        </div>
      ))}
    </div>
  );
}
