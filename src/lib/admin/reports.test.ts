import { describe, expect, it } from "vitest";
import { addDays, addMonths, byDay, byDiscountCode, byMonth, byPayment, byProduct, byYear, change, csvMoney, cumulativeByDay, dayKey, daysBetween, inRange, isDay, linesCsv, monthsOfYear, ordersCsv, parseRange, presetRange, previousRange, summarise, summaryCsv, toCsv, yearBefore, type ReportOrder } from "./reports";

const order = (o: Partial<ReportOrder> & { at: string; total?: number }): ReportOrder => ({
  _id: `o-${o.at}-${o.orderNumber ?? ""}`,
  orderNumber: o.orderNumber ?? "FL-1",
  status: o.status ?? "paid",
  orderedAt: o.at,
  totalOre: o.total ?? 100000,
  subtotalOre: o.subtotalOre ?? o.total ?? 100000,
  vatIncludedOre: o.vatIncludedOre ?? Math.round((o.total ?? 100000) * 0.2),
  shippingOre: o.shippingOre ?? 0,
  discountOre: o.discountOre ?? 0,
  discountCode: o.discountCode,
  paymentProvider: o.paymentProvider ?? "stripe",
  manual: o.manual,
  customer: o.customer,
  items: o.items ?? [{ name: "Wrap Skirt", quantity: 1, unitPriceOre: o.total ?? 100000 }],
});

describe("days", () => {
  it("puts an order on its Oslo day, not its UTC day", () => {
    // 23:30 UTC on 31 Oct is 00:30 on 1 Nov in Oslo (winter time, UTC+1).
    expect(dayKey("2026-10-31T23:30:00Z")).toBe("2026-11-01");
    // 22:30 UTC on 30 Jun is 00:30 on 1 Jul in Oslo (summer time, UTC+2).
    expect(dayKey("2026-06-30T22:30:00Z")).toBe("2026-07-01");
    expect(dayKey("2026-06-30T21:30:00Z")).toBe("2026-06-30");
  });

  it("does calendar arithmetic without drifting over daylight saving or month ends", () => {
    expect(addDays("2026-03-28", 2)).toBe("2026-03-30");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
    expect(addMonths("2026-03-31", -1)).toBe("2026-02-28");
    expect(addMonths("2024-02-29", -12)).toBe("2023-02-28");
    expect(daysBetween("2026-11-01", "2026-11-30")).toBe(30);
    expect(daysBetween("2026-11-18", "2026-11-18")).toBe(1);
  });

  it("only accepts real dates", () => {
    expect(isDay("2026-11-18")).toBe(true);
    expect(isDay("2026-02-30")).toBe(false);
    expect(isDay("18.11.2026")).toBe(false);
    expect(isDay(undefined)).toBe(false);
  });
});

