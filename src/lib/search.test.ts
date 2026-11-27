import { describe, expect, it } from "vitest";
import { fold, search, searchScore, type SearchField } from "./search";

type Item = { name: string; colours?: string[]; category?: string; description?: string };

const fieldsOf = (p: Item): SearchField[] => [
  { text: p.name, weight: 3, forgiving: true },
  { text: (p.colours ?? []).join(" "), weight: 2, forgiving: true },
  { text: p.category ?? "", weight: 2, forgiving: true },
  { text: p.description ?? "", weight: 0.5 },
];

const SHOP: Item[] = [
  { name: "Miss Julie Leather White", colours: ["White"], category: "Accessories Tilbehør", description: "A fringed shoulder bag in soft leather." },
  { name: "Miss Julie Leather", colours: ["Black"], category: "Accessories Tilbehør", description: "A fringed shoulder bag in black and white cowhide." },
  { name: "Wrap Skirt", colours: ["Blush", "Sage"], category: "Skirts Skjørt", description: "A long skirt that ties at the waist." },
  { name: "Tie Top", colours: ["Forest", "Rust", "Taupe"], category: "Tops Topper", description: "Cotton top with ties." },
];

const names = (q: string) => search(SHOP, q, fieldsOf).map((p) => p.name);

describe("fold", () => {
  it("ignores case, accents and punctuation", () => {
    expect(fold("  Flöra — Skjørt, blå! ")).toBe("flora skjort bla");
    expect(fold("Æble")).toBe("aeble");
  });
});

describe("search", () => {
  it("returns everything for an empty search, in the order given", () => {
    expect(names("")).toEqual(SHOP.map((p) => p.name));
    expect(names("   ")).toEqual(SHOP.map((p) => p.name));
  });

  it("finds a product whose words are typed with other words between them", () => {
    expect(names("miss julie white")[0]).toBe("Miss Julie Leather White");
  });

  it("doesn't care about the order of the words", () => {
    expect(names("white julie miss")[0]).toBe("Miss Julie Leather White");
    expect(names("leather julie")).toEqual(["Miss Julie Leather White", "Miss Julie Leather"]);
  });

  it("needs every word to be found somewhere", () => {
    expect(names("miss julie skirt")).toEqual([]);
    expect(names("julie forest")).toEqual([]);
  });

  it("matches a word that is only half typed", () => {
    expect(names("jul whi")[0]).toBe("Miss Julie Leather White");
    expect(names("skir")).toEqual(["Wrap Skirt"]);
  });

  it("forgives a slip in a name, colour or category", () => {
    expect(names("jule")).toEqual(["Miss Julie Leather White", "Miss Julie Leather"]);
    expect(names("lether whit")[0]).toBe("Miss Julie Leather White");
    expect(names("forrest")).toEqual(["Tie Top"]);
    expect(names("juile")).toContain("Miss Julie Leather");
  });

  it("does not forgive slips in very short words", () => {
    expect(names("tip")).toEqual([]);
    expect(names("top")).toEqual(["Tie Top"]);
  });

  it("searches colours and categories, in either language", () => {
    expect(names("sage")).toEqual(["Wrap Skirt"]);
    expect(names("accessories")).toEqual(["Miss Julie Leather White", "Miss Julie Leather"]);
    expect(names("skjort")).toEqual(["Wrap Skirt"]);
    expect(names("skjørt")).toEqual(["Wrap Skirt"]);
  });

  it("searches the description, and ranks a name above it", () => {
    expect(names("cotton")).toEqual(["Tie Top"]);
    // Both bags mention white: one in its name and colour, the other only in its description.
    expect(names("white")).toEqual(["Miss Julie Leather White", "Miss Julie Leather"]);
  });

  it("finds nothing for nonsense", () => {
    expect(names("zzzz")).toEqual([]);
    expect(searchScore("zzzz", fieldsOf(SHOP[0]))).toBe(0);
  });
});
