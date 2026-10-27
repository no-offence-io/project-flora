"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const OUT_MS = 280;
/** Fired when the veil fully covers the screen, just before the next page is requested. */
export const PAGE_COVERED = "flora:page-covered";

/** True when `href` leads to another page (so the fade will run and the menu can wait for it). */
export function leadsElsewhere(href: string): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  const url = new URL(href, window.location.href);
  return url.origin === window.location.origin && url.pathname !== window.location.pathname;
}
const IN_MS = 450;

/**
 * Fades the whole shop between pages — navbar, menu and footer included — in every browser.
 *
 * A veil in the page's own background colour covers the screen. A click on an internal link is
 * caught first (capture phase): the veil fades in, the navigation starts once it is opaque, and
 * when the new page has rendered the veil fades out again. While a slow page loads the veil just
 * stays up, so nothing half-loaded is ever seen. Back/forward can't be caught before they happen,
 * so those snap the veil up and fade it away on the new page. Next's <Link> skips its own
 * navigation when the click was already handled, but still runs its onClick (the menu closes).
 */
export default function PageTransition({ area = "shop" }: { area?: "shop" | "admin" }) {
  const router = useRouter();
  const pathname = usePathname();
  const [phase, setPhase] = useState<"idle" | "out" | "covered" | "in">("idle");
  const pending = useRef<string | null>(null);
  const failSafe = useRef<number>(0);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname.startsWith("/api")) return;
      // Each area fades within itself; crossing between shop and admin is an ordinary page load.
      const inAdmin = url.pathname.startsWith("/admin");
      if ((area === "admin") !== inAdmin) return;
      if (url.pathname.endsWith("/export")) return; // file downloads
      // Same page (only the hash or the query changes): let it happen normally.
      if (url.pathname === window.location.pathname) return;
      if (reduced) return;
      e.preventDefault();
      const href = url.pathname + url.search + url.hash;
      pending.current = href;
      setPhase("out");
      window.setTimeout(() => {
        setPhase("covered");
        // Menus that stayed open during the fade close now, out of sight under the veil.
        window.dispatchEvent(new Event(PAGE_COVERED));
        router.push(href);
      }, OUT_MS);
      window.clearTimeout(failSafe.current);
      failSafe.current = window.setTimeout(() => setPhase("idle"), 6000);
    };
    const onPop = () => {
      if (!reduced) setPhase("covered");
    };
    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPop);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPop);
    };
  }, [router, area]);

  // The new page has rendered: give it a frame, then reveal it.
  useEffect(() => {
    pending.current = null;
    const frame = requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        setPhase((p) => (p === "covered" || p === "out" ? "in" : p));
      }),
    );
    const done = window.setTimeout(() => setPhase((p) => (p === "in" ? "idle" : p)), IN_MS + 50);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(done);
    };
  }, [pathname]);

  const visible = phase === "out" || phase === "covered";
  return (
    <div
      aria-hidden
      className={`page-veil pointer-events-none fixed inset-0 z-[90] bg-white ${area === "admin" ? "admin-veil" : ""}`}
      style={{
        opacity: visible ? 1 : 0,
        transition: `opacity ${phase === "out" ? OUT_MS : phase === "covered" ? 0 : IN_MS}ms ${phase === "out" ? "ease-in" : "ease-out"}`,
        pointerEvents: visible ? "auto" : "none",
      }}
    />
  );
}
