"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Live } from "@/lib/admin/analytics";

/*
 * "How many are on the site right now?" The number comes from Google Analytics' realtime report
 * through /admin/live and is asked for again every fifteen seconds while this tab is the one being
 * looked at (a hidden tab stops asking and catches up the moment it is shown again). The server
 * renders the first answer, so the panel is never empty while it waits.
 *
 * States it can be in: counting (with or without anyone there), not connected to Analytics yet,
 * Analytics refusing, signed out, or offline. Each says so in words; none of them is a spinner.
 */
export type LiveState = Live | { error: "not-connected" | "analytics" | "signed-out" | "offline"; message?: string };

const EVERY_MS = 15_000;
const count = new Intl.NumberFormat("nb-NO");

export default function LiveVisitors({ initial, variant = "full" }: { initial: LiveState | null; variant?: "full" | "compact" }) {
  const [state, setState] = useState<LiveState | null>(initial);
  const [stale, setStale] = useState(false);
  // The clock the "updated n s ago" line reads; kept in state so rendering stays pure.
  const [now, setNow] = useState(() => Date.now());
  const stopped = useRef(false);

  useEffect(() => {
    let timer = 0;
    let alive = true;
    const ask = async () => {
      if (stopped.current || document.hidden) return;
      try {
        const res = await fetch("/admin/live", { cache: "no-store", headers: { Accept: "application/json" } });
        if (!alive) return;
        if (res.status === 401) {
          stopped.current = true;
          setState({ error: "signed-out" });
          return;
        }
        const data = (await res.json()) as LiveState;
        if (!alive) return;
        setState(data);
        setNow(Date.now());
        setStale(false);
        if ("error" in data && data.error === "not-connected") stopped.current = true;
      } catch {
        // Keep the last good answer on screen and say it is getting old, rather than blanking the panel over a dropped connection.
        if (alive) setStale(true);
      }
    };
    const start = () => {
      window.clearInterval(timer);
      timer = window.setInterval(ask, EVERY_MS);
    };
    const onVisible = () => {
      if (!document.hidden) {
        ask();
        start();
      }
    };
    start();
    const clock = window.setInterval(() => setNow(Date.now()), 5000);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      alive = false;
      window.clearInterval(timer);
      window.clearInterval(clock);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const frame = "flex flex-col gap-[12px] border-[0.5px] border-black/25 p-[12px] font-gotham text-paragraph text-black md:p-[24px]";
  const title = <span className="text-[11px] leading-normal tracking-[0.2em] uppercase text-black/50">On the site now</span>;

  if (!state || "error" in state) {
    const error = state && "error" in state ? state.error : "offline";
    return (
      <section className={frame} aria-label="Visitors on the site right now">
        {title}
        <span className="font-americana text-[32px] leading-none text-black/25">–</span>
        <span className="text-[11px] leading-normal text-black/50">
          {error === "not-connected" && (
            <>
              Live visitors come from Google Analytics, which isn&apos;t connected yet. <Link href="/admin/setup" className="text-black underline">Setup</Link> has the steps.
            </>
          )}
          {error === "analytics" && <>Google Analytics didn&apos;t answer{state && "message" in state && state.message ? `: ${state.message}` : "."} Trying again shortly.</>}
          {error === "signed-out" && (
            <>
              You have been signed out. <Link href="/admin/login" className="text-black underline">Sign in</Link> to see live visitors.
            </>
          )}
          {error === "offline" && <>Couldn&apos;t reach the dashboard. Trying again shortly.</>}
        </span>
      </section>
    );
  }

  const seconds = Math.max(0, Math.round((now - Date.parse(state.at)) / 1000));
  const peak = Math.max(1, ...state.minutes);
  // Oldest minute on the left, the minute just gone on the right.
  const minutes = [...state.minutes].reverse();
  return (
    <section className={frame} aria-label="Visitors on the site right now" aria-live="polite">
      <div className="flex items-center justify-between gap-[12px]">
        {title}
        <span className="flex items-center gap-[6px] text-[11px] leading-normal text-black/50">
          <span aria-hidden className={`relative inline-flex h-[8px] w-[8px] rounded-full ${stale ? "bg-black/25" : state.active > 0 ? "bg-[#2c8a3e]" : "bg-black/25"}`}>
            {!stale && state.active > 0 && <span className="absolute inset-0 animate-ping rounded-full bg-[#2c8a3e] opacity-60 motion-reduce:hidden" />}
          </span>
          {stale ? "connection lost, retrying" : seconds < 8 ? "live" : `updated ${seconds} s ago`}
        </span>
      </div>
      <div className="flex items-end justify-between gap-[18px]">
        <div className="flex flex-col gap-[6px]">
          <span className="font-americana text-[44px] leading-none md:text-[56px]">{count.format(state.active)}</span>
          <span className="text-[11px] leading-normal text-black/50">{state.active === 1 ? "visitor" : "visitors"} in the last 30 minutes</span>
        </div>
        <div className="flex h-[48px] min-w-0 flex-1 items-end gap-px md:max-w-[260px]" role="img" aria-label={`Visitors per minute over the last half hour, peak ${peak}`}>
          {minutes.map((v, i) => (
            <span key={i} title={`${29 - i} min ago: ${v}`} className={`min-w-0 flex-1 ${v > 0 ? "bg-black" : "bg-black/10"}`} style={{ height: v > 0 ? `max(3px, ${(v / peak) * 100}%)` : 1 }} />
          ))}
        </div>
      </div>
      {variant === "full" && state.active > 0 && (
        <div className="grid gap-[18px] border-t border-black/15 pt-[12px] md:grid-cols-3">
          <LiveList heading="Looking at" rows={state.pages} />
          <LiveList heading="On" rows={state.devices} />
          <LiveList heading="From" rows={state.countries} />
        </div>
      )}
      <span className="text-[11px] leading-normal text-black/50">
        Counts visitors who accepted cookies, as Google Analytics sees them. {variant === "compact" && <Link href="/admin/visits" className="text-black underline">More under Visits</Link>}
      </span>
    </section>
  );
}

function LiveList({ heading, rows }: { heading: string; rows: { name: string; users: number }[] }) {
  return (
    <div className="flex min-w-0 flex-col gap-[6px]">
      <span className="text-[11px] leading-normal text-black/50">{heading}</span>
      {rows.length === 0 ? (
        <span className="text-[11px] leading-normal text-black/50">–</span>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-[4px] p-0">
          {rows.map((r) => (
            <li key={r.name} className="flex items-baseline justify-between gap-[12px]">
              <span className="min-w-0 truncate">{r.name}</span>
              <span className="shrink-0 text-[11px] text-black/50">{count.format(r.users)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
