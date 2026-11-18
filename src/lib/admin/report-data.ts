import "server-only";
import { isDemoOn } from "./demo";
import { dayKey, addDays, type ReportOrder } from "./reports";
import { adminClient } from "./sanity";

/*
 * The orders the reports are worked out from: every order with a date, oldest first, with only the
 * fields the arithmetic in reports.ts reads. One query serves the tiles, every graph and the
 * exports, so they can never disagree. Test-mode orders are left out unless test mode is on, in
 * which case they are what there is to look at.
 *
 * A shop this size has its whole history in a few hundred kilobytes; the cap is there so a runaway
 * dataset fails loudly in one place (the page says so) rather than slowly everywhere.
 */
const FIELDS = `_id, orderNumber, status, orderedAt, manual, demo, totalOre, subtotalOre, discountOre, discountCode, shippingOre, vatIncludedOre, paymentProvider,
  "paymentReference": coalesce(stripePaymentIntentId, vippsReference),
  "customer": customer{ name, email, address },
  "items": items[]{ name, quantity, unitPriceOre, size }`;

export const ORDER_CAP = 20000;

export async function loadReportOrders(options: { sample?: boolean } = {}): Promise<{ orders: ReportOrder[]; capped: boolean; demo: boolean; sample: boolean }> {
  // Development only, like the preview sign-in: made-up orders in memory, to see the graphs full. Never part of a deployed build's behaviour.
  if (options.sample && process.env.NODE_ENV === "development") return { orders: sampleOrders(), capped: false, demo: false, sample: true };
  const demo = await isDemoOn();
  const orders = await adminClient().fetch<ReportOrder[]>(`*[_type == "order" && defined(orderedAt) && (demo != true || $demo)] | order(orderedAt asc)[0...${ORDER_CAP}]{ ${FIELDS} }`, { demo });
  return { orders, capped: orders.length >= ORDER_CAP, demo, sample: false };
}

/** Two and a bit years of plausible orders, the same every time. */
function sampleOrders(): ReportOrder[] {
  let seed = 7;
  const rand = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const products: [string, number][] = [["Miss Flow Top", 129000], ["Wrap Skirt", 89000], ["Long Skirt", 99000], ["Miss Julie Leather", 222000], ["Flow Maxi Skirt", 119000], ["Boho 1/1", 36000]];
  const today = dayKey(new Date());
  const out: ReportOrder[] = [];
  let i = 0;
  for (let day = addDays(today, -800); day <= today; day = addDays(day, 1)) {
    const age = (Date.parse(today) - Date.parse(day)) / 86400000;
    const month = Number(day.slice(5, 7));
    const season = month === 11 || month === 12 ? 1.8 : month >= 6 && month <= 8 ? 1.3 : 1;
    const expected = (0.6 + (800 - age) / 500) * season;
    const count = Math.floor(expected + rand() * 1.4);
    for (let k = 0; k < count; k++) {
      const lines = 1 + (rand() > 0.75 ? 1 : 0);
      const items = Array.from({ length: lines }, () => {
        const [name, unitPriceOre] = products[Math.floor(rand() * products.length)];
        return { name, unitPriceOre, quantity: rand() > 0.9 ? 2 : 1, size: ["S", "M", "L"][Math.floor(rand() * 3)] };
      });
      const subtotalOre = items.reduce((t, it) => t + it.quantity * it.unitPriceOre, 0);
      const code = rand() > 0.85 ? "WELCOME10" : null;
      const discountOre = code ? Math.round(subtotalOre * 0.1) : 0;
      const shippingOre = subtotalOre > 150000 ? 0 : 9900;
      const totalOre = subtotalOre - discountOre + shippingOre;
      const r = rand();
      out.push({
        _id: `sample-${i}`,
        orderNumber: `FL-S${String(i++).padStart(5, "0")}`,
        status: r > 0.97 ? "cancelled" : r > 0.93 ? "refunded" : age < 3 ? "paid" : age < 10 ? "shipped" : "delivered",
        orderedAt: new Date(Date.parse(`${day}T08:00:00Z`) + Math.floor(rand() * 12 * 3600000)).toISOString(),
        totalOre,
        subtotalOre,
        discountOre,
        discountCode: code,
        shippingOre,
        vatIncludedOre: Math.round(totalOre * 0.2),
        paymentProvider: rand() > 0.45 ? "vipps" : "stripe",
        paymentReference: `sample-${i}`,
        customer: { name: "Sample Customer", email: "sample@example.com", address: "Storgata 1, 0155 Oslo, Norway" },
        items,
      });
    }
  }
  return out;
}
