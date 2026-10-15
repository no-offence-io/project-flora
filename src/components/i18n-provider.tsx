"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { translator, type Translate } from "@/lib/i18n";
import type { Lang } from "@/lib/language-shared";

const I18nContext = createContext<Translate>(translator("en"));

/** Makes the current language's strings available to client components via useT(). */
export function I18nProvider({ lang, children }: { lang: Lang; children: ReactNode }) {
  // Memoised so `t` keeps its identity across renders: effects and callbacks list it as a
  // dependency, and a fresh function each render would re-run them (the checkout re-prices
  // the cart in one such effect).
  const t = useMemo(() => translator(lang), [lang]);
  return <I18nContext.Provider value={t}>{children}</I18nContext.Provider>;
}

export function useT(): Translate {
  return useContext(I18nContext);
}
