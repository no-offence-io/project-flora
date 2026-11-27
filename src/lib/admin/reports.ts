/*
 * The shop's sales figures, worked out from the order documents. Everything here is pure: orders
 * in, numbers out, no database and no clock of its own, so the dashboard's tiles, its graphs and
 * the accounting exports all read the same tested arithmetic.
 *
 * The rules, in one place:
 *   - Days are Oslo days. An order placed at 00:30 on the 1st in Oslo belongs to the 1st, even
 *     though its timestamp (UTC) still says the day before.
 *   - A sale is an order that was paid: processing, shipped, completed, returned or refunded.
 *     Cancelled orders and PR gifts are not sales and appear nowhere in the totals.
 *   - Gross is everything paid. Refunds are the orders marked refunded, at their full total, and
 *     are booked on the day the order was placed (the order document keeps no refund date).
 *     Net = gross - refunds; VAT, shipping and discounts are reported on the net side as well.
 *   - Amounts are integer øre throughout, as everywhere else. Prices include VAT; each order
 *     stores the VAT inside its total, and "ex VAT" is total minus that.
 */

import { variantLabel } from "../variant";

export const TIME_ZONE = "Europe/Oslo";

export type ReportOrder = {
  _id: string;
  orderNumber?: string | null;
  status?: string | null;
  orderedAt?: string | null;
  manual?: string | null;
  demo?: boolean | null;
  totalOre?: number | null;
  subtotalOre?: number | null;
  discountOre?: number | null;
  discountCode?: string | null;
  shippingOre?: number | null;
  vatIncludedOre?: number | null;
  paymentProvider?: string | null;
  paymentReference?: string | null;
  customer?: { name?: string | null; email?: string | null; address?: string | null } | null;
  items?: { name?: string | null; quantity?: number | null; unitPriceOre?: number | null; size?: string | null; colour?: string | null }[] | null;
};

/* ---- days ------------------------------------------------------------------------------------ */

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const dayFormat = new Intl.DateTimeFormat("sv-SE", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" });

/** The Oslo calendar day ("2026-11-18") an instant falls on. */
export function dayKey(at: string | Date): string {
  return dayFormat.format(typeof at === "string" ? new Date(at) : at);
}

export const isDay = (s: unknown): s is string => typeof s === "string" && DAY.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) && new Date(`${s}T00:00:00Z`).toISOString().slice(0, 10) === s;

/** Calendar arithmetic on day keys, done in UTC so daylight saving never shifts a date. */
export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export function addMonths(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1 + n, 1));
  const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  return `${first.getUTCFullYear()}-${String(first.getUTCMonth() + 1).padStart(2, "0")}-${String(Math.min(d, last)).padStart(2, "0")}`;
}
export const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000) + 1;
const monthStart = (day: string) => `${day.slice(0, 8)}01`;
const monthEnd = (day: string) => addDays(addMonths(monthStart(day), 1), -1);
const yearStart = (day: string) => `${day.slice(0, 4)}-01-01`;
const yearEnd = (day: string) => `${day.slice(0, 4)}-12-31`;

/* ---- ranges ---------------------------------------------------------------------------------- */

export const PRESETS = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "month", label: "This month" },
  { key: "last-month", label: "Last month" },
  { key: "year", label: "This year" },
  { key: "last-year", label: "Last year" },
] as const;
export type PresetKey = (typeof PRESETS)[number]["key"];

/** A period of whole Oslo days, both ends included. `preset` is "custom" for hand-picked dates, "all" for no limit. */
export type Range = { from: string; to: string; preset: PresetKey | "custom" | "all"; label: string };

/** "All time", for the lists: every order, customer or sign-up there is. Graphs don't offer it. */
export const ALL_TIME = "all";
const ALL_TIME_FROM = "2000-01-01";
export const allTime = (today: string): Range => ({ from: ALL_TIME_FROM, to: today, preset: "all", label: "All time" });

