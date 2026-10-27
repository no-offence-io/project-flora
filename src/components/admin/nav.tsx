"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { GROUPS } from "./nav-links";

/*
 * The admin's sidebar: the wordmark, the sections in small groups, sign-out at the bottom. On
 * desktop it is a fixed 220px column; on phones it folds behind a "Menu" line at the top. Same
 * type as the shop's navbar — Gotham, 13.35px, black for the current page and 50% for the rest.
 */
const subscribeNever = () => () => {};

/** Outside the component: writing document.cookie is a side effect the React compiler won't allow inline. */
function saveNightPreference(next: "auto" | "on" | "off") {
  document.cookie = next === "auto" ? "flora-admin-night=; path=/admin; max-age=0" : `flora-admin-night=${next === "on" ? "1" : "0"}; path=/admin; max-age=31536000; samesite=lax`;
  // The browser's own bars: follow the device on Auto, otherwise the pinned colour.
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => {
    if (!m.hasAttribute("data-media")) {
      m.setAttribute("data-media", m.getAttribute("media") ?? "");
      m.setAttribute("data-content", m.getAttribute("content") ?? "");
    }
    if (next === "auto") {
      m.setAttribute("media", m.getAttribute("data-media") ?? "");
      m.setAttribute("content", m.getAttribute("data-content") ?? "");
    } else {
      m.removeAttribute("media");
      m.setAttribute("content", next === "on" ? "#000000" : "#ffffff");
    }
  });
}