describe("ranges", () => {
  const today = "2026-11-18";

  it("knows the presets", () => {
    expect(presetRange("today", today)).toMatchObject({ from: today, to: today });
    expect(presetRange("yesterday", today)).toMatchObject({ from: "2026-11-17", to: "2026-11-17" });
    expect(presetRange("7d", today)).toMatchObject({ from: "2026-11-12", to: today });
    expect(presetRange("30d", today)).toMatchObject({ from: "2026-10-20", to: today });
    expect(presetRange("month", today)).toMatchObject({ from: "2026-11-01", to: today });
    expect(presetRange("last-month", today)).toMatchObject({ from: "2026-10-01", to: "2026-10-31" });
    expect(presetRange("year", today)).toMatchObject({ from: "2026-01-01", to: today });
    expect(presetRange("last-year", today)).toMatchObject({ from: "2025-01-01", to: "2025-12-31" });
    expect(presetRange("last-month", "2026-01-15")).toMatchObject({ from: "2025-12-01", to: "2025-12-31" });
  });

  it("reads a custom period, one day or two ends, and repairs what it is given", () => {
    expect(parseRange({ from: "2026-11-03" }, today)).toMatchObject({ from: "2026-11-03", to: "2026-11-03", preset: "custom", label: "3 Nov 2026" });
    expect(parseRange({ from: "2026-10-01", to: "2026-10-31" }, today)).toMatchObject({ from: "2026-10-01", to: "2026-10-31", label: "1 Oct – 31 Oct 2026" });
    expect(parseRange({ from: "2026-10-31", to: "2026-10-01" }, today)).toMatchObject({ from: "2026-10-01", to: "2026-10-31" });
    expect(parseRange({ from: "2026-11-10", to: "2027-01-01" }, today)).toMatchObject({ from: "2026-11-10", to: today });
    expect(parseRange({ from: "2027-05-01", to: "2027-06-01" }, today)).toMatchObject({ from: today, to: today });
    expect(parseRange({ from: "1900-01-01", to: today }, today).from > "2019-01-01").toBe(true);
    expect(parseRange({ from: "2025-12-20", to: "2026-01-05" }, today).label).toBe("20 Dec 2025 – 5 Jan 2026");
  });

  it("falls back to the default for anything it can't read", () => {
    expect(parseRange({}, today).preset).toBe("30d");
    expect(parseRange({ range: "nonsense" }, today).preset).toBe("30d");
    expect(parseRange({ from: "yesterday" }, today, "month").preset).toBe("month");
    expect(parseRange({ range: "year" }, today).preset).toBe("year");
  });

  it("finds the period before and the same period a year earlier", () => {
    expect(previousRange(presetRange("7d", today))).toMatchObject({ from: "2026-11-05", to: "2026-11-11" });
    expect(previousRange(presetRange("today", today))).toMatchObject({ from: "2026-11-17", to: "2026-11-17" });
    expect(yearBefore(presetRange("last-month", today))).toMatchObject({ from: "2025-10-01", to: "2025-10-31" });
  });
});

describe("totals", () => {
  const orders = [
    order({ at: "2026-11-10T10:00:00Z", total: 100000, shippingOre: 9900, discountOre: 5000, discountCode: "welcome", items: [{ name: "Wrap Skirt", quantity: 2, unitPriceOre: 47550 }] }),
    order({ at: "2026-11-11T10:00:00Z", total: 50000, status: "shipped", paymentProvider: "vipps" }),
    order({ at: "2026-11-12T10:00:00Z", total: 30000, status: "refunded" }),
    order({ at: "2026-11-12T11:00:00Z", total: 70000, status: "cancelled" }),
    order({ at: "2026-11-13T10:00:00Z", total: 0, manual: "pr", status: "shipped" }),
    order({ at: "2026-11-14T10:00:00Z", total: 20000, status: "returned" }),
  ];

  it("counts what was paid, takes refunds off, and ignores cancelled orders and gifts", () => {
    const s = summarise(orders);
    expect(s.orders).toBe(4);
    expect(s.refundedOrders).toBe(1);
    expect(s.grossOre).toBe(200000);
    expect(s.refundsOre).toBe(30000);
    expect(s.netOre).toBe(170000);
    expect(s.vatOre).toBe(34000);
    expect(s.exVatOre).toBe(136000);
    expect(s.shippingOre).toBe(9900);
    expect(s.discountOre).toBe(5000);
    expect(s.units).toBe(4);
    expect(s.averageOre).toBe(Math.round(170000 / 3));
  });

  it("is all zeros for nothing, without dividing by it", () => {
    expect(summarise([])).toMatchObject({ orders: 0, netOre: 0, averageOre: 0 });
    expect(summarise([order({ at: "2026-11-12T10:00:00Z", status: "refunded", total: 5000 })])).toMatchObject({ orders: 1, netOre: 0, averageOre: 0 });
  });

  it("survives documents with holes in them", () => {
    const s = summarise([{ _id: "x", orderedAt: "2026-11-10T10:00:00Z" }, { _id: "y" }, { _id: "z", orderedAt: "2026-11-10T10:00:00Z", totalOre: null, items: [{ quantity: null }] }]);
    expect(s).toMatchObject({ orders: 2, grossOre: 0, units: 0 });
  });

  it("keeps the two sides of the ledger equal", () => {
    const s = summarise(orders);
    expect(s.grossOre - s.refundsOre).toBe(s.netOre);
    expect(s.exVatOre + s.vatOre).toBe(s.netOre);
  });

  it("gives a percent change, or nothing when there is no before", () => {
    expect(change(150, 100)).toBe(50);
    expect(change(50, 100)).toBe(-50);
    expect(change(100, 0)).toBeNull();
  });
});