const MAX_DAYS = 366 * 6;
const human = (day: string, withYear = true) => new Date(`${day}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", ...(withYear ? { year: "numeric" } : {}), timeZone: "UTC" });

export function rangeLabel(from: string, to: string): string {
  if (from === to) return human(from);
  return `${human(from, from.slice(0, 4) !== to.slice(0, 4))} – ${human(to)}`;
}

export function presetRange(key: PresetKey, today: string): Range {
  const label = PRESETS.find((p) => p.key === key)!.label;
  const make = (from: string, to: string): Range => ({ from, to, preset: key, label });
  switch (key) {
    case "today":
      return make(today, today);
    case "yesterday":
      return make(addDays(today, -1), addDays(today, -1));
    case "7d":
      return make(addDays(today, -6), today);
    case "30d":
      return make(addDays(today, -29), today);
    case "month":
      return make(monthStart(today), today);
    case "last-month": {
      const inside = addMonths(monthStart(today), -1);
      return make(inside, monthEnd(inside));
    }
    case "year":
      return make(yearStart(today), today);
    case "last-year": {
      const inside = addMonths(yearStart(today), -12);
      return make(inside, yearEnd(inside));
    }
  }
}

/**
 * The period a page was asked for: `?range=<preset>`, or `?from=YYYY-MM-DD&to=YYYY-MM-DD` (a single
 * `from` is that one day). Anything unreadable falls back to `fallback`; dates given backwards are
 * swapped, the future is cut off at today, and the span is capped so a typo can't ask for a century.
 */
export function parseRange(params: { range?: string; from?: string; to?: string }, today: string, fallback: PresetKey | "all" = "30d"): Range {
  if (isDay(params.from)) {
    let from = params.from;
    let to = isDay(params.to) ? params.to : params.from;
    if (from > to) [from, to] = [to, from];
    if (to > today) to = today;
    if (from > to) from = to;
    if (daysBetween(from, to) > MAX_DAYS) from = addDays(to, -(MAX_DAYS - 1));
    return { from, to, preset: "custom", label: rangeLabel(from, to) };
  }
  // "All time" only where the page offers it, which is where it is the starting point.
  if (fallback === ALL_TIME && (params.range === ALL_TIME || !PRESETS.some((p) => p.key === params.range))) return allTime(today);
  const preset = PRESETS.find((p) => p.key === params.range)?.key ?? (fallback === ALL_TIME ? "30d" : fallback);
  return presetRange(preset, today);
}

/** What goes in an address to ask for this period again. */
export const rangeParams = (range: Range): [string, string][] => (range.preset === "custom" ? [["from", range.from], ["to", range.to]] : [["range", range.preset]]);

/**
 * The instant an Oslo day begins, for asking a service that thinks in instants (Stripe, a database)
 * for "this day". Oslo is one or two hours ahead of UTC depending on the season; the right one is
 * whichever makes the clock there read midnight.
 */
const clock = new Intl.DateTimeFormat("sv-SE", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
export function startOfDay(day: string): Date {
  const utcMidnight = Date.parse(`${day}T00:00:00Z`);
  for (const hoursAhead of [1, 2]) {
    const at = new Date(utcMidnight - hoursAhead * 3_600_000);
    if (clock.format(at) === `${day} 00:00`) return at;
  }
  return new Date(utcMidnight - 3_600_000);
}
/** A period as two instants: from the start of its first day up to, not including, the start of the day after its last. */
export const instantsOf = (range: { from: string; to: string }) => ({ from: startOfDay(range.from), before: startOfDay(addDays(range.to, 1)) });

/** The same number of days immediately before the period: what "+12 % vs. before" compares with. */
export function previousRange(range: Range): Range {
  const days = daysBetween(range.from, range.to);
  const to = addDays(range.from, -1);
  const from = addDays(to, -(days - 1));
  return { from, to, preset: "custom", label: rangeLabel(from, to) };
}

/** The same dates one year earlier. */
export function yearBefore(range: Range): Range {
  const from = addMonths(range.from, -12);
  const to = addMonths(range.to, -12);
  return { from, to, preset: "custom", label: rangeLabel(from, to) };
}

/* ---- which orders count ---------------------------------------------------------------------- */

const SALE_STATUSES = new Set(["paid", "shipped", "delivered", "returned", "refunded"]);
const statusOf = (o: ReportOrder) => o.status ?? "paid";

/** Paid for at some point: everything except cancelled orders and PR gifts. */
export const isSale = (o: ReportOrder) => o.manual !== "pr" && SALE_STATUSES.has(statusOf(o)) && Boolean(o.orderedAt);
export const isRefunded = (o: ReportOrder) => statusOf(o) === "refunded";

/* ---- where a sale came from ------------------------------------------------------------------ */

/**
 * The dashboard holds three kinds of order: the shop's own, the ones brought in from the same
 * Stripe account (the earlier shop's), and the ones added by hand. They are added up together by
 * default; this is the choice to look at one kind alone.
 */
export const SOURCES = [
  { key: "all", label: "Everything" },
  { key: "shop", label: "This shop" },
  { key: "stripe", label: "Other Stripe sales" },
  { key: "hand", label: "Added by hand" },
] as const;
export type SourceKey = (typeof SOURCES)[number]["key"];
export const parseSource = (value: string | null | undefined): SourceKey => SOURCES.find((s) => s.key === value)?.key ?? "all";
export const sourceOf = (o: { manual?: string | null }): Exclude<SourceKey, "all"> => (o.manual === "import" ? "stripe" : o.manual ? "hand" : "shop");
export function bySource<T extends { manual?: string | null }>(orders: T[], source: SourceKey): T[] {
  return source === "all" ? orders : orders.filter((o) => sourceOf(o) === source);
}
/** The same choice as a database filter. */
export const SOURCE_FILTER: Record<SourceKey, string | null> = { all: null, shop: "!defined(manual)", stripe: `manual == "import"`, hand: `defined(manual) && manual != "import"` };

export function inRange(orders: ReportOrder[], range: { from: string; to: string }): ReportOrder[] {
  return orders.filter((o) => {
    if (!o.orderedAt) return false;
    const day = dayKey(o.orderedAt);
    return day >= range.from && day <= range.to;
  });
}

/* ---- totals ---------------------------------------------------------------------------------- */

export type Summary = {
  /** Orders that were paid, refunded ones included. */
  orders: number;
  refundedOrders: number;
  /** Everything paid, VAT included. */
  grossOre: number;
  refundsOre: number;
  /** Gross minus refunds: what the shop kept, VAT included. */
  netOre: number;
  /** VAT inside the net amount, and the net amount without it. */
  vatOre: number;
  exVatOre: number;
  /** Shipping charged and discounts given, on orders that were not refunded. */
  shippingOre: number;
  discountOre: number;
  /** Pieces sold on orders that were not refunded. */
  units: number;
  /** Net divided by the orders kept. */
  averageOre: number;
};

const n = (v: number | null | undefined) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
const unitsOf = (o: ReportOrder) => (o.items ?? []).reduce((t, i) => t + Math.max(0, n(i.quantity)), 0);

export function summarise(orders: ReportOrder[]): Summary {
  const s: Summary = { orders: 0, refundedOrders: 0, grossOre: 0, refundsOre: 0, netOre: 0, vatOre: 0, exVatOre: 0, shippingOre: 0, discountOre: 0, units: 0, averageOre: 0 };
  for (const o of orders) {
    if (!isSale(o)) continue;
    s.orders += 1;
    s.grossOre += n(o.totalOre);
    if (isRefunded(o)) {
      s.refundedOrders += 1;
      s.refundsOre += n(o.totalOre);
      continue;
    }
    s.vatOre += n(o.vatIncludedOre);
    s.shippingOre += n(o.shippingOre);
    s.discountOre += n(o.discountOre);
    s.units += unitsOf(o);
  }
  s.netOre = s.grossOre - s.refundsOre;
  s.exVatOre = s.netOre - s.vatOre;
  const kept = s.orders - s.refundedOrders;
  s.averageOre = kept > 0 ? Math.round(s.netOre / kept) : 0;
  return s;
}

/** Percent change, or null when there was nothing before to compare with. */
export function change(now: number, before: number): number | null {
  if (!before) return null;
  return Math.round(((now - before) / Math.abs(before)) * 100);
}

/* ---- series for the graphs ------------------------------------------------------------------- */

export type Point = { key: string; label: string; netOre: number; orders: number };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function bucket(orders: ReportOrder[], keyOf: (day: string) => string): Map<string, { netOre: number; orders: number }> {
  const map = new Map<string, { netOre: number; orders: number }>();
  for (const o of orders) {
    if (!isSale(o)) continue;
    const key = keyOf(dayKey(o.orderedAt!));
    const cell = map.get(key) ?? { netOre: 0, orders: 0 };
    cell.orders += 1;
    if (!isRefunded(o)) cell.netOre += n(o.totalOre);
    map.set(key, cell);
  }
  return map;
}

/** Net sales for every day of the period, quiet days included, so the graph's width is the calendar. */
export function byDay(orders: ReportOrder[], range: { from: string; to: string }): Point[] {
  const cells = bucket(inRange(orders, range), (day) => day);
  const out: Point[] = [];
  for (let day = range.from; day <= range.to; day = addDays(day, 1)) {
    const c = cells.get(day);
    out.push({ key: day, label: human(day, false), netOre: c?.netOre ?? 0, orders: c?.orders ?? 0 });
  }
  return out;
}

/** Net sales for each calendar month the period touches (whole months of orders inside the period). */
export function byMonth(orders: ReportOrder[], range: { from: string; to: string }): Point[] {
  const cells = bucket(inRange(orders, range), (day) => day.slice(0, 7));
  const out: Point[] = [];
  for (let m = monthStart(range.from); m <= range.to; m = addMonths(m, 1)) {
    const key = m.slice(0, 7);
    const c = cells.get(key);
    out.push({ key, label: `${MONTHS[Number(key.slice(5, 7)) - 1]} ${key.slice(2, 4)}`, netOre: c?.netOre ?? 0, orders: c?.orders ?? 0 });
  }
  return out;
}

/** The twelve months of one year: the row a month-against-month and year-against-year graph is built from. */
export function monthsOfYear(orders: ReportOrder[], year: number): Point[] {
  const cells = bucket(orders, (day) => day.slice(0, 7));
  return MONTHS.map((label, i) => {
    const key = `${year}-${String(i + 1).padStart(2, "0")}`;
    const c = cells.get(key);
    return { key, label, netOre: c?.netOre ?? 0, orders: c?.orders ?? 0 };
  });
}

/** Net sales per calendar year, from the first year with a sale to `thisYear`. */
export function byYear(orders: ReportOrder[], thisYear: number): Point[] {
  const cells = bucket(orders, (day) => day.slice(0, 4));
  const first = Math.min(thisYear, ...[...cells.keys()].map(Number));
  const out: Point[] = [];
  for (let y = first; y <= thisYear; y++) {
    const c = cells.get(String(y));
    out.push({ key: String(y), label: String(y), netOre: c?.netOre ?? 0, orders: c?.orders ?? 0 });
  }
  return out;
}

/** Running total through a month, one point per day: how this month is going against the last one. */
export function cumulativeByDay(orders: ReportOrder[], monthFirstDay: string, upTo?: string): number[] {
  const end = monthEnd(monthFirstDay);
  const days = byDay(orders, { from: monthFirstDay, to: end });
  const out: number[] = [];
  let total = 0;
  for (const d of days) {
    if (upTo && d.key > upTo) break;
    total += d.netOre;
    out.push(total);
  }
  return out;
}

/* ---- breakdowns ------------------------------------------------------------------------------ */

export type ProductLine = { name: string; units: number; salesOre: number; orders: number };

/** What sold, by product name: pieces, the list-price value of those pieces, and how many orders held it. Refunded orders are left out. */
export function byProduct(orders: ReportOrder[]): ProductLine[] {
  const map = new Map<string, ProductLine>();
  for (const o of orders) {
    if (!isSale(o) || isRefunded(o)) continue;
    const seen = new Set<string>();
    for (const item of o.items ?? []) {
      const name = (item.name ?? "").trim() || "Unnamed";
      const line = map.get(name) ?? { name, units: 0, salesOre: 0, orders: 0 };
      const qty = Math.max(0, n(item.quantity));
      line.units += qty;
      line.salesOre += qty * n(item.unitPriceOre);
      if (!seen.has(name)) {
        line.orders += 1;
        seen.add(name);
      }
      map.set(name, line);
    }
  }
  return [...map.values()].sort((a, b) => b.salesOre - a.salesOre || b.units - a.units || a.name.localeCompare(b.name));
}

export type Slice = { name: string; orders: number; netOre: number };

const PROVIDER_NAMES: Record<string, string> = { stripe: "Card (Stripe)", vipps: "Vipps", klarna: "Klarna", other: "Outside the shop" };
export const providerName = (o: ReportOrder) => (o.manual && (!o.paymentProvider || o.paymentProvider === "other") ? "Outside the shop" : (PROVIDER_NAMES[o.paymentProvider ?? "stripe"] ?? o.paymentProvider ?? "Card (Stripe)"));

function slices(orders: ReportOrder[], nameOf: (o: ReportOrder) => string | null): Slice[] {
  const map = new Map<string, Slice>();
  for (const o of orders) {
    if (!isSale(o) || isRefunded(o)) continue;
    const name = nameOf(o);
    if (!name) continue;
    const s = map.get(name) ?? { name, orders: 0, netOre: 0 };
    s.orders += 1;
    s.netOre += n(o.totalOre);
    map.set(name, s);
  }
  return [...map.values()].sort((a, b) => b.netOre - a.netOre || a.name.localeCompare(b.name));
}

/** Net sales by how the customer paid: what to reconcile against each provider's payouts. */
export const byPayment = (orders: ReportOrder[]) => slices(orders, providerName);
/** Orders and net sales per discount code used. */
export const byDiscountCode = (orders: ReportOrder[]) => slices(orders, (o) => o.discountCode?.trim().toUpperCase() || null);

/* ---- exports for the accountant -------------------------------------------------------------- */

/** "1234,50": kroner with a decimal comma and no thousands separator, which Norwegian Excel reads as a number. */
export const csvMoney = (ore: number | null | undefined) => (n(ore) / 100).toFixed(2).replace(".", ",");

/**
 * Semicolon-separated with a byte-order mark: opens correctly by double-click in Excel with Norwegian
 * settings, æøå intact. Cells that start with = + - @ get a leading apostrophe so a customer's name can
 * never run as a formula; amounts written by csvMoney are left alone.
 */
export function toCsv(rows: (string | number | null | undefined)[][]): string {
  const cell = (v: string | number | null | undefined) => {
    if (v === null || v === undefined) return "";
    if (typeof v === "number") return String(v);
    let s = v.replace(/\r?\n/g, " ").trim();
    if (/^[=+@]/.test(s) || (/^-/.test(s) && !/^-?\d+(,\d+)?$/.test(s))) s = `'${s}`;
    return /[";]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return `﻿${rows.map((r) => r.map(cell).join(";")).join("\r\n")}\r\n`;
}

const STATUS_NAMES: Record<string, string> = { paid: "Processing", shipped: "Shipped", delivered: "Completed", returned: "Returned", refunded: "Refunded", cancelled: "Cancelled" };
const dateTime = new Intl.DateTimeFormat("sv-SE", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });

