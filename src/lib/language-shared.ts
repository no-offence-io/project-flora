/** Shared by server and client code: no server imports here. */
export const LANGUAGES = ["en", "no"] as const;
export type Lang = (typeof LANGUAGES)[number];
export const LANG_COOKIE = "flora-lang";
