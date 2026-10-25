import type { QuotedLine } from "./checkout-schema";

/** Marks PaymentIntents as ours, so the intent route only ever updates its own. */
export const METADATA_SITE = "flora";

/*
 * How a quote travels on the PaymentIntent. Stripe metadata allows 50 keys of 500 characters, so the
 * lines go in one compact key and each line's measurements in a key of their own.
 */
export type MetadataLine = { id: string; qty: number; p: number; s?: string };

export function quoteToMetadata(quote: { lines: QuotedLine[]; totals: { discountOre: number }; discount: { code: string; docId: string } | null }, extra: { lang: string; country?: string }): Record<string, string> {
  const metadata: Record<string, string> = {
    site: METADATA_SITE,
    lang: extra.lang,
    items: JSON.stringify(quote.lines.map((l) => ({ id: l.id, qty: l.quantity, p: l.unitPriceOre, ...(l.size ? { s: l.size } : {}) }))),
  };
  quote.lines.forEach((l, i) => {
    if (l.measurements?.length) metadata[`m_${i}`] = l.measurements.map((m) => `${m.label}=${m.value}`).join(";").slice(0, 500);
  });
  if (extra.country) metadata.country = extra.country;
  if (quote.discount) {
    metadata.discount = quote.discount.code;
    metadata.discount_doc = quote.discount.docId;
    metadata.discount_ore = String(quote.totals.discountOre);
  }
  return metadata;
}

/** The inverse of quoteToMetadata, for the webhook. Tolerant of hand-edited or missing keys. */
export function linesFromMetadata(m: Record<string, string>): (MetadataLine & { measurements: { label: string; value: string }[] })[] {
  let parsed: unknown = [];
  try {
    parsed = JSON.parse(m.items ?? "[]");
  } catch {
    parsed = [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter((x): x is MetadataLine => typeof x === "object" && x !== null && "id" in x && "qty" in x)
    .map((x, i) => ({
      id: String(x.id),
      qty: Number(x.qty) || 0,
      p: Number(x.p) || 0,
      ...(x.s ? { s: String(x.s) } : {}),
      measurements: (m[`m_${i}`] ?? "")
        .split(";")
        .filter(Boolean)
        .map((pair) => {
          const [label, ...rest] = pair.split("=");
          return { label, value: rest.join("=") };
        }),
    }));
}
