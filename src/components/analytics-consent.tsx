"use client";

import { usePathname } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { useT } from "@/components/i18n-provider";

/*
 * Google Analytics, loaded only after the visitor says yes. Nothing from Google is fetched before
 * that — no cookieless pings either — so the shop is clean under Norwegian cookie rules without a
 * long settings dialog: one sentence, yes or no, remembered for half a year in a cookie of our own.
 * The measurement ID comes from Settings in the admin; with none set, this renders nothing.
 */
const COOKIE = "flora-consent";
type Consent = "yes" | "no" | "unset" | "pending";

const listeners = new Set<() => void>();
const readConsent = (): Consent => (document.cookie.match(/(?:^|; )flora-consent=(yes|no)/)?.[1] as Consent | undefined) ?? "unset";
const serverConsent = (): Consent => "pending";
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => void listeners.delete(l);
};
// The coming-soon gate rewrites every address to the placeholder, so the URL says nothing; the
// placeholder itself does. Hidden on the server too, so the box never flashes before hydration.
const readGated = () => document.querySelector(".coming-soon-gate") !== null;
const serverGated = () => true;
function writeConsent(value: "yes" | "no") {
  document.cookie = `${COOKIE}=${value}; path=/; max-age=${180 * 86400}; samesite=lax`;
  listeners.forEach((l) => l());
}

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

let loaded = false;
function loadGtag(id: string) {
  if (loaded) return;
  loaded = true;
  window.dataLayer = window.dataLayer ?? [];
  // gtag.js expects real `arguments` objects on the dataLayer, not arrays.
  window.gtag = function () {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  };
  window.gtag("js", new Date());
  // Page views are sent by hand below, so client-side navigations count too.
  window.gtag("config", id, { send_page_view: false });
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  document.head.appendChild(s);
}

export default function AnalyticsConsent({ measurementId }: { measurementId: string | null }) {
  const t = useT();
  const pathname = usePathname();
  const consent = useSyncExternalStore(subscribe, readConsent, serverConsent);
  const gated = useSyncExternalStore(subscribe, readGated, serverGated);

  useEffect(() => {
    if (!measurementId || consent !== "yes" || gated) return;
    loadGtag(measurementId);
    window.gtag?.("event", "page_view", { page_path: pathname, page_location: location.href, page_title: document.title });
  }, [measurementId, consent, gated, pathname]);

  if (!measurementId || consent !== "unset" || gated) return null;
  return (
    <div role="region" aria-label={t("consent.text")} className="consent-box shop-fixed fixed inset-x-0 bottom-0 z-[75]">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-[12px] border-t border-black/25 bg-white px-[24px] py-[18px] font-gotham text-paragraph text-black md:flex-row md:items-center md:justify-between md:px-[42px]">
        <p className="m-0">{t("consent.text")}</p>
        <div className="flex shrink-0 gap-[12px]">
          <button type="button" onClick={() => writeConsent("yes")} className="bg-black px-[18px] py-[10px] text-white hover:opacity-80 transition-opacity">
            {t("consent.accept")}
          </button>
          <button type="button" onClick={() => writeConsent("no")} className="border border-black px-[18px] py-[10px] text-black hover:opacity-70 transition-opacity">
            {t("consent.decline")}
          </button>
        </div>
      </div>
    </div>
  );
}
