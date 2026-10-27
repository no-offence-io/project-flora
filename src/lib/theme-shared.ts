/** The shop's light/dark choice, kept in a cookie so the server renders the right one without a flash. */
export const THEME_COOKIE = "flora-theme";
export type Theme = "auto" | "light" | "dark";
export const parseTheme = (v: string | undefined): Theme => (v === "light" || v === "dark" ? v : "auto");