/** One row per order, every order in the period (cancelled and PR ones too, marked as such), oldest first. */
export function ordersCsv(orders: ReportOrder[]): string {
  const rows: (string | number)[][] = [["Date", "Time", "Order", "Status", "Counts as sale", "Customer", "Email", "Address", "Items", "Pieces", "Subtotal", "Discount", "Discount code", "Shipping", "Total incl. VAT", "Of which VAT", "Total ex. VAT", "Refunded", "Paid with", "Payment reference"]];
  for (const o of [...orders].sort((a, b) => (a.orderedAt ?? "").localeCompare(b.orderedAt ?? ""))) {
    const [date, time] = o.orderedAt ? dateTime.format(new Date(o.orderedAt)).split(" ") : ["", ""];
    const sale = isSale(o);
    rows.push([
      date,
      time,
      o.orderNumber ?? o._id,
      o.manual === "pr" ? "PR / gift" : (STATUS_NAMES[statusOf(o)] ?? statusOf(o)),
      sale ? "yes" : "no",
      o.customer?.name ?? "",
      o.customer?.email ?? "",
      o.customer?.address ?? "",
      (o.items ?? []).map((i) => `${n(i.quantity)} x ${i.name ?? ""}${variantLabel(i) ? ` (${variantLabel(i)})` : ""}`).join(", "),
      unitsOf(o),
      csvMoney(o.subtotalOre),
      csvMoney(o.discountOre),
      o.discountCode ?? "",
      csvMoney(o.shippingOre),
      csvMoney(o.totalOre),
      csvMoney(o.vatIncludedOre),
      csvMoney(n(o.totalOre) - n(o.vatIncludedOre)),
      csvMoney(sale && isRefunded(o) ? o.totalOre : 0),
      providerName(o),
      o.paymentReference ?? "",
    ]);
  }
  return toCsv(rows);
}