describe("series", () => {
  const orders = [
    order({ at: "2026-10-31T23:30:00Z", total: 10000 }), // 1 Nov in Oslo
    order({ at: "2026-11-01T12:00:00Z", total: 20000 }),
    order({ at: "2026-11-03T12:00:00Z", total: 40000, status: "refunded" }),
    order({ at: "2026-11-03T13:00:00Z", total: 5000 }),
    order({ at: "2025-11-02T12:00:00Z", total: 7000 }),
    order({ at: "2026-01-15T12:00:00Z", total: 3000 }),
  ];

  it("fills every day of the period, quiet ones too", () => {
    const days = byDay(orders, { from: "2026-11-01", to: "2026-11-04" });
    expect(days.map((d) => d.key)).toEqual(["2026-11-01", "2026-11-02", "2026-11-03", "2026-11-04"]);
    expect(days.map((d) => d.netOre)).toEqual([30000, 0, 5000, 0]);
    expect(days.map((d) => d.orders)).toEqual([2, 0, 2, 0]);
  });

  it("groups by month and by year, and lines the months of a year up for comparison", () => {
    expect(byMonth(orders, { from: "2026-10-15", to: "2026-11-30" }).map((m) => [m.key, m.netOre])).toEqual([["2026-10", 0], ["2026-11", 35000]]);
    const y26 = monthsOfYear(orders, 2026);
    const y25 = monthsOfYear(orders, 2025);
    expect(y26).toHaveLength(12);
    expect(y26[0].netOre).toBe(3000);
    expect(y26[10].netOre).toBe(35000);
    expect(y25[10].netOre).toBe(7000);
    expect(byYear(orders, 2026).map((y) => [y.key, y.netOre])).toEqual([["2025", 7000], ["2026", 38000]]);
    expect(byYear([], 2026)).toEqual([{ key: "2026", label: "2026", netOre: 0, orders: 0 }]);
  });

  it("adds a month up day by day, stopping at today", () => {
    expect(cumulativeByDay(orders, "2026-11-01", "2026-11-04")).toEqual([30000, 30000, 35000, 35000]);
    expect(cumulativeByDay(orders, "2026-11-01")).toHaveLength(30);
  });

  it("keeps only the orders of the period, by Oslo day", () => {
    expect(inRange(orders, { from: "2026-11-01", to: "2026-11-01" })).toHaveLength(2);
    expect(inRange(orders, { from: "2026-10-31", to: "2026-10-31" })).toHaveLength(0);
  });
});

describe("breakdowns", () => {
  const orders = [
    order({ at: "2026-11-10T10:00:00Z", total: 90000, discountCode: "welcome", items: [{ name: "Wrap Skirt", quantity: 2, unitPriceOre: 30000 }, { name: "Long Skirt", quantity: 1, unitPriceOre: 30000 }] }),
    order({ at: "2026-11-11T10:00:00Z", total: 30000, paymentProvider: "vipps", discountCode: "WELCOME ", items: [{ name: "Wrap Skirt", quantity: 1, unitPriceOre: 30000 }] }),
    order({ at: "2026-11-12T10:00:00Z", total: 30000, status: "refunded", items: [{ name: "Long Skirt", quantity: 1, unitPriceOre: 30000 }] }),
    order({ at: "2026-11-12T10:00:00Z", total: 12000, manual: "sale", paymentProvider: "other", items: [{ name: "Wrap Skirt", quantity: 1, unitPriceOre: 12000 }] }),
  ];

  it("ranks products by what they brought in, leaving refunded orders out", () => {
    expect(byProduct(orders)).toEqual([
      { name: "Wrap Skirt", units: 4, salesOre: 102000, orders: 3 },
      { name: "Long Skirt", units: 1, salesOre: 30000, orders: 1 },
    ]);
  });

  it("splits sales by how they were paid and by discount code", () => {
    expect(byPayment(orders)).toEqual([
      { name: "Card (Stripe)", orders: 1, netOre: 90000 },
      { name: "Vipps", orders: 1, netOre: 30000 },
      { name: "Outside the shop", orders: 1, netOre: 12000 },
    ]);
    expect(byDiscountCode(orders)).toEqual([{ name: "WELCOME", orders: 2, netOre: 120000 }]);
    expect(byPayment(orders).reduce((t, s) => t + s.netOre, 0)).toBe(summarise(orders).netOre);
  });
});

