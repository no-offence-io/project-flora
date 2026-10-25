import type { Totals } from "./money";

/**
 * Shipping, discount and VAT rules. These decide what a customer is charged, so they must never be
 * derivable from, or overridable by, anything the browser sends: the server reads the rules from
 * Site settings and the discount from its document, and the browser only ever names a country and
 * a code. Pure functions, so they are unit-tested (see src/lib/pricing.test.ts).
 *
 * Listed prices INCLUDE 25% Norwegian VAT (confirmed 2026-09-06). VAT is therefore never added on
 * top; `vatIncludedOre` is only the portion of the total that is tax, shown for the receipt.
 */
export const CURRENCY = "nok" as const;
export const VAT_RATE = 0.25;

export type ShippingZone = { name: string; countries: string[]; shippingOre: number; freeShippingFromOre: number | null };
export type ShippingRules = {
  /** The flat price for countries in no zone. */
  shippingOre: number;
  freeShippingFromOre: number | null;
  zones: ShippingZone[];
  /** Countries offered in the checkout; empty means the built-in list. */
  shipsTo: string[];
};
export const DEFAULT_RULES: ShippingRules = { shippingOre: 8_900, freeShippingFromOre: 150_000, zones: [], shipsTo: [] };

/** A discount as validated by the server — see src/lib/discounts.ts for the checks that produce it. */
export type AppliedDiscount = { code: string; kind: "percent" | "amount" | "shipping"; value: number; freeShipping: boolean };

const norm = (s: string) => s.trim().toLowerCase();

/** The price and threshold that apply to a country: its zone's, or the flat ones. */
export function shippingFor(rules: ShippingRules, country?: string | null): { shippingOre: number; freeShippingFromOre: number | null } {
  const zone = country ? rules.zones.find((z) => z.countries.some((c) => norm(c) === norm(country))) : undefined;
  return zone ? { shippingOre: zone.shippingOre, freeShippingFromOre: zone.freeShippingFromOre } : { shippingOre: rules.shippingOre, freeShippingFromOre: rules.freeShippingFromOre };
}

export function computeTotals(
  lines: { unitPriceOre: number; quantity: number }[],
  rules: ShippingRules = DEFAULT_RULES,
  options: { country?: string | null; discount?: AppliedDiscount | null } = {},
): Totals {
  const subtotalOre = lines.reduce((sum, line) => sum + line.unitPriceOre * line.quantity, 0);

  const discount = options.discount ?? null;
  let discountOre = 0;
  if (discount?.kind === "percent") discountOre = Math.round((subtotalOre * Math.min(100, Math.max(0, discount.value))) / 100);
  if (discount?.kind === "amount") discountOre = Math.max(0, discount.value);
  discountOre = Math.min(discountOre, subtotalOre);
  const discounted = subtotalOre - discountOre;

  const zone = shippingFor(rules, options.country);
  const free =
    discounted === 0 ||
    Boolean(discount?.freeShipping || discount?.kind === "shipping") ||
    (zone.freeShippingFromOre !== null && discounted >= zone.freeShippingFromOre);
  const shippingOre = free ? 0 : zone.shippingOre;
  const totalOre = discounted + shippingOre;
  // Included VAT on a gross amount: gross × rate / (1 + rate)
  const vatIncludedOre = Math.round((totalOre * VAT_RATE) / (1 + VAT_RATE));
  return { currency: CURRENCY, subtotalOre, shippingOre, vatIncludedOre, totalOre, discountOre, ...(discount && discountOre + (free ? 1 : 0) > 0 ? { discountCode: discount.code } : {}) };
}
