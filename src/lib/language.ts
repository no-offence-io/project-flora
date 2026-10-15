import "server-only";
import { cookies } from "next/headers";
import { LANG_COOKIE, type Lang } from "./language-shared";

export type { Lang } from "./language-shared";

/** The visitor's language: a cookie set by the switch in the navbar, English until they choose. */
export async function getLanguage(): Promise<Lang> {
  const value = (await cookies()).get(LANG_COOKIE)?.value;
  return value === "no" ? "no" : "en";
}