describe("exports", () => {
  it("writes money the way Norwegian Excel reads it", () => {
    expect(csvMoney(123450)).toBe("1234,50");
    expect(csvMoney(5)).toBe("0,05");
    expect(csvMoney(undefined)).toBe("0,00");
    expect(csvMoney(-2500)).toBe("-25,00");
  });

  it("quotes what needs quoting and disarms formulas", () => {
    const csv = toCsv([["a;b", 'say "hi"', "=SUM(A1)", "-25,00", "-cmd", "line\nbreak", null, 3]]);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv.slice(1)).toBe('"a;b";"say ""hi""";\'=SUM(A1);-25,00;\'-cmd;line break;;3\r\n');
  });

  const orders = [
    order({ at: "2026-11-10T10:00:00Z", orderNumber: "FL-A", total: 100000, customer: { name: "Ola Nordmann", email: "ola@example.no", address: "Storgata 1\n0155 Oslo" }, items: [{ name: "Wrap Skirt", quantity: 2, unitPriceOre: 50000, size: "M" }] }),
    order({ at: "2026-11-09T10:00:00Z", orderNumber: "FL-B", total: 30000, status: "refunded" }),
    order({ at: "2026-11-11T10:00:00Z", orderNumber: "FL-C", total: 70000, status: "cancelled" }),
  ];

  it("lists every order oldest first with the accounting columns", () => {
    const lines = ordersCsv(orders).slice(1).trimEnd().split("\r\n");
    expect(lines).toHaveLength(4);
    expect(lines[0].split(";")).toHaveLength(20);
    expect(lines[1].startsWith("2026-11-09;11:00;FL-B;Refunded;yes")).toBe(true);
    expect(lines[1].split(";")[17]).toBe("300,00");
    expect(lines[2]).toContain("Ola Nordmann;ola@example.no;Storgata 1 0155 Oslo;2 x Wrap Skirt (M);2;");
    expect(lines[2].split(";").slice(14, 18)).toEqual(["1000,00", "200,00", "800,00", "0,00"]);
    expect(lines[3]).toContain("FL-C;Cancelled;no");
  });

  it("lists every order line", () => {
    const lines = linesCsv(orders).slice(1).trimEnd().split("\r\n");
    expect(lines).toHaveLength(4);
    expect(lines[2]).toBe("2026-11-10;FL-A;Processing;Wrap Skirt;M;2;500,00;1000,00");
  });

  it("sums a period per day or month with a total that matches the tiles", () => {
    const range = { from: "2026-11-01", to: "2026-11-30" };
    const perDay = summaryCsv(orders, range, "day").slice(1).trimEnd().split("\r\n");
    expect(perDay.map((l) => l.split(";")[0])).toEqual(["Date", "2026-11-09", "2026-11-10", "Total"]);
    const total = perDay[3].split(";");
    const s = summarise(inRange(orders, range));
    expect(total.slice(1)).toEqual([String(s.orders), String(s.units), csvMoney(s.grossOre), csvMoney(s.refundsOre), csvMoney(s.netOre), csvMoney(s.vatOre), csvMoney(s.exVatOre), csvMoney(s.shippingOre), csvMoney(s.discountOre)]);
    expect(summaryCsv(orders, range, "month").slice(1).trimEnd().split("\r\n").map((l) => l.split(";")[0])).toEqual(["Month", "2026-11", "Total"]);
  });
});