export default function AdminNav({ current, email, unread = 0, logo, signOut, demo = false, toggleDemo, night: nightInitial = "auto" }: { current: string; email: string; unread?: number; logo: string; signOut: () => Promise<void>; demo?: boolean; toggleDemo: () => Promise<void>; night?: "auto" | "on" | "off" }) {
  const [switching, setSwitching] = useState(false);
  const [night, setNight] = useState<"auto" | "on" | "off">(nightInitial);
  // Night mode: follows the device by default; "On"/"Off" pin it for this browser. A cookie lets the
  // server render the right one without a flash; globals.css does the inversion.
  const chooseNight = (next: "auto" | "on" | "off") => {
    setNight(next);
    saveNightPreference(next);
    const root = document.querySelector("[data-admin-root]");
    root?.classList.toggle("admin-night", next === "on");
    root?.classList.toggle("admin-night-auto", next === "auto");
  };
  const nightSwitch = (
    <div className="flex flex-col gap-[6px]">
      <span className="font-gotham text-[11px] leading-normal tracking-[0.2em] uppercase text-black/50">Night mode</span>
      <span role="radiogroup" aria-label="Night mode" className="flex font-gotham text-paragraph">
        {([["auto", "Auto"], ["on", "On"], ["off", "Off"]] as const).map(([value, label], i) => (
          <span key={value} className="flex">
            {i > 0 && <span className="text-black/50">&nbsp;–&nbsp;</span>}
            <button type="button" role="radio" aria-checked={night === value} onClick={() => chooseNight(value)} className={`hover:opacity-70 transition-opacity ${night === value ? "text-black" : "text-black/50"}`}>
              {label}
            </button>
          </span>
        ))}
      </span>
    </div>
  );
  const demoSwitch = (
    <form action={toggleDemo} onSubmit={() => setSwitching(true)} className="flex flex-col gap-[6px]">
      <span className="font-gotham text-[11px] leading-normal tracking-[0.2em] uppercase text-black/50">Test mode</span>
      <button type="submit" disabled={switching} role="switch" aria-checked={demo} className="flex items-center gap-[8px] font-gotham text-paragraph text-black disabled:opacity-50">
        <span aria-hidden className={`relative inline-block h-[14px] w-[26px] rounded-full border border-black transition-colors ${demo ? "bg-black" : "bg-white"}`}>
          <span className={`absolute top-[1px] h-[10px] w-[10px] rounded-full transition-all ${demo ? "left-[13px] bg-white" : "left-[1px] bg-black"}`} />
        </span>
        {switching ? (demo ? "Removing…" : "Filling…") : demo ? "On — sample data" : "Off"}
      </button>
    </form>
  );
  const [open, setOpen] = useState(false);
  // The sheet is portalled, which needs the browser's document: true after hydration only.
  const mounted = useSyncExternalStore(subscribeNever, () => true, () => false);
  // While the sheet is open the page behind it doesn't scroll, and Escape closes it.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);
  const currentLabel = GROUPS.flatMap((g) => g.links).find((l) => l.href === current)?.label ?? "Dashboard";

  const list = (
    <nav aria-label="Admin" className="flex flex-col gap-[24px] font-gotham text-paragraph">
      {GROUPS.map((g) => (
        <div key={g.title} className="flex flex-col gap-[6px]">
          <span className="text-[11px] leading-normal tracking-[0.2em] uppercase text-black/50">{g.title}</span>
          <ul className="m-0 flex list-none flex-col gap-[6px] p-0">
            {g.links.map((link) => {
              const active = link.href === current;
              return (
                <li key={link.href}>
                  <Link href={link.href} aria-current={active ? "page" : undefined} onClick={() => setOpen(false)} className={`flex items-center justify-between gap-[12px] hover:opacity-70 transition-opacity ${active ? "text-black" : "text-black/50"}`}>
                    <span>{link.label}</span>
                    {link.href === "/admin/notifications" && unread > 0 && <span className="border-[0.5px] border-black px-[4px] py-[1px] text-[11px] text-black">{unread}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <>
      {/* Phone: one line, tap for the list */}
      <header className="flex flex-col gap-[12px] px-[24px] pt-[24px] text-black md:hidden">
        <div className="flex items-center justify-between">
          <Link href="/admin" aria-label="Flöra admin">
            <Image src={logo} alt="Flöra" width={486.544} height={109.193} className="h-[20px] w-[89px] invert" />
          </Link>
          <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)} className="font-gotham text-paragraph text-black">
            {open ? "Close" : `Menu · ${currentLabel}`}
            {!open && unread > 0 && <span className="ml-[6px] border-[0.5px] border-black px-[4px] py-[1px] text-[11px]">{unread}</span>}
          </button>
        </div>
      </header>

      {/* Phone menu: a full-screen sheet over the page, scrolling on its own. Portalled to <body> —
          inside the admin wrapper, night mode's filter would pin "fixed" to the wrapper instead of
          the screen — and inverted for night mode by its own class. Fades in, then each part in
          turn (opacity only, nothing slides); closing runs it in reverse. */}
      {mounted &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Admin menu"
            aria-hidden={!open}
            inert={!open}
            className={`admin-night-sheet fixed inset-0 z-[80] flex flex-col bg-white text-black transition-[opacity,visibility] md:hidden ${
              open ? "visible opacity-100 duration-[350ms]" : "invisible opacity-0 delay-[160ms] duration-[300ms]"
            }`}
          >
            <div className="flex shrink-0 items-center justify-between px-[24px] pt-[24px] pb-[12px]">
              <Link href="/admin" aria-label="Flöra admin" onClick={() => setOpen(false)}>
                <Image src={logo} alt="Flöra" width={486.544} height={109.193} className="h-[20px] w-[89px] invert" />
              </Link>
              <button type="button" onClick={() => setOpen(false)} className="font-gotham text-paragraph text-black">
                Close
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-[24px] pt-[12px] pb-[42px]">
              <div className="flex flex-col gap-[24px] border-t border-black/25 pt-[24px]">
                {[list, nightSwitch, demoSwitch,
                  <form key="out" action={signOut} className="flex items-center gap-[12px] font-gotham text-paragraph">
                    <span className="truncate text-black/50">{email}</span>
                    <button type="submit" className="text-black underline">Sign out</button>
                  </form>,
                ].map((part, i, all) => (
                  <div
                    key={i}
                    className={`transition-opacity duration-[450ms] ease-out ${open ? "opacity-100" : "opacity-0"}`}
                    style={{ transitionDelay: open ? `${120 + i * 70}ms` : `${(all.length - 1 - i) * 40}ms` }}
                  >
                    {part}
                  </div>
                ))}
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* Desktop: the column */}
      <aside className="hidden w-[220px] shrink-0 flex-col gap-[42px] border-r border-black/25 px-[24px] py-[24px] text-black md:sticky md:top-0 md:flex md:h-screen md:overflow-y-auto">
        <Link href="/admin" aria-label="Flöra admin" className="block">
          <Image src={logo} alt="Flöra" width={486.544} height={109.193} className="h-[20px] w-[89px] invert" />
        </Link>
        {list}
        <div className="mt-auto flex flex-col gap-[24px]">
          {nightSwitch}
          {demoSwitch}
        </div>
        <form action={signOut} className=" flex flex-col gap-[6px] font-gotham text-[11px] leading-normal">
          <span className="truncate text-black/50">{email}</span>
          <button type="submit" className="w-max text-black underline hover:opacity-70 transition-opacity">Sign out</button>
        </form>
      </aside>
    </>
  );
}
