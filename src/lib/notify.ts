import "server-only";
import type { RecordedLine, RecordedOrder } from "./record-order";
import { formatNok } from "./money";

/*
 * Transactional email through Resend's HTTP API (https://resend.com): one secret, no SDK. Each
 * sender below says whether it actually sent, so callers can stamp the order. Nothing here is ever
 * reachable from the browser — the key would be, too.
 *
 *   RESEND_API_KEY   from resend.com → API Keys
 *   EMAIL_FROM       e.g. "Flöra <hello@prosjectflora.com>" — the domain must be verified in Resend
 *                    (Domains → Add → the DNS records go in at one.com). Until then Resend only
 *                    delivers to the account owner's own address, from onboarding@resend.dev.
 *   EMAIL_NOTIFY     optional: Ida's address, gets a copy of every order and sign-up
 */
export const emailConfigured = () => Boolean(process.env.RESEND_API_KEY);
const from = () => process.env.EMAIL_FROM || "Flöra <onboarding@resend.dev>";
const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL || "https://www.prosjectflora.com").replace(/\/$/, "");

type Lang = "en" | "no";

const T = {
  en: {
    confirmSubject: (n: string) => `Order ${n} confirmed – Flöra`,
    thanks: "Thank you",
    confirmed: (n: string) => `Your order ${n} is confirmed. We will let you know as soon as it has been sent.`,
    yourOrder: "Your order",
    size: "Size",
    deliveryTo: "Delivery to",
    subtotal: "Subtotal",
    discount: "Discount",
    shipping: "Shipping",
    free: "Free",
    vat: "VAT 25% (included)",
    total: "Total",
    questions: "Questions? Reply to this email.",
    shippedSubject: (n: string) => `Order ${n} is on its way – Flöra`,
    shipped: "Your order is on its way",
    shippedText: (n: string) => `Order ${n} has been sent.`,
    tracking: "Tracking number",
    track: "Track your parcel",
    welcomeSubject: "Welcome to Flöra",
    welcome: "You're on the list",
    welcomeText: "Thank you for signing up. You will be the first to hear about new pieces and when they are available.",
    visit: "Visit the shop",
    testSubject: "Test email – Flöra",
    test: "It works",
    testText: "This is a test email from the Flöra admin. If you can read this, email is set up.",
  },
  no: {
    confirmSubject: (n: string) => `Ordre ${n} bekreftet – Flöra`,
    thanks: "Takk",
    confirmed: (n: string) => `Ordren din ${n} er bekreftet. Vi gir beskjed så snart den er sendt.`,
    yourOrder: "Din ordre",
    size: "Størrelse",
    deliveryTo: "Leveres til",
    subtotal: "Delsum",
    discount: "Rabatt",
    shipping: "Frakt",
    free: "Gratis",
    vat: "Mva. 25 % (inkludert)",
    total: "Totalt",
    questions: "Spørsmål? Svar på denne e-posten.",
    shippedSubject: (n: string) => `Ordre ${n} er på vei – Flöra`,
    shipped: "Ordren din er på vei",
    shippedText: (n: string) => `Ordre ${n} er sendt.`,
    tracking: "Sporingsnummer",
    track: "Spor pakken",
    welcomeSubject: "Velkommen til Flöra",
    welcome: "Du står på listen",
    welcomeText: "Takk for at du meldte deg på. Du får beskjed først om nye plagg og når de er tilgjengelige.",
    visit: "Gå til butikken",
    testSubject: "Test-e-post – Flöra",
    test: "Det virker",
    testText: "Dette er en test-e-post fra Flöra-administrasjonen. Kan du lese dette, er e-post satt opp.",
  },
} as const;

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);

/**
 * The site's look in email terms: white, black text, a serif heading, hairline rules, 13px body.
 * Custom fonts don't load reliably in mail clients, so the stacks are the closest system faces.
 */
function layout(title: string, body: string) {
  const serif = "font-family: 'Americana Std', 'Iowan Old Style', Georgia, 'Times New Roman', serif;";
  const sans = "font-family: 'Gotham', -apple-system, 'Helvetica Neue', Helvetica, Arial, sans-serif;";
  return `<!doctype html><html><body style="margin:0;padding:0;background:#ffffff;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;"><tr><td align="center" style="padding:42px 24px;">
<table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;border:0.5px solid rgba(0,0,0,0.25);">
<tr><td style="padding:24px;${sans}font-size:13.35px;line-height:1.4;color:#000000;">
<p style="margin:0 0 24px 0;"><img src="${siteUrl()}/email/flora-logo.png" alt="Flöra" width="134" height="30" style="display:block;width:134px;height:30px;border:0;"></p>
<h1 style="margin:0 0 24px 0;${serif}font-size:32px;line-height:1;font-weight:400;">${esc(title)}</h1>
${body}
</td></tr>
<tr><td style="padding:12px 24px;border-top:0.5px solid rgba(0,0,0,0.25);${sans}font-size:11px;color:rgba(0,0,0,0.5);">Flöra · <a href="${siteUrl()}" style="color:rgba(0,0,0,0.5);">${siteUrl().replace(/^https?:\/\//, "")}</a></td></tr>
</table></td></tr></table></body></html>`;
}
const p = (s: string) => `<p style="margin:0 0 12px 0;color:rgba(0,0,0,0.7);">${s}</p>`;
const rule = `<div style="height:1px;background:rgba(0,0,0,0.25);margin:24px 0;"></div>`;
const row = (label: string, value: string, muted = false) =>
  `<tr><td style="padding:6px 0;${muted ? "font-size:11px;color:rgba(0,0,0,0.5);" : ""}">${label}</td><td align="right" style="padding:6px 0;${muted ? "font-size:11px;color:rgba(0,0,0,0.5);" : ""}">${value}</td></tr>`;
