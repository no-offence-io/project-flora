import { describe, expect, it } from "vitest";
import { linesFromMetadata, quoteToMetadata } from "./order-metadata";

describe("order metadata", () => {
  const quote = {
    lines: [
      { id: "miss-flow-top", name: "Miss Flow top", quantity: 1, unitPriceOre: 89_000, measurements: [{ label: "Bust", value: "88" }, { label: "Waist", value: "70.5" }] },
      { id: "wrap-skirt", name: "Wrap skirt", quantity: 2, unitPriceOre: 129_000, size: "M" },
    ],
    totals: { discountOre: 1_000 },
    discount: { code: "TEN", docId: "disc1" },
  };
  it("round-trips sizes and measurements through Stripe's 500-character values", () => {
    const m = quoteToMetadata(quote, { lang: "no", country: "Norway" });
    for (const v of Object.values(m)) expect(v.length).toBeLessThanOrEqual(500);
    expect(m.lang).toBe("no");
    expect(m.discount).toBe("TEN");
    const back = linesFromMetadata(m);
    expect(back).toEqual([
      { id: "miss-flow-top", qty: 1, p: 89_000, measurements: [{ label: "Bust", value: "88" }, { label: "Waist", value: "70.5" }] },
      { id: "wrap-skirt", qty: 2, p: 129_000, s: "M", measurements: [] },
    ]);
  });
  it("tolerates missing or broken metadata", () => {
    expect(linesFromMetadata({})).toEqual([]);
    expect(linesFromMetadata({ items: "not json" })).toEqual([]);
  });
});
