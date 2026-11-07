import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const payment = { state: "CREATED", aggregate: { authorizedAmount: { currency: "NOK", value: 0 }, capturedAmount: { currency: "NOK", value: 0 }, refundedAmount: { currency: "NOK", value: 0 }, cancelledAmount: { currency: "NOK", value: 0 } } };
const vipps = vi.hoisted(() => ({
  getVippsPayment: vi.fn(),
  captureVippsPayment: vi.fn(),
  vippsEnv: () => "test" as const,
}));
vi.mock("./vipps", () => vipps);

const store = vi.hoisted(() => ({ docs: new Map<string, Record<string, unknown>>(), patches: [] as { id: string; set: Record<string, unknown> }[] }));
vi.mock("@/sanity/lib/write", () => ({
  getWriteClient: () => ({
    getDocument: async (id: string) => store.docs.get(id) ?? null,
    patch: (id: string) => ({ set: (set: Record<string, unknown>) => ({ commit: async () => void store.patches.push({ id, set }) }) }),
  }),
}));

const recorded = vi.hoisted(() => ({ recordPaidOrder: vi.fn(), afterOrderCreated: vi.fn(), notice: vi.fn() }));
vi.mock("./record-order", () => ({ recordPaidOrder: recorded.recordPaidOrder }));
vi.mock("./order-followup", () => ({ afterOrderCreated: recorded.afterOrderCreated }));
vi.mock("./notices", () => ({ notice: recorded.notice }));

import { settleVippsPayment, vippsDocId, vippsOrderDocId } from "./vipps-checkout";

const REF = "fl-0123456789abcdef01234567";
const metadata = { site: "flora", lang: "no", items: "[]", customer_email: "a@b.no" };

