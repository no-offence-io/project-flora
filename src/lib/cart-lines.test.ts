import { describe, expect, it } from "vitest";
import { quoteLine, type LineProduct } from "./cart-lines";

const sized: LineProduct = { name: "Wrap Skirt", priceOre: 89_000, stock: 0, sizing: "sizes", sizes: [{ label: "S", stock: 2 }, { label: "M", stock: 0 }], tailored: false, tailoredExtraOre: 0 };
const both: LineProduct = { ...sized, tailored: true, tailoredExtraOre: 30_000 };
const measured: LineProduct = { name: "Miss Flow Top", priceOre: 129_000, stock: 3, sizing: "measurements", sizes: [], tailored: false, tailoredExtraOre: 0 };
const oneSize: LineProduct = { name: "Boho 1/1", priceOre: 36_000, stock: 1, sizing: "none", sizes: [], tailored: false, tailoredExtraOre: 0 };
const m = [{ label: "Bust", value: "88" }];

describe("quoteLine", () => {
  it("prices a standard size from the catalogue and checks that size's stock", () => {
    expect(quoteLine(sized, { id: "wrap", quantity: 2, size: "S" })).toEqual({ line: { id: "wrap", name: "Wrap Skirt", quantity: 2, unitPriceOre: 89_000, size: "S" } });
    expect(quoteLine(sized, { id: "wrap", quantity: 3, size: "S" })).toEqual({ error: "Only 2 of Wrap Skirt (S) available" });
    expect(quoteLine(sized, { id: "wrap", quantity: 1, size: "M" })).toEqual({ error: "Wrap Skirt (M) is sold out" });
    expect(quoteLine(sized, { id: "wrap", quantity: 1, size: "XXL" })).toEqual({ error: "Please choose a size for Wrap Skirt" });
  });

  it("refuses measurements on a product that isn't offered made to measure", () => {
    expect(quoteLine(sized, { id: "wrap", quantity: 1, measurements: m })).toEqual({ error: "Please choose a size for Wrap Skirt" });
  });

  it("prices made to measure with the extra, ignoring stock, when the product offers it", () => {
    expect(quoteLine(both, { id: "wrap", quantity: 5, measurements: m })).toEqual({ line: { id: "wrap", name: "Wrap Skirt", quantity: 5, unitPriceOre: 119_000, measurements: m, tailored: true } });
    expect(quoteLine(both, { id: "wrap", quantity: 1 })).toEqual({ error: "Please choose a size, or made to measure, for Wrap Skirt" });
  });

  it("treats a size as the choice when both a size and measurements arrive", () => {
    expect(quoteLine(both, { id: "wrap", quantity: 1, size: "S", measurements: m })).toEqual({ line: { id: "wrap", name: "Wrap Skirt", quantity: 1, unitPriceOre: 89_000, size: "S" } });
  });

  it("keeps made-to-measure-only and one-size products as they were", () => {
    expect(quoteLine(measured, { id: "top", quantity: 1, measurements: m })).toEqual({ line: { id: "top", name: "Miss Flow Top", quantity: 1, unitPriceOre: 129_000, measurements: m } });
    expect(quoteLine(measured, { id: "top", quantity: 1 })).toEqual({ error: "Please add your measurements for Miss Flow Top" });
    expect(quoteLine(measured, { id: "top", quantity: 4, measurements: m })).toEqual({ error: "Only 3 of Miss Flow Top available" });
    expect(quoteLine(oneSize, { id: "boho", quantity: 1, size: "M", measurements: m })).toEqual({ line: { id: "boho", name: "Boho 1/1", quantity: 1, unitPriceOre: 36_000 } });
    expect(quoteLine(oneSize, { id: "boho", quantity: 2 })).toEqual({ error: "Only 1 of Boho 1/1 available" });
  });

  it("needs one of the product's colours when it has several, and takes the only one when it has one", () => {
    const coloured = { ...sized, colours: ["Taupe", "Black"] };
    expect(quoteLine(coloured, { id: "wrap", quantity: 1, size: "S" })).toEqual({ error: "Please choose a colour for Wrap Skirt" });
    expect(quoteLine(coloured, { id: "wrap", quantity: 1, size: "S", colour: "Pink" })).toEqual({ error: "Please choose a colour for Wrap Skirt" });
    expect(quoteLine(coloured, { id: "wrap", quantity: 1, size: "S", colour: " black " })).toEqual({ line: { id: "wrap", name: "Wrap Skirt", quantity: 1, unitPriceOre: 89_000, size: "S", colour: "Black" } });
    expect(quoteLine({ ...oneSize, colours: ["Green"] }, { id: "boho", quantity: 1 })).toEqual({ line: { id: "boho", name: "Boho 1/1", quantity: 1, unitPriceOre: 36_000, colour: "Green" } });
    expect(quoteLine(oneSize, { id: "boho", quantity: 1, colour: "Green" })).toEqual({ line: { id: "boho", name: "Boho 1/1", quantity: 1, unitPriceOre: 36_000 } });
  });

  it("sets no limit on a product whose stock isn't counted", () => {
    expect(quoteLine({ ...sized, trackStock: false }, { id: "wrap", quantity: 10, size: "M" })).toEqual({ line: { id: "wrap", name: "Wrap Skirt", quantity: 10, unitPriceOre: 89_000, size: "M" } });
    expect(quoteLine({ ...oneSize, trackStock: false }, { id: "boho", quantity: 7 })).toEqual({ line: { id: "boho", name: "Boho 1/1", quantity: 7, unitPriceOre: 36_000 } });
    expect(quoteLine({ ...sized, trackStock: false }, { id: "wrap", quantity: 1, size: "XXL" })).toEqual({ error: "Please choose a size for Wrap Skirt" });
  });
});
