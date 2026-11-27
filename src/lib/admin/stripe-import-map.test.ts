import { describe, expect, it } from "vitest";
import type Stripe from "stripe";
import { orderFromCharge } from "./stripe-import-map";

const charge = (over: Record<string, unknown> = {}) =>
  ({
    id: "ch_3OldShopCharge0001",
    object: "charge",
    amount: 129_000,
    amount_captured: 129_000,
    amount_refunded: 0,
    currency: "nok",
    created: Date.parse("2025-03-14T10:30:00Z") / 1000,
    description: "Order #1042",
    paid: true,
    refunded: false,
    status: "succeeded",
    receipt_email: "Kari@Example.com",
    billing_details: { name: "Kari Nordmann", email: null, phone: "+47 400 00 000", address: { line1: "Storgata 1", line2: null, postal_code: "0155", city: "Oslo", country: "NO", state: null } },
    shipping: null,
    payment_intent: "pi_3OldShopIntent0001",
    payment_method_details: { type: "card", card: { brand: "visa", last4: "4242" } },
    metadata: {},
    ...over,
  }) as unknown as Stripe.Charge;

const none = new Set<string>();
const at = "2026-11-27T09:00:00.000Z";
const docOf = (c: Stripe.Charge, ours = none) => {
  const r = orderFromCharge(c, ours, at);
  if ("skip" in r) throw new Error(`skipped: ${r.skip}`);
  return r.doc as Record<string, any>;
};

describe("orderFromCharge", () => {
  it("turns a paid charge into a completed order at a private id", () => {
    const o = docOf(charge());
    expect(o._id).toBe("order.import-ch_3OldShopCharge0001");
    expect(o).toMatchObject({ _type: "order", imported: true, manual: "import", status: "delivered", orderedAt: "2025-03-14T10:30:00.000Z", totalOre: 129_000, subtotalOre: 129_000, shippingOre: 0, vatIncludedOre: 25_800, currency: "nok", paymentProvider: "stripe" });
    expect(o.orderNumber).toBe("FL-ARGE0001");
    expect(o.customer).toEqual({ name: "Kari Nordmann", email: "kari@example.com", phone: "+47 400 00 000", address: "Storgata 1, 0155 Oslo, NO", note: "" });
    expect(o.items).toEqual([{ _key: "line-0", _type: "orderItem", name: "Order #1042", quantity: 1, unitPriceOre: 129_000, measurements: [] }]);
    expect(o.paymentCard).toEqual({ brand: "visa", last4: "4242" });
    expect(o.stripePaymentIntentId).toBe("pi_3OldShopIntent0001");
    expect(o.internalNote).toContain("Imported from Stripe on 2026-11-27");
  });

  it("gives the same id for the same charge, so importing twice adds nothing", () => {
    expect(docOf(charge())._id).toBe(docOf(charge())._id);
  });

  it("marks a fully refunded charge as refunded and keeps what it was worth", () => {
    expect(docOf(charge({ refunded: true, amount_refunded: 129_000 }))).toMatchObject({ status: "refunded", totalOre: 129_000 });
  });

  it("counts only what was kept of a partly refunded charge, and says so", () => {
    const o = docOf(charge({ amount_refunded: 29_000 }));
    expect(o).toMatchObject({ status: "delivered", totalOre: 100_000 });
    expect(o.internalNote).toContain("290 kr of the original 1290 kr was refunded");
  });

  it("leaves out charges that never became money", () => {
    expect(orderFromCharge(charge({ status: "failed", paid: false }), none, at)).toEqual({ skip: "notPaid" });
    expect(orderFromCharge(charge({ amount_captured: 0 }), none, at)).toEqual({ skip: "notPaid" });
  });

  it("imports a payment in another currency at the kroner Stripe paid out for it", () => {
    // 89.00 EUR, which Stripe converted to 1 023.50 kr.
    const o = docOf(charge({ currency: "eur", amount: 8900, amount_captured: 8900, balance_transaction: { id: "txn_1", currency: "nok", amount: 102_350 } }));
    expect(o).toMatchObject({ status: "delivered", currency: "nok", totalOre: 102_350, subtotalOre: 102_350, vatIncludedOre: 20_470 });
    expect(o.items[0].unitPriceOre).toBe(102_350);
    expect(o.internalNote).toContain("Paid 89.00 EUR; Stripe counted it as 1023.5 kr.");
  });

  it("converts a part refund at the same rate", () => {
    // Half of it went back.
    const o = docOf(charge({ currency: "eur", amount: 8900, amount_captured: 8900, amount_refunded: 4450, balance_transaction: { id: "txn_1", currency: "nok", amount: 102_350 } }));
    expect(o.totalOre).toBe(51_175);
    expect(o.internalNote).toContain("511.75 kr of the original 1023.5 kr was refunded");
  });

  it("writes whole-unit currencies as they are", () => {
    const o = docOf(charge({ currency: "jpy", amount: 15_000, amount_captured: 15_000, balance_transaction: { id: "txn_2", currency: "nok", amount: 108_000 } }));
    expect(o.totalOre).toBe(108_000);
    expect(o.internalNote).toContain("Paid 15000 JPY");
  });

  it("leaves out a foreign payment Stripe never converted to kroner, rather than guess a rate", () => {
    expect(orderFromCharge(charge({ currency: "eur" }), none, at)).toEqual({ skip: "otherCurrency" });
    expect(orderFromCharge(charge({ currency: "eur", balance_transaction: "txn_not_expanded" }), none, at)).toEqual({ skip: "otherCurrency" });
    expect(orderFromCharge(charge({ currency: "eur", balance_transaction: { id: "txn_3", currency: "eur", amount: 8900 } }), none, at)).toEqual({ skip: "otherCurrency" });
  });

  it("never imports this shop's own payments, with or without an order", () => {
    expect(orderFromCharge(charge(), new Set(["pi_3OldShopIntent0001"]), at)).toEqual({ skip: "thisShop" });
    expect(orderFromCharge(charge({ payment_intent: { id: "pi_x", metadata: { site: "flora" } } }), none, at)).toEqual({ skip: "thisShop" });
    expect(orderFromCharge(charge({ metadata: { site: "flora" } }), none, at)).toEqual({ skip: "thisShop" });
  });

  it("copes with a charge that has almost nothing on it", () => {
    const o = docOf(charge({ description: null, billing_details: null, receipt_email: null, payment_intent: null, payment_method_details: null }));
    expect(o.items[0].name).toBe("Earlier sale");
    expect(o.customer).toEqual({ name: "", email: "", phone: "", address: "", note: "" });
    expect(o.paymentCard).toBeUndefined();
    expect(o.stripePaymentIntentId).toBeUndefined();
  });
});
