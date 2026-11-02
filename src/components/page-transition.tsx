"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { DEFAULT_TRANSITION, type TransitionSetting } from "@/lib/page-transition-shared";

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
 *
 * The shop's other transitions (push, blink, blur) need the old and the new page on screen at the
 * same moment, which a veil can't do, so they use the browser's View Transitions: it snapshots the
 * old page, we navigate, and globals.css animates the snapshot against the new page. The data-pt
 * attributes on <html> pick the animation. A browser without it gets the fade. Back/forward can't
 * be caught for these either, so those keep the veil. The dashboard always fades.
 */
export default function PageTransition({ area = "shop", setting = DEFAULT_TRANSITION, logoSrc }: { area?: "shop" | "admin"; setting?: TransitionSetting; logoSrc?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [phase, setPhase] = useState<"idle" | "out" | "covered" | "in">("idle");
  const pending = useRef<string | null>(null);
  const failSafe = useRef<number>(0);
  const pageReady = useRef<(() => void) | null>(null);
  const animating = useRef(false);
  const { type, direction, middle, axis } = setting;

  useEffect(() => {
    /** Push, blink or blur: snapshot, navigate, animate. False if this browser can't. */
    const viewTransition = (href: string) => {
      if (type === "fade" || !document.startViewTransition) return false;
      const root = document.documentElement;
      root.dataset.pt = type === "push" && middle ? "push-middle" : type;
      root.dataset.ptDir = direction;
      root.dataset.ptAxis = axis;
      animating.current = true;
      const vt = document.startViewTransition(
        () =>
          new Promise<void>((resolve) => {
            // The old page is captured by now, so what changes from here is only seen in the new one.
            window.dispatchEvent(new Event(PAGE_COVERED));
            if (root.dataset.pt === "push-middle") root.dataset.ptShow = "middle";
            pageReady.current = resolve;
            router.push(href);
            // The browser gives up after 4 seconds; a slow page then simply appears when it is ready.
            window.setTimeout(resolve, 3500);
          }),
      );
      vt.finished.finally(() => {
        for (const key of ["pt", "ptDir", "ptAxis", "ptShow"]) delete root.dataset[key];
        animating.current = false;
      });
      return true;
    };
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
      // "None": an ordinary navigation, but a menu still open has to close.
      if (area === "shop" && type === "none") {
        window.dispatchEvent(new Event(PAGE_COVERED));
        return;
      }
      e.preventDefault();
      if (animating.current) return;
      const href = url.pathname + url.search + url.hash;
      if (area === "shop" && viewTransition(href)) return;
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
      if (!reduced && !(area === "shop" && type === "none")) setPhase("covered");
    };
    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPop);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPop);
    };
  }, [router, area, type, direction, middle, axis]);

  // The new page has rendered: give it a frame, then reveal it.
  useEffect(() => {
    pending.current = null;
    pageReady.current?.();
    pageReady.current = null;
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
    <>
      <div
        aria-hidden
        className={`page-veil pointer-events-none fixed inset-0 z-[90] bg-white ${area === "admin" ? "admin-veil" : ""}`}
        style={{
          opacity: visible ? 1 : 0,
          transition: `opacity ${phase === "out" ? OUT_MS : phase === "covered" ? 0 : IN_MS}ms ${phase === "out" ? "ease-in" : "ease-out"}`,
          pointerEvents: visible ? "auto" : "none",
        }}
      />
      {/* The middle screen. Hidden, but its logo is loaded, until a push passes through it. */}
      {area === "shop" && type === "push" && middle && logoSrc && (
        <div aria-hidden className="page-middle fixed inset-0 z-[95] items-center justify-center bg-black">
          <Image src={logoSrc} alt="" width={486.544} height={109.193} loading="eager" className="h-auto w-[172px] md:w-[280px]" style={{ height: "auto" }} />
        </div>
      )}
    </>
  );
}
