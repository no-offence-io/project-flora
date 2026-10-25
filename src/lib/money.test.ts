import { describe, expect, it } from "vitest";
import { formatNok, orderReference } from "./money";

describe("money", () => {
  it("derives the same order number from the same PaymentIntent", () => {
    expect(orderReference("pi_3Abc123XyZ")).toBe("FL-BC123XYZ");
    expect(orderReference("pi_3Abc123XyZ")).toBe(orderReference("pi_3Abc123XyZ"));
  });
  it("formats øre as whole kroner", () => {
    expect(formatNok(129_000).replace(/\s/g, " ")).toMatch(/1 290 kr/);
  });
});
