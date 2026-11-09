"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

/*
 * The one place to start anything new in the dashboard: a round black button that stays at the
 * bottom right of every page. Tapping it blurs the page and raises a sheet listing everything that
 * can be made; the rows arrive in a soft stagger, and the whole thing eases away again on close.
 * Rendered through a portal, as the phone menu is: night mode's filter would otherwise pin "fixed"
 * to the page wrapper instead of the screen.
 */
const THINGS: { href: string; title: string; detail: string }[] = [
  { href: "/admin/products/new", title: "Product", detail: "A new piece for the shop" },
  { href: "/admin/discounts/new", title: "Discount code", detail: "Percent or amount off" },
  { href: "/admin/journal/new", title: "Journal post", detail: "A story for the journal" },
  { href: "/admin/newsletters/new", title: "Newsletter", detail: "Write and send to subscribers" },
  { href: "/admin/orders/new", title: "Order", detail: "Taken by hand, e.g. in person" },
  { href: "/admin/pages/faq/new", title: "FAQ question", detail: "On the questions page" },
  { href: "/admin/media", title: "Photos or videos", detail: "Upload to the media bank" },
];

type Phase = "closed" | "opening" | "open" | "closing";
const OPEN_MS = 360;
const CLOSE_MS = 240;
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const subscribeNever = () => () => {};

export default function MakeNew() {
  const mounted = useSyncExternalStore(subscribeNever, () => true, () => false);
  const pathname = usePathname();
  const [phase, setPhase] = useState<Phase>("closed");
  // A new page means the sheet is done; derived during render, so there is no flash of the old state.
  const [seenPath, setSeenPath] = useState(pathname);
  if (pathname !== seenPath) {
    setSeenPath(pathname);
    if (phase !== "closed") setPhase("closed");
  }
  const showing = phase !== "closed";
  const settled = phase === "open";

  const open = () => setPhase("opening");
  const close = () => setPhase((p) => (p === "closed" ? p : "closing"));

  // Opening: mount in the start pose, then let the next frame carry it to the end pose. Closing: the reverse, then unmount.
  useEffect(() => {
    if (phase === "opening") {
      const id = requestAnimationFrame(() => requestAnimationFrame(() => setPhase((p) => (p === "opening" ? "open" : p))));
      return () => cancelAnimationFrame(id);
    }
    if (phase === "closing") {
      const id = window.setTimeout(() => setPhase((p) => (p === "closing" ? "closed" : p)), CLOSE_MS + 40);
      return () => window.clearTimeout(id);
    }
  }, [phase]);

  // While it is up: Escape closes, and the page behind does not scroll.
  useEffect(() => {
    if (!showing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [showing]);

  if (!mounted) return null;
  const ms = settled ? OPEN_MS : CLOSE_MS;
  return createPortal(
    <div className="admin-night-portal pointer-events-none fixed inset-0 z-[90]" data-make-new>
      {/* The page behind, frosted. */}
      {showing && (
        <div
          aria-hidden
          onClick={close}
          className="pointer-events-auto absolute inset-0 bg-white/35"
          style={{ opacity: settled ? 1 : 0, backdropFilter: settled ? "blur(14px) saturate(0.9)" : "blur(0px)", WebkitBackdropFilter: settled ? "blur(14px) saturate(0.9)" : "blur(0px)", transition: `opacity ${ms}ms ease, backdrop-filter ${ms}ms ease, -webkit-backdrop-filter ${ms}ms ease` }}
        />
      )}

      {/* The sheet, above the button. */}
      {showing && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Make new"
          className="pointer-events-auto absolute right-[24px] w-[min(340px,calc(100vw-48px))] border border-black bg-white font-gotham text-paragraph text-black shadow-[0_30px_80px_rgba(0,0,0,0.18)]"
          style={{
            bottom: "calc(24px + 56px + 16px + env(safe-area-inset-bottom, 0px))",
            opacity: settled ? 1 : 0,
            transform: settled ? "translateY(0) scale(1)" : "translateY(18px) scale(0.98)",
            transformOrigin: "100% 100%",
            transition: `opacity ${ms}ms ${EASE}, transform ${ms}ms ${EASE}`,
          }}
        >
          <div className="flex items-baseline justify-between gap-[12px] border-b border-black px-[20px] pt-[18px] pb-[14px]">
            <span className="font-americana text-[24px] leading-none">Make new</span>
            <span className="text-[11px] leading-normal tracking-[0.2em] uppercase text-black/50">{THINGS.length} things</span>
          </div>
          <ul className="m-0 list-none p-0">
            {THINGS.map((thing, i) => (
              <li
                key={thing.href}
                className={i ? "border-t-[0.5px] border-black/20" : ""}
                style={{
                  opacity: settled ? 1 : 0,
                  transform: settled ? "translateY(0)" : "translateY(10px)",
                  // Each row a little after the one above on the way up; all together on the way down.
                  transition: `opacity ${ms}ms ${EASE} ${settled ? 40 + i * 30 : 0}ms, transform ${ms}ms ${EASE} ${settled ? 40 + i * 30 : 0}ms`,
                }}
              >
                <Link href={thing.href} onClick={close} className="flex items-center justify-between gap-[12px] px-[20px] py-[14px] text-black transition-colors hover:bg-[#fafbfc]">
                  <span className="flex min-w-0 flex-col gap-[3px]">
                    <span>{thing.title}</span>
                    <span className="text-[11px] leading-normal text-black/50">{thing.detail}</span>
                  </span>
                  <span aria-hidden className="flex h-[28px] w-[28px] shrink-0 items-center justify-center bg-black text-white">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 7h10M7.5 2.5 12 7l-4.5 4.5" />
                    </svg>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* The button. The plus turns into a cross while the sheet is up. */}
      <button
        type="button"
        onClick={showing ? close : open}
        aria-expanded={showing}
        aria-label={showing ? "Close" : "Make new"}
        className="pointer-events-auto absolute right-[24px] flex h-[56px] w-[56px] items-center justify-center rounded-full bg-black text-white shadow-[0_12px_32px_rgba(0,0,0,0.28)] transition-transform hover:scale-105 active:scale-95"
        style={{ bottom: "calc(24px + env(safe-area-inset-bottom, 0px))", transform: `rotate(${settled ? 45 : 0}deg)`, transition: `transform ${ms}ms ${EASE}` }}
      >
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          <path d="M11 2v18M2 11h18" />
        </svg>
      </button>
    </div>,
    document.body,
  );
}
