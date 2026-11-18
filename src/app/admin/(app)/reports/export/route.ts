import { auth, isAdminEmail } from "@/auth";
import { loadReportOrders } from "@/lib/admin/report-data";
import { dayKey, inRange, linesCsv, ordersCsv, parseRange, summaryCsv } from "@/lib/admin/reports";

/*
 * The accounting exports, as CSV files Excel opens by double-click. Admins only; the period is the
 * same `range` / `from` / `to` the Reports page was showing, so what downloads is what was on
 * screen. Built from the same orders and the same arithmetic as the page (lib/admin/reports.ts).
 *
 *   ?type=orders   one row per order, every order in the period
 *   ?type=lines    one row per order line
 *   ?type=days     one row per day with sales, VAT, refunds
 *   ?type=months   one row per month, the same columns
 */
const TYPES = ["orders", "lines", "days", "months"] as const;
type ExportType = (typeof TYPES)[number];

export async function GET(request: Request) {
  const session = await auth();
  if (!isAdminEmail(session?.user?.email)) return new Response("Sign in to the dashboard first.", { status: 401 });

  const url = new URL(request.url);
  const type = TYPES.find((t) => t === url.searchParams.get("type")) as ExportType | undefined;
  if (!type) return new Response("Unknown export. Use type=orders, lines, days or months.", { status: 400 });
  const range = parseRange({ range: url.searchParams.get("range") ?? undefined, from: url.searchParams.get("from") ?? undefined, to: url.searchParams.get("to") ?? undefined }, dayKey(new Date()), "month");

  const { orders } = await loadReportOrders({ sample: url.searchParams.get("sample") === "1" });
  const inPeriod = inRange(orders, range);
  const csv = type === "orders" ? ordersCsv(inPeriod) : type === "lines" ? linesCsv(inPeriod) : summaryCsv(orders, range, type === "days" ? "day" : "month");
  const name = `flora-${type}-${range.from}${range.to === range.from ? "" : `_${range.to}`}.csv`;
  return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${name}"`, "Cache-Control": "no-store, max-age=0" } });
}
