import { Bars, Delta, formatValue, Lines } from "@/components/admin/charts";
import RangePicker from "@/components/admin/range-picker";
import { Card, Heading, Muted, Subheading, TextLink } from "@/components/admin/ui";
import { loadReportOrders } from "@/lib/admin/report-data";
import { addMonths, byDay, byDiscountCode, byMonth, byPayment, byProduct, byYear, change, cumulativeByDay, dayKey, daysBetween, inRange, monthsOfYear, parseRange, previousRange, summarise, yearBefore, type Summary } from "@/lib/admin/reports";
import { kr } from "@/lib/admin/sanity";

export const metadata = { title: "Reports – Flöra Admin" };

const whole = new Intl.NumberFormat("nb-NO");
const monthName = (first: string) => new Date(`${first}T12:00:00Z`).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });

/**
 * Sales, for any day or period: the figures, how they compare with before and with last year, the
 * graphs (this period, month against month, year against year), what sold and how it was paid, and
 * the files for the accounts. Everything on the page comes from the paid orders; nothing is typed in.
 */
export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ range?: string; from?: string; to?: string; sample?: string }> }) {
  const params = await searchParams;
  const today = dayKey(new Date());
  const range = parseRange(params, today, "month");
  const { orders, capped, demo, sample } = await loadReportOrders({ sample: params.sample === "1" });
  const keep = { sample: sample ? "1" : undefined };

  const before = previousRange(range);
  const lastYear = yearBefore(range);
  const now = summarise(inRange(orders, range));
  const prev = summarise(inRange(orders, before));
  const year = summarise(inRange(orders, lastYear));

  // This period, day by day while that is readable, month by month beyond two months.
  const days = daysBetween(range.from, range.to);
  const daily = days <= 62;
  const current = daily ? byDay(orders, range) : byMonth(orders, range);
  const compare = daily ? byDay(orders, before) : byMonth(orders, lastYear);

  // Month against month: the year the period ends in, beside the year before.
  const thisYear = Number(range.to.slice(0, 4));
  const monthsNow = monthsOfYear(orders, thisYear);
  const monthsBefore = monthsOfYear(orders, thisYear - 1);
  const lastMonthShown = range.to.slice(0, 7) === today.slice(0, 7) ? Number(today.slice(5, 7)) : 12;

  // The month the period ends in against the month before it, as running totals.
  const monthFirst = `${range.to.slice(0, 8)}01`;
  const monthBeforeFirst = addMonths(monthFirst, -1);
  const running = cumulativeByDay(orders, monthFirst, monthFirst.slice(0, 7) === today.slice(0, 7) ? today : undefined);
  const runningBefore = cumulativeByDay(orders, monthBeforeFirst);

  const years = byYear(orders, Number(today.slice(0, 4)));
  const inPeriod = inRange(orders, range);
  const products = byProduct(inPeriod);
  const payments = byPayment(inPeriod);
  const codes = byDiscountCode(inPeriod);

  const query = new URLSearchParams(range.preset === "custom" ? { from: range.from, to: range.to } : { range: range.preset });
  if (sample) query.set("sample", "1");
  const exportHref = (type: string) => `/admin/reports/export?type=${type}&${query.toString()}`;

  return (
    <>
      <div className="flex flex-col gap-[12px]">
        <Heading>Reports</Heading>
        <Muted>Sales for any day or period, compared with before and with last year. Worked out from the paid orders; days are Oslo days.</Muted>
        {sample && <p className="m-0 border-[0.5px] border-black px-[12px] py-[8px] font-gotham text-[11px] leading-normal tracking-[0.2em] uppercase text-black">Sample data — made-up orders, development only.</p>}
        {demo && !sample && <Muted className="text-[11px]">Test mode is on, so the made-up test orders are counted here. Switch it off in the menu for the real figures.</Muted>}
        {capped && <p className="m-0 font-gotham text-paragraph text-[#b00020]" role="alert">There are more orders than this page reads at once, so the oldest are missing from the totals. Tell Martin.</p>}
      </div>

      <RangePicker path="/admin/reports" range={range} today={today} keep={keep} />

      <dl className="m-0 grid grid-cols-2 gap-[12px] font-gotham text-paragraph text-black md:grid-cols-4 md:gap-[24px]">
        <Tile label="Net sales" value={kr(now.netOre)} now={now.netOre} prev={prev.netOre} year={year.netOre} />
        <Tile label="Orders" value={whole.format(now.orders)} now={now.orders} prev={prev.orders} year={year.orders} />
        <Tile label="Average order" value={kr(now.averageOre)} now={now.averageOre} prev={prev.averageOre} year={year.averageOre} />
        <Tile label="Pieces sold" value={whole.format(now.units)} now={now.units} prev={prev.units} year={year.units} />
      </dl>

      <Card>
        <div className="flex flex-wrap items-baseline justify-between gap-[12px]">
          <Subheading>{daily ? "Sales per day" : "Sales per month"}</Subheading>
          <Muted className="text-[11px]">{range.label}</Muted>
        </div>
        <div className="h-px w-full bg-black/25" />
        <Bars
          label={`Net sales ${daily ? "per day" : "per month"}, ${range.label}`}
          unit="money"
          labels={current.map((p) => p.label)}
          details={current.map((p, i) => (daily ? `${p.label} (before: ${compare[i]?.label ?? "–"})` : p.label))}
          labelRoom={daily ? 7 : 12}
          series={[
            { name: daily ? `The ${days === 1 ? "day" : `${days} days`} before` : "Same months a year earlier", tone: "ghost", values: current.map((_, i) => compare[i]?.netOre ?? 0) },
            { name: "This period", tone: "ink", values: current.map((p) => p.netOre) },
          ]}
        />
      </Card>

      <div className="grid gap-[42px] md:grid-cols-2">
        <Card>
          <Subheading>The figures</Subheading>
          <div className="h-px w-full bg-black/25" />
          <Ledger now={now} prev={prev} year={year} />
          <Muted className="text-[11px]">
            Compared with {before.label} and with {lastYear.label}. Refunds are booked on the day the order was placed.
          </Muted>
        </Card>
        <Card>
          <Subheading>For the accounts</Subheading>
          <div className="h-px w-full bg-black/25" />
          <Muted>Files for {range.label}. They open in Excel and Numbers, with amounts in kroner and VAT in its own column.</Muted>
          <ul className="m-0 flex list-none flex-col p-0 font-gotham text-paragraph text-black">
            {[
              ["orders", "Orders", "One row per order: customer, totals, VAT, payment reference"],
              ["lines", "Order lines", "One row per product on each order"],
              ["days", "Day by day", "Sales, refunds, VAT and shipping per day, with a total"],
              ["months", "Month by month", "The same, per month"],
            ].map(([type, title, detail]) => (
              <li key={type} className="border-t-[0.5px] border-black/20 first:border-t-0">
                <a href={exportHref(type)} download className="flex items-center justify-between gap-[12px] py-[12px] transition-colors hover:bg-[#fafbfc]">
                  <span className="flex min-w-0 flex-col gap-[2px]">
                    <span>{title}</span>
                    <span className="text-[11px] leading-normal text-black/50">{detail}</span>
                  </span>
                  <span className="shrink-0 bg-black px-[10px] py-[5px] text-[11px] leading-normal text-white">Download CSV</span>
                </a>
              </li>
            ))}
          </ul>
          <Muted className="text-[11px]">
            Payouts and fees are the payment providers&apos; own figures: see <TextLink href="/admin/payments">Payments</TextLink> for Stripe, and the Vipps portal for Vipps.
          </Muted>
        </Card>
      </div>

      <Card>
        <div className="flex flex-wrap items-baseline justify-between gap-[12px]">
          <Subheading>Month against month</Subheading>
          <Muted className="text-[11px]">
            {thisYear} beside {thisYear - 1}
          </Muted>
        </div>
        <div className="h-px w-full bg-black/25" />
        <Bars
          label={`Net sales per month, ${thisYear} beside ${thisYear - 1}`}
          unit="money"
          labels={monthsNow.map((m) => m.label)}
          series={[
            { name: String(thisYear - 1), tone: "ghost", values: monthsBefore.map((m) => m.netOre) },
            { name: String(thisYear), tone: "ink", values: monthsNow.map((m) => m.netOre) },
          ]}
        />
        <div className="overflow-x-auto">
          <table className="w-full border-collapse font-gotham text-[11px] text-black md:text-paragraph">
            <thead>
              <tr className="text-left text-[11px] text-black/50">
                <th className="py-[6px] pr-[12px] font-normal">Month</th>
                <th className="py-[6px] pr-[12px] text-right font-normal">{thisYear}</th>
                <th className="py-[6px] pr-[12px] text-right font-normal">{thisYear - 1}</th>
                <th className="py-[6px] text-right font-normal md:pr-[12px]">Year on year</th>
                <th className="hidden py-[6px] text-right font-normal md:table-cell">Month on month</th>
              </tr>
            </thead>
            <tbody>
              {monthsNow.slice(0, lastMonthShown).map((m, i) => {
                const yoy = change(m.netOre, monthsBefore[i].netOre);
                const priorMonth = i === 0 ? monthsBefore[11].netOre : monthsNow[i - 1].netOre;
                const mom = change(m.netOre, priorMonth);
                return (
                  <tr key={m.key} className="border-t-[0.5px] border-black/15">
                    <td className="py-[8px] pr-[12px]">{m.label}</td>
                    <td className="py-[8px] pr-[12px] text-right">{kr(m.netOre)}</td>
                    <td className="py-[8px] pr-[12px] text-right text-black/50">{kr(monthsBefore[i].netOre)}</td>
                    <td className="py-[8px] text-right md:pr-[12px]">{pct(yoy)}</td>
                    <td className="hidden py-[8px] text-right md:table-cell">{pct(mom)}</td>
                  </tr>
                );
              })}
              <tr className="border-t border-black/40">
                <td className="py-[8px] pr-[12px]">{lastMonthShown < 12 ? "So far" : "Year"}</td>
                <td className="py-[8px] pr-[12px] text-right">{kr(total(monthsNow.slice(0, lastMonthShown)))}</td>
                <td className="py-[8px] pr-[12px] text-right text-black/50">{kr(total(monthsBefore.slice(0, lastMonthShown)))}</td>
                <td className="py-[8px] text-right md:pr-[12px]">{pct(change(total(monthsNow.slice(0, lastMonthShown)), total(monthsBefore.slice(0, lastMonthShown))))}</td>
                <td className="hidden md:table-cell" />
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-[42px] md:grid-cols-2">
        <Card>
          <Subheading>{monthName(monthFirst)} against {monthName(monthBeforeFirst)}</Subheading>
          <div className="h-px w-full bg-black/25" />
          <Lines
            label={`Running net sales through ${monthName(monthFirst)} against ${monthName(monthBeforeFirst)}`}
            unit="money"
            steps={31}
            startLabel="1st"
            endLabel="31st"
            series={[
              { name: `${monthName(monthBeforeFirst)}: ${formatValue(runningBefore.at(-1) ?? 0, "money")}`, tone: "ghost", values: runningBefore },
              { name: `${monthName(monthFirst)}: ${formatValue(running.at(-1) ?? 0, "money")}`, tone: "ink", values: running },
            ]}
          />
          <Muted className="text-[11px]">Running total, day by day. Where the black line sits above the grey one, the month is ahead of the last.</Muted>
        </Card>
        <Card>
          <Subheading>Year against year</Subheading>
          <div className="h-px w-full bg-black/25" />
          <Bars label="Net sales per year" unit="money" labels={years.map((y) => y.label)} series={[{ name: "Net sales", tone: "ink", values: years.map((y) => y.netOre) }]} />
          <ul className="m-0 flex list-none flex-col p-0 font-gotham text-paragraph text-black">
            {[...years].reverse().map((y, i, all) => (
              <li key={y.key} className="flex items-baseline justify-between gap-[12px] border-t-[0.5px] border-black/15 py-[8px] first:border-t-0">
                <span>
                  {y.label} <span className="text-[11px] text-black/50">{whole.format(y.orders)} orders</span>
                </span>
                <span className="flex items-baseline gap-[12px]">
                  {all[i + 1] && <span className="text-[11px] text-black/50">{pct(change(y.netOre, all[i + 1].netOre))}</span>}
                  {kr(y.netOre)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card>
        <div className="flex flex-wrap items-baseline justify-between gap-[12px]">
          <Subheading>What sold</Subheading>
          <Muted className="text-[11px]">{range.label}</Muted>
        </div>
        <div className="h-px w-full bg-black/25" />
        {products.length === 0 ? (
          <Muted>Nothing sold in this period.</Muted>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse font-gotham text-paragraph text-black">
              <thead>
                <tr className="text-left text-[11px] text-black/50">
                  <th className="py-[6px] pr-[12px] font-normal">Product</th>
                  <th className="py-[6px] pr-[12px] text-right font-normal">Pieces</th>
                  <th className="py-[6px] pr-[12px] text-right font-normal">Orders</th>
                  <th className="py-[6px] text-right font-normal">Value at list price</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.name} className="border-t-[0.5px] border-black/15">
                    <td className="py-[8px] pr-[12px]">
                      <span className="flex flex-col gap-[4px]">
                        {p.name}
                        <span className="block h-[3px] w-full bg-black/10">
                          <span className="block h-full bg-black" style={{ width: `${(p.salesOre / Math.max(1, products[0].salesOre)) * 100}%` }} />
                        </span>
                      </span>
                    </td>
                    <td className="py-[8px] pr-[12px] text-right align-top">{whole.format(p.units)}</td>
                    <td className="py-[8px] pr-[12px] text-right align-top">{whole.format(p.orders)}</td>
                    <td className="py-[8px] text-right align-top">{kr(p.salesOre)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Muted className="text-[11px]">Before discounts and shipping, which belong to the order rather than to a product. The Order lines file has every line.</Muted>
      </Card>

      <div className="grid gap-[42px] md:grid-cols-2">
        <Card>
          <Subheading>How it was paid</Subheading>
          <div className="h-px w-full bg-black/25" />
          <Split rows={payments} empty="No payments in this period." />
        </Card>
        <Card>
          <Subheading>Discount codes used</Subheading>
          <div className="h-px w-full bg-black/25" />
          <Split rows={codes} empty="No codes were used in this period." />
          {now.discountOre > 0 && <Muted className="text-[11px]">{kr(now.discountOre)} given in discounts in all.</Muted>}
        </Card>
      </div>
    </>
  );
}

const total = (points: { netOre: number }[]) => points.reduce((t, p) => t + p.netOre, 0);
const pct = (v: number | null) => (v === null ? <span className="text-black/50">–</span> : `${v > 0 ? "+" : ""}${v} %`);

function Tile({ label, value, now, prev, year }: { label: string; value: string; now: number; prev: number; year: number }) {
  return (
    <div className="flex flex-col gap-[8px] border-[0.5px] border-black/25 p-[12px] md:p-[24px]">
      <dt className="text-[11px] leading-normal text-black/50">{label}</dt>
      <dd className="m-0 font-americana text-[24px] leading-none md:text-[32px]">{value}</dd>
      <dd className="m-0 flex flex-col gap-[2px]">
        <Delta pct={change(now, prev)} against="the period before" />
        <Delta pct={change(now, year)} against="last year" />
      </dd>
    </div>
  );
}

/** The period as a small ledger: every figure beside the period before and the same period last year. */
function Ledger({ now, prev, year }: { now: Summary; prev: Summary; year: Summary }) {
  const rows: [string, keyof Summary, "money" | "count", boolean?][] = [
    ["Gross sales, incl. VAT", "grossOre", "money"],
    ["Refunds", "refundsOre", "money"],
    ["Net sales, incl. VAT", "netOre", "money", true],
    ["Of which VAT", "vatOre", "money"],
    ["Net sales, ex. VAT", "exVatOre", "money", true],
    ["Of which shipping charged", "shippingOre", "money"],
    ["Discounts given", "discountOre", "money"],
    ["Orders", "orders", "count"],
    ["Of which refunded", "refundedOrders", "count"],
    ["Pieces sold", "units", "count"],
  ];
  const show = (v: number, unit: "money" | "count") => (unit === "money" ? kr(v) : whole.format(v));
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse font-gotham text-[11px] text-black md:text-paragraph">
        <thead>
          <tr className="text-left text-[11px] text-black/50">
            <th className="py-[6px] pr-[12px] font-normal" />
            <th className="py-[6px] pr-[12px] text-right font-normal">This period</th>
            <th className="py-[6px] pr-[12px] text-right font-normal">Before</th>
            <th className="py-[6px] text-right font-normal">Last year</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, key, unit, strong]) => (
            <tr key={key} className={strong ? "border-t border-black/40" : "border-t-[0.5px] border-black/15"}>
              <td className="py-[8px] pr-[12px]">{label}</td>
              <td className="whitespace-nowrap py-[8px] pr-[12px] text-right">{show(now[key], unit)}</td>
              <td className="whitespace-nowrap py-[8px] pr-[12px] text-right text-black/50">{show(prev[key], unit)}</td>
              <td className="whitespace-nowrap py-[8px] text-right text-black/50">{show(year[key], unit)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Split({ rows, empty }: { rows: { name: string; orders: number; netOre: number }[]; empty: string }) {
  if (!rows.length) return <Muted>{empty}</Muted>;
  const max = Math.max(1, ...rows.map((r) => r.netOre));
  return (
    <ul className="m-0 flex list-none flex-col gap-[12px] p-0 font-gotham text-paragraph text-black">
      {rows.map((r) => (
        <li key={r.name} className="flex flex-col gap-[4px]">
          <div className="flex items-baseline justify-between gap-[12px]">
            <span className="min-w-0 truncate">
              {r.name} <span className="text-[11px] text-black/50">{whole.format(r.orders)} {r.orders === 1 ? "order" : "orders"}</span>
            </span>
            <span className="shrink-0">{kr(r.netOre)}</span>
          </div>
          <div className="h-[3px] w-full bg-black/10">
            <div className="h-full bg-black" style={{ width: `${(r.netOre / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
