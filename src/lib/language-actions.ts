"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { LANG_COOKIE } from "./language-shared";

/** Form action behind the EN / NO switch. Remembers the choice for a year and reloads the same page. */
export async function setLanguage(formData: FormData) {
  const lang = formData.get("lang") === "no" ? "no" : "en";
  (await cookies()).set(LANG_COOKIE, lang, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  const back = (await headers()).get("referer");
  // Only ever send the visitor back to one of our own pages.
  let path = "/";
  if (back) {
    try {
      const url = new URL(back);
      if (url.origin === new URL((await headers()).get("origin") ?? url.origin).origin) path = url.pathname + url.search;
    } catch {}
  }
  redirect(path);
}
