/*
 * The boxes the site draws pictures in, for the dashboard's media editor (media-editor.tsx). A
 * plain module, with no "use client", so server-rendered forms can pick the frames for a field.
 */

/**
 * The shape of the box the site draws the picture in: its aspect, whether the picture fills it
 * (cover) or sits whole inside it (contain), the box's margin as fractions of its width and height,
 * and a label for the "Preview as" switch when a field has several boxes.
 */
export type Frame = { aspect: number; fit: "contain" | "cover"; pad?: [number, number]; label?: string };

/** A box of w×h pixels with a px/py margin, as the shop lays it out at a phone (390) or desktop (1440) width. */
const box = (label: string, w: number, h: number, px = 0, py = 0, fit: Frame["fit"] = "contain"): Frame => ({ label, aspect: w / h, fit, pad: px || py ? [px / w, py / h] : undefined });

/** The shop grid's desktop card, the photo whole inside a 24/42px margin. */
export const PRODUCT_FRAME: Frame = box("Shop grid · desktop", 269, 258, 24, 42);
export const PORTRAIT_FRAME: Frame = { aspect: 4 / 5, fit: "cover" };
export const WIDE_FRAME: Frame = { aspect: 16 / 9, fit: "cover" };
/** A full-screen background: a phone and a desktop screen. */
export const SCREEN_FRAMES: Frame[] = [
  { label: "Phone", aspect: 390 / 844, fit: "cover" },
  { label: "Desktop", aspect: 1440 / 900, fit: "cover" },
];

/** Every box a product photo is drawn in: the shop grid (or the vintage grids), the product page's gallery and the "You may also like" row. */
export function productFrames(vintage = false): Frame[] {
  return [
    vintage ? box("Vintage grid · phone", 159, 238, 24, 42) : box("Shop grid · phone", 159, 238, 24, 42),
    vintage ? box("Vintage grid · desktop", 307, 258, 24, 42) : PRODUCT_FRAME,
    ...(vintage ? [box("Vintage page · phone", 342, 420, 24, 42), box("Vintage page · desktop", 648, 640, 24, 42)] : []),
    box("Product page · phone", 390, 386, 24, 24),
    box("Product page · desktop", 720, 820, 24, 120),
    box("Also like · phone", 342, 465, 24, 42),
    box("Also like · desktop", 445, 465, 24, 42),
  ];
}

