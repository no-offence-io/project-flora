"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { VISIT_KEY, type Visit } from "@/lib/visit-shared";

/**
 * Remembers, for this browser tab only (sessionStorage, no cookie, nothing sent anywhere), how the
 * visitor arrived and how many pages they looked at. The checkout sends it with the order so the
 * dashboard can say "Source: Instagram · Mobile · 5 pages". Never anything personal.
 */
export default function VisitTracker() {
  const pathname = usePathname();
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(VISIT_KEY);
      let visit: Visit;
      if (saved) {
        visit = JSON.parse(saved) as Visit;
      } else {
        const params = new URLSearchParams(location.search);
        let referrer: string | undefined;
        try {
          const host = document.referrer ? new URL(document.referrer).host : "";
          if (host && host !== location.host) referrer = host.slice(0, 120);
        } catch {}
        const get = (k: string, max: number) => params.get(k)?.trim().slice(0, max) || undefined;
        visit = { source: get("utm_source", 60), medium: get("utm_medium", 60), campaign: get("utm_campaign", 80), referrer, landing: location.pathname.slice(0, 120), views: 0 };
      }
      visit.views = Math.min((visit.views ?? 0) + 1, 10000);
      sessionStorage.setItem(VISIT_KEY, JSON.stringify(visit));
    } catch {}
  }, [pathname]);
  return null;
}

/** The visit as remembered, for the checkout to send. Undefined when storage is unavailable. */
export function readVisit(): Visit | undefined {
  try {
    const raw = sessionStorage.getItem(VISIT_KEY);
    if (!raw) return undefined;
    const v = JSON.parse(raw) as Visit;
    // Drop empty strings so the strict schema on the server accepts it.
    return Object.fromEntries(Object.entries(v).filter(([, x]) => x !== undefined && x !== "")) as Visit;
  } catch {
    return undefined;
  }
}
