/*
 * How a vintage piece is shown at the top of its page: as a printed card, or as a print floating in
 * a glass block. Chosen on the dashboard's Vintage card page, stored on siteSettings.vintageCard.
 * Shared by the shop (reads it), the dashboard (edits it) and the card itself (draws it).
 */
export const CARD_VARIANTS = ["card", "glass"] as const;
export const SHEET_BACKS = ["paper", "dark"] as const;
export type TreasureVariant = (typeof CARD_VARIANTS)[number];
/** What the back of the print inside the glass looks like: the vintage section's paper tone, or near black. */
export type SheetBack = (typeof SHEET_BACKS)[number];
/** markColor is the etched mark's colour as #rrggbb. */
export type VintageCardSetting = { variant: TreasureVariant; sheetBack: SheetBack; depth: number; markColor: string };

export const DEPTH_RANGE = { min: 0.02, max: 2 } as const;
export const DEFAULT_VINTAGE_CARD: VintageCardSetting = { variant: "glass", sheetBack: "dark", depth: 1.2, markColor: "#0a0a0a" };
const HEX = /^#[0-9a-f]{6}$/i;

const oneOf = <T extends string>(list: readonly T[], value: unknown, fallback: T): T => (list.includes(value as T) ? (value as T) : fallback);

/** Anything stored or posted → a setting that is safe to use; unknown values fall back to the default. */
export function parseVintageCard(v: { variant?: unknown; sheetBack?: unknown; depth?: unknown; markColor?: unknown } | null | undefined): VintageCardSetting {
  const depth = Number(v?.depth);
  const markColor = typeof v?.markColor === "string" && HEX.test(v.markColor) ? v.markColor.toLowerCase() : DEFAULT_VINTAGE_CARD.markColor;
  return {
    variant: oneOf(CARD_VARIANTS, v?.variant, DEFAULT_VINTAGE_CARD.variant),
    sheetBack: oneOf(SHEET_BACKS, v?.sheetBack, DEFAULT_VINTAGE_CARD.sheetBack),
    depth: Number.isFinite(depth) ? Math.round(Math.min(DEPTH_RANGE.max, Math.max(DEPTH_RANGE.min, depth)) * 100) / 100 : DEFAULT_VINTAGE_CARD.depth,
    markColor,
  };
}