/** One row per order line: what the stock and the product accounts are booked from. */
export function linesCsv(orders: ReportOrder[]): string {
  const rows: (string | number)[][] = [["Date", "Order", "Status", "Product", "Size", "Quantity", "Unit price incl. VAT", "Line total incl. VAT"]];
  for (const o of [...orders].sort((a, b) => (a.orderedAt ?? "").localeCompare(b.orderedAt ?? ""))) {
    for (const i of o.items ?? []) {
      rows.push([o.orderedAt ? dayKey(o.orderedAt) : "", o.orderNumber ?? o._id, o.manual === "pr" ? "PR / gift" : (STATUS_NAMES[statusOf(o)] ?? statusOf(o)), i.name ?? "", i.size ?? "", n(i.quantity), csvMoney(i.unitPriceOre), csvMoney(n(i.quantity) * n(i.unitPriceOre))]);
    }
  }
  return toCsv(rows);
}

/** One row per period (day or month) with the figures a ledger wants, and a total row. Days without a sale are left out. */
export function summaryCsv(orders: ReportOrder[], range: { from: string; to: string }, per: "day" | "month"): string {
  const keyOf = (day: string) => (per === "day" ? day : day.slice(0, 7));
  const groups = new Map<string, ReportOrder[]>();
  for (const o of inRange(orders, range)) {
    if (!isSale(o)) continue;
    const key = keyOf(dayKey(o.orderedAt!));
    groups.set(key, [...(groups.get(key) ?? []), o]);
  }
  const line = (label: string, s: Summary) => [label, s.orders, s.units, csvMoney(s.grossOre), csvMoney(s.refundsOre), csvMoney(s.netOre), csvMoney(s.vatOre), csvMoney(s.exVatOre), csvMoney(s.shippingOre), csvMoney(s.discountOre)];
  const rows: (string | number)[][] = [[per === "day" ? "Date" : "Month", "Orders", "Pieces", "Gross sales incl. VAT", "Refunds", "Net sales incl. VAT", "Of which VAT", "Net sales ex. VAT", "Of which shipping", "Discounts given"]];
  for (const key of [...groups.keys()].sort()) rows.push(line(key, summarise(groups.get(key)!)));
  rows.push(line("Total", summarise(inRange(orders, range))));
  return toCsv(rows);
}