describe("settleVippsPayment", () => {
  beforeEach(() => {
    store.docs.clear();
    store.patches.length = 0;
    vi.clearAllMocks();
    store.docs.set(vippsDocId(REF), { _id: vippsDocId(REF), reference: REF, status: "created", amountOre: 1000, email: "a@b.no", metadata: JSON.stringify(metadata), environment: "test", createdAt: "2026-11-07T10:00:00Z" });
    vipps.getVippsPayment.mockResolvedValue({ ...payment, reference: REF, amount: { currency: "NOK", value: 1000 } });
    recorded.recordPaidOrder.mockResolvedValue({ created: true, docId: vippsOrderDocId(REF), orderNumber: "FL-01234567", oversold: [], lines: [], customer: {}, totals: { totalOre: 1000 } });
  });

  it("ignores references that aren't ours", async () => {
    expect(await settleVippsPayment("nope")).toEqual({ state: "unknown" });
    expect(await settleVippsPayment("fl-ffffffffffffffffffffffff")).toEqual({ state: "unknown" });
    expect(vipps.getVippsPayment).not.toHaveBeenCalled();
  });

  it("waits while the customer is still in the app", async () => {
    expect(await settleVippsPayment(REF)).toEqual({ state: "pending" });
    expect(recorded.recordPaidOrder).not.toHaveBeenCalled();
  });

  it("marks an abandoned payment and never records it", async () => {
    vipps.getVippsPayment.mockResolvedValue({ ...payment, state: "ABORTED" });
    expect(await settleVippsPayment(REF)).toEqual({ state: "cancelled" });
    expect(store.patches).toEqual([{ id: vippsDocId(REF), set: { status: "aborted" } }]);
    expect(recorded.recordPaidOrder).not.toHaveBeenCalled();
    // Later calls don't even ask Vipps again.
    store.docs.get(vippsDocId(REF))!.status = "aborted";
    vipps.getVippsPayment.mockClear();
    expect(await settleVippsPayment(REF)).toEqual({ state: "cancelled" });
    expect(vipps.getVippsPayment).not.toHaveBeenCalled();
  });

  it("captures the quoted amount once authorised, then records the order and runs the follow-ups once", async () => {
    vipps.getVippsPayment.mockResolvedValue({ ...payment, state: "AUTHORIZED", aggregate: { ...payment.aggregate, authorizedAmount: { currency: "NOK", value: 1000 } } });
    vipps.captureVippsPayment.mockResolvedValue({ ...payment.aggregate, authorizedAmount: { currency: "NOK", value: 1000 }, capturedAmount: { currency: "NOK", value: 1000 } });
    expect(await settleVippsPayment(REF)).toEqual({ state: "paid", orderNumber: "FL-01234567", amountOre: 1000 });
    expect(vipps.captureVippsPayment).toHaveBeenCalledWith(REF, 1000);
    expect(recorded.recordPaidOrder).toHaveBeenCalledWith(expect.objectContaining({ provider: "vipps", id: REF, docId: vippsOrderDocId(REF), orderNumber: "FL-01234567", amountOre: 1000, currency: "nok", metadata, receiptEmail: "a@b.no" }));
    expect(recorded.afterOrderCreated).toHaveBeenCalledTimes(1);
    expect(store.patches.at(-1)).toMatchObject({ id: vippsDocId(REF), set: { status: "captured", orderId: vippsOrderDocId(REF) } });
  });

  it("skips the capture when Vipps already shows the money taken, and the follow-ups when the order already exists", async () => {
    vipps.getVippsPayment.mockResolvedValue({ ...payment, state: "AUTHORIZED", aggregate: { ...payment.aggregate, authorizedAmount: { currency: "NOK", value: 1000 }, capturedAmount: { currency: "NOK", value: 1000 } } });
    recorded.recordPaidOrder.mockResolvedValue({ created: false, docId: vippsOrderDocId(REF), orderNumber: "FL-01234567", oversold: [], lines: [], customer: {}, totals: { totalOre: 1000 } });
    expect(await settleVippsPayment(REF)).toEqual({ state: "paid", orderNumber: "FL-01234567", amountOre: 1000 });
    expect(vipps.captureVippsPayment).not.toHaveBeenCalled();
    expect(recorded.afterOrderCreated).not.toHaveBeenCalled();
  });

  it("answers from the document once settled, without asking Vipps", async () => {
    store.docs.get(vippsDocId(REF))!.orderId = vippsOrderDocId(REF);
    expect(await settleVippsPayment(REF)).toEqual({ state: "paid", orderNumber: "FL-01234567", amountOre: 1000 });
    expect(vipps.getVippsPayment).not.toHaveBeenCalled();
  });

  it("refuses to record a payment authorised for less than the cart", async () => {
    vipps.getVippsPayment.mockResolvedValue({ ...payment, state: "AUTHORIZED", aggregate: { ...payment.aggregate, authorizedAmount: { currency: "NOK", value: 500 } } });
    const outcome = await settleVippsPayment(REF);
    expect(outcome.state).toBe("failed");
    expect(vipps.captureVippsPayment).not.toHaveBeenCalled();
    expect(recorded.recordPaidOrder).not.toHaveBeenCalled();
    expect(recorded.notice).toHaveBeenCalledTimes(1);
  });

  it("throws, rather than records, when the capture isn't confirmed", async () => {
    vipps.getVippsPayment.mockResolvedValue({ ...payment, state: "AUTHORIZED", aggregate: { ...payment.aggregate, authorizedAmount: { currency: "NOK", value: 1000 } } });
    vipps.captureVippsPayment.mockResolvedValue({ ...payment.aggregate, capturedAmount: { currency: "NOK", value: 0 } });
    await expect(settleVippsPayment(REF)).rejects.toThrow(/capture not confirmed/);
    expect(recorded.recordPaidOrder).not.toHaveBeenCalled();
  });

  it("won't read a payment made with the other environment's keys", async () => {
    store.docs.get(vippsDocId(REF))!.environment = "production";
    expect(await settleVippsPayment(REF)).toEqual({ state: "unknown" });
    expect(vipps.getVippsPayment).not.toHaveBeenCalled();
  });
});
