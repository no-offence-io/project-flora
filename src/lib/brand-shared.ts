/*
 * Fonts an editor may pick in Settings → Brand. The first two are the site's own files; the rest
 * are Google Fonts, loaded only when chosen. Keys are what is stored; `css` is the family stack.
 */
export const FONTS: Record<string, { label: string; css: string; google?: string }> = {
  americana: { label: "Americana (the site's serif)", css: "var(--font-americana-file), Georgia, serif" },
  gotham: { label: "Gotham Book (the site's sans)", css: "var(--font-gotham-file), Helvetica, Arial, sans-serif" },
  "Playfair Display": { label: "Playfair Display — serif", css: "'Playfair Display', Georgia, serif", google: "Playfair+Display:wght@400;500" },
  "Cormorant Garamond": { label: "Cormorant Garamond — serif", css: "'Cormorant Garamond', Georgia, serif", google: "Cormorant+Garamond:wght@400;500" },
  "EB Garamond": { label: "EB Garamond — serif", css: "'EB Garamond', Georgia, serif", google: "EB+Garamond:wght@400;500" },
  "Libre Baskerville": { label: "Libre Baskerville — serif", css: "'Libre Baskerville', Georgia, serif", google: "Libre+Baskerville:wght@400" },
  "Bodoni Moda": { label: "Bodoni Moda — serif", css: "'Bodoni Moda', 'Didot', Georgia, serif", google: "Bodoni+Moda:wght@400;500" },
  Inter: { label: "Inter — sans", css: "'Inter', Helvetica, Arial, sans-serif", google: "Inter:wght@300;400" },
  "DM Sans": { label: "DM Sans — sans", css: "'DM Sans', Helvetica, Arial, sans-serif", google: "DM+Sans:wght@300;400" },
  "Work Sans": { label: "Work Sans — sans", css: "'Work Sans', Helvetica, Arial, sans-serif", google: "Work+Sans:wght@300;400" },
  Jost: { label: "Jost — sans", css: "'Jost', Helvetica, Arial, sans-serif", google: "Jost:wght@300;400" },
  Helvetica: { label: "Helvetica / Arial — system", css: "'Helvetica Neue', Helvetica, Arial, sans-serif" },
};
export const FONT_CHOICES = Object.keys(FONTS);

export type Brand = {
  logo?: string;
  headingFont?: string;
  bodyFont?: string;
  headingSizeDesktop?: number;
  headingSizeMobile?: number;
  bannerSize?: number;
  paragraphSize?: number;
  backgroundColor?: string;
  textColor?: string;
  /** Behind product photos in cards, slideshows and the gallery (default #f7f7f7). */
  photoBackground?: string;
  /** The vintage section's and Vintage page's paper (default #f4f1ea). */
  vintageBackground?: string;
  /** Behind each vintage piece's photo (default #1a1a1a). */
  vintagePhotoBackground?: string;
  /** Browser-tab icon colourway: black disc with white mark, or the reverse. */
  favicon?: "black" | "white";
  /** Uploaded icons per place (Sanity image URLs); the built-in mark is used where empty. */
  tabIcon?: string;
  homeIcon?: string;
  androidIcon?: string;
};
