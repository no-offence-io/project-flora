import { describe, expect, it } from "vitest";
import { computeTotals, DEFAULT_RULES, shippingFor, type ShippingRules } from "./pricing";

const lines = [{ unitPriceOre: 89_000, quantity: 1 }, { unitPriceOre: 20_000, quantity: 2 }]; // 1 290 kr

describe("computeTotals", () => {
  it("adds flat shipping under the free threshold and VAT as an included share", () => {
    const t = computeTotals(lines, DEFAULT_RULES);
    expect(t.subtotalOre).toBe(129_000);
    expect(t.shippingOre).toBe(8_900);
    expect(t.totalOre).toBe(137_900);
    expect(t.vatIncludedOre).toBe(Math.round((137_900 * 0.25) / 1.25));
    expect(t.discountOre).toBe(0);
  });
  it("ships free at or above the threshold", () => {
    expect(computeTotals([{ unitPriceOre: 150_000, quantity: 1 }], DEFAULT_RULES).shippingOre).toBe(0);
  });
  it("charges nothing for an empty cart", () => {
    expect(computeTotals([], DEFAULT_RULES).totalOre).toBe(0);
  });
  it("applies a percent code to the subtotal and judges free shipping on the discounted amount", () => {
    const t = computeTotals([{ unitPriceOre: 160_000, quantity: 1 }], DEFAULT_RULES, { discount: { code: "TEN", kind: "percent", value: 10, freeShipping: false } });
    expect(t.discountOre).toBe(16_000);
    expect(t.shippingOre).toBe(8_900); // 144 000 after the discount is under the 150 000 threshold
    expect(t.totalOre).toBe(144_000 + 8_900);
  });
  it("never discounts below zero and reports the code", () => {
    const t = computeTotals([{ unitPriceOre: 5_000, quantity: 1 }], DEFAULT_RULES, { discount: { code: "BIG", kind: "amount", value: 10_000, freeShipping: false } });
    expect(t.discountOre).toBe(5_000);
    expect(t.totalOre).toBe(0);
    expect(t.discountCode).toBe("BIG");
  });
  it("a free-shipping code drops shipping only", () => {
    const t = computeTotals(lines, DEFAULT_RULES, { discount: { code: "SHIP", kind: "shipping", value: 0, freeShipping: false } });
    expect(t.discountOre).toBe(0);
    expect(t.shippingOre).toBe(0);
    expect(t.discountCode).toBe("SHIP");
  });
});

describe("shipping zones", () => {
  const rules: ShippingRules = {
    ...DEFAULT_RULES,
    zones: [{ name: "Nordics", countries: ["Norway", "Sweden"], shippingOre: 5_900, freeShippingFromOre: 100_000 }, { name: "EU", countries: ["Germany"], shippingOre: 14_900, freeShippingFromOre: null }],
  };
  it("picks the zone by country name, case-insensitively", () => {
    expect(shippingFor(rules, "sweden").shippingOre).toBe(5_900);
    expect(shippingFor(rules, "Germany").freeShippingFromOre).toBeNull();
  });
  it("falls back to the flat price for a country in no zone", () => {
    expect(shippingFor(rules, "Japan").shippingOre).toBe(8_900);
    expect(shippingFor(rules, undefined).shippingOre).toBe(8_900);
  });
  it("uses the zone's threshold", () => {
    expect(computeTotals([{ unitPriceOre: 100_000, quantity: 1 }], rules, { country: "Norway" }).shippingOre).toBe(0);
    expect(computeTotals([{ unitPriceOre: 100_000, quantity: 1 }], rules, { country: "Germany" }).shippingOre).toBe(14_900);
  });
});