const button = (href: string, label: string) =>
  `<p style="margin:24px 0 0 0;"><a href="${href}" style="display:inline-block;background:#000000;color:#ffffff;text-decoration:none;padding:12px 24px;font-size:13.35px;">${esc(label)}</a></p>`;

/** A small product photo on the cart's light box, the whole photo visible (Sanity's image API does the fitting). */
const thumb = (url: string) => `${url}?w=112&h=140&fit=fill&bg=f7f7f7&fm=jpg&q=80`;

function linesTable(lines: RecordedLine[], t: (typeof T)[Lang]) {
  const cell = "padding:8px 0;border-top:0.25px solid rgba(0,0,0,0.25);";
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${lines
    .map((l) => {
      const details = [
        ...(l.size ? [`${t.size}: ${esc(l.size)}`] : []),
        ...l.measurements.map((m) => `${esc(m.label)}: ${esc(m.value)} cm`),
      ];
      const photo = l.image
        ? `<td width="56" valign="top" style="${cell}padding-right:12px;"><img src="${thumb(l.image)}" alt="" width="56" height="70" style="display:block;width:56px;height:70px;background:#f7f7f7;border:0;"></td>`
        : "";
      return `<tr>${photo}<td valign="top" style="${cell}">${esc(l.name)} × ${l.quantity}${
        details.length ? `<br><span style="font-size:11px;color:rgba(0,0,0,0.5);">${details.join(" · ")}</span>` : ""
      }</td><td align="right" valign="top" style="${cell}">${formatNok(l.unitPriceOre * l.quantity)}</td></tr>`;
    })
    .join("")}</table>`;
}

type Mail = { to: string[]; subject: string; html: string; replyTo?: string };

/** Low-level send. Returns false (and logs) when no key is set, so every caller degrades to a log line. */
export async function sendMail(mail: Mail): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.info(`[email] not configured — would send "${mail.subject}" to ${mail.to.join(", ")}`);
    return false;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: from(), to: mail.to, subject: mail.subject, html: mail.html, ...(mail.replyTo ? { reply_to: mail.replyTo } : {}) }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return true;
}

export async function sendOrderConfirmation(order: Pick<RecordedOrder, "orderNumber" | "lines" | "language" | "customer" | "totals">): Promise<boolean> {
  if (!order.customer.email) return false;
  const t = T[order.language];
  const o = order.totals;
  const html = layout(
    t.thanks,
    p(t.confirmed(order.orderNumber)) +
      rule +
      `<p style="margin:0 0 12px 0;">${t.yourOrder}</p>` +
      linesTable(order.lines, t) +
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;background:#fafbfc;"><tr><td style="padding:12px 24px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">` +
      row(t.subtotal, formatNok(o.subtotalOre)) +
      (o.discountOre ? row(`${t.discount}${o.discountCode ? ` (${esc(o.discountCode)})` : ""}`, `−${formatNok(o.discountOre)}`, true) : "") +
      row(t.shipping, o.shippingOre ? formatNok(o.shippingOre) : t.free, true) +
      row(t.vat, formatNok(o.vatIncludedOre), true) +
      row(`<strong>${t.total}</strong>`, `<strong>${formatNok(o.totalOre)}</strong>`) +
      `</table></td></tr></table>` +
      rule +
      (order.customer.address ? `<p style="margin:0 0 6px 0;">${t.deliveryTo}</p>` + p(`${esc(order.customer.name)}<br>${esc(order.customer.address)}`) : "") +
      p(t.questions),
  );
  const notify = process.env.EMAIL_NOTIFY;
  const sent = await sendMail({ to: [order.customer.email], subject: t.confirmSubject(order.orderNumber), html, replyTo: notify || undefined });
  if (sent && notify) await sendMail({ to: [notify], subject: `New order ${order.orderNumber} · ${formatNok(o.totalOre)}`, html }).catch((err) => console.error("[email] owner copy failed", err));
  return sent;
}

export async function sendShippingNotification(order: { orderNumber: string; email: string; language: Lang; trackingNumber: string; trackingUrl?: string }): Promise<boolean> {
  if (!order.email) return false;
  const t = T[order.language];
  const html = layout(
    t.shipped,
    p(t.shippedText(order.orderNumber)) +
      (order.trackingNumber ? `<p style="margin:0 0 6px 0;">${t.tracking}</p>` + p(`<strong style="color:#000;">${esc(order.trackingNumber)}</strong>`) : "") +
      (order.trackingUrl ? button(order.trackingUrl, t.track) : "") +
      rule +
      p(t.questions),
  );
  return sendMail({ to: [order.email], subject: t.shippedSubject(order.orderNumber), html, replyTo: process.env.EMAIL_NOTIFY || undefined });
}

export async function sendNewsletterWelcome(email: string, language: Lang): Promise<boolean> {
  const t = T[language];
  const html = layout(t.welcome, p(t.welcomeText) + button(`${siteUrl()}/shop`, t.visit));
  return sendMail({ to: [email], subject: t.welcomeSubject, html });
}

/** From the admin's setup page: proves the key, the sender and the look in one go. */
export async function sendTestEmail(to: string, language: Lang = "en"): Promise<boolean> {
  const t = T[language];
  return sendMail({ to: [to], subject: t.testSubject, html: layout(t.test, p(t.testText)) });
}

/** Posten/Bring tracking for Norwegian parcels; other carriers get no link, just the number. */
export function trackingUrlFor(trackingNumber: string): string | undefined {
  const n = trackingNumber.trim();
  if (!n) return undefined;
  return `https://sporing.posten.no/sporing/${encodeURIComponent(n)}`;
}
