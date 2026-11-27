import { describe, expect, it } from "vitest";
import { cartOverStock, quoteLine, type LineProduct } from "./cart-lines";

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

describe("cartOverStock", () => {
  const line = (product: LineProduct, item: Parameters<typeof quoteLine>[1]) => {
    const q = quoteLine(product, item);
    if ("error" in q) throw new Error(q.error);
    return { product, line: q.line };
  };
  const coloured: LineProduct = { ...oneSize, name: "Tie Top", stock: 3, colours: ["Rust", "Taupe"] };

  it("lets a cart through when its lines fit the stock together", () => {
    expect(cartOverStock([line(coloured, { id: "tie", quantity: 2, colour: "Rust" }), line(coloured, { id: "tie", quantity: 1, colour: "Taupe" })])).toBeNull();
    expect(cartOverStock([])).toBeNull();
  });

  it("stops the same piece on two lines from taking more than there is", () => {
    // Each line asks for 2 of 3 and passes on its own; together they ask for 4.
    expect(cartOverStock([line(coloured, { id: "tie", quantity: 2, colour: "Rust" }), line(coloured, { id: "tie", quantity: 2, colour: "Taupe" })])).toBe("Only 3 of Tie Top available");
    expect(cartOverStock([line(measured, { id: "top", quantity: 2, measurements: m }), line(measured, { id: "top", quantity: 2, measurements: [{ label: "Bust", value: "92" }] })])).toBe("Only 3 of Miss Flow Top available");
  });

  it("counts each size on its own", () => {
    const skirt: LineProduct = { ...sized, sizes: [{ label: "S", stock: 2 }, { label: "M", stock: 2 }], colours: ["Blush", "Sage"] };
    expect(cartOverStock([line(skirt, { id: "wrap", quantity: 2, size: "S", colour: "Blush" }), line(skirt, { id: "wrap", quantity: 2, size: "M", colour: "Sage" })])).toBeNull();
    expect(cartOverStock([line(skirt, { id: "wrap", quantity: 2, size: "S", colour: "Blush" }), line(skirt, { id: "wrap", quantity: 1, size: "S", colour: "Sage" })])).toBe("Only 2 of Wrap Skirt (S) available");
  });

  it("keeps different products apart", () => {
    expect(cartOverStock([line(measured, { id: "top", quantity: 3, measurements: m }), line(oneSize, { id: "boho", quantity: 1 })])).toBeNull();
  });

  it("takes nothing for made to measure or for products that don't count stock", () => {
    expect(cartOverStock([line(both, { id: "wrap", quantity: 5, measurements: m }), line(both, { id: "wrap", quantity: 2, size: "S" })])).toBeNull();
    const uncounted: LineProduct = { ...oneSize, trackStock: false };
    expect(cartOverStock([line(uncounted, { id: "boho", quantity: 9 }), line(uncounted, { id: "boho", quantity: 9 })])).toBeNull();
  });
});
