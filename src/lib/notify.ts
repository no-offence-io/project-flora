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
    newsletterShop: "Shop the collection",
    newsletterWhy: "You get this because you signed up at",
    unsubscribe: "Unsubscribe",
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
    newsletterShop: "Se kolleksjonen",
    newsletterWhy: "Du får denne fordi du meldte deg på hos",
    unsubscribe: "Meld deg av",
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
const SERIF = "font-family: 'Americana', 'Didot', 'Bodoni 72', 'Iowan Old Style', Georgia, 'Times New Roman', serif;";
const SANS = "font-family: 'Gotham', -apple-system, 'Helvetica Neue', Helvetica, Arial, sans-serif;";
/** The site's own faces, for the mail clients that load web fonts (Apple Mail, iOS, Outlook for Mac); the rest fall back to the stacks above. */
const FONT_FACES = () => `<style>
@font-face{font-family:'Americana';src:url('${siteUrl()}/email/fonts/americana.otf') format('opentype');font-weight:400;font-style:normal;}
@font-face{font-family:'Gotham';src:url('${siteUrl()}/email/fonts/gotham.otf') format('opentype');font-weight:325;font-style:normal;}
</style>`;

function layout(title: string, body: string) {
  const serif = SERIF;
  const sans = SANS;
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">${FONT_FACES()}</head><body style="margin:0;padding:0;background:#ffffff;">
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

export type NewsletterProduct = { name: string; priceOre: number; image?: string; href: string };
export type NewsletterFeature = { image: string; caption: string; href: string };
export type Newsletter = {
  subject: string;
  /** Small spaced capitals above the title, e.g. "New collection". */
  kicker: string;
  title: string;
  intro: string;
  /** Portrait photo, full width under the wordmark. */
  heroImage: string;
  /** Two editorial photos side by side, each with a caption in small capitals. */
  features?: [NewsletterFeature, NewsletterFeature];
  products: NewsletterProduct[];
  /** One line in the serif, set large between the pieces and the closing. */
  quote?: string;
  /** Landscape photo with a short paragraph, before the button. */
  closing?: { image: string; text: string };
  shopUrl?: string;
  shopLabel?: string;
};

const KICKER = `${SANS}font-size:10px;line-height:1;letter-spacing:0.35em;text-transform:uppercase;color:#000000;`;
const BODY = `${SANS}font-size:13px;line-height:1.85;color:#3a3a3a;`;
const SMALL = `${SANS}font-size:10px;line-height:1.8;letter-spacing:0.2em;text-transform:uppercase;color:#000000;`;

/**
 * A campaign mail — "New collection" and the like — set like a lookbook rather than a shop: white
 * page, no box, the wordmark small and centred, one tall photograph, a large serif headline with
 * air around it, spaced small capitals for everything that isn't a sentence, the pieces cut out on
 * white two across with a hairline between rows, one line in the serif, and a single thin-bordered
 * button. Nothing is coloured; the photographs carry it. Every recipient gets their own unsubscribe
 * link (their subscriber id, a hash nobody can guess from the address).
 */
export async function sendNewsletter(to: { email: string; id: string; language: Lang }, mail: Newsletter): Promise<boolean> {
  const t = T[to.language];
  const base = siteUrl();
  const shopUrl = mail.shopUrl ?? `${base}/shop`;
  const W = 600;
  const paragraphs = (text: string, style = BODY, align = "center") =>
    text
      .split(/\n\s*\n/)
      .map((para) => `<p style="margin:0 0 18px 0;${style}text-align:${align};">${esc(para)}</p>`)
      .join("");
  const cut = (url: string, w: number, h: number) => `${url}?w=${w * 2}&h=${h * 2}&fit=max&fm=png`;
  const productCell = (p: NewsletterProduct) =>
    `<td width="50%" valign="bottom" align="center" style="padding:36px 18px 0 18px;">
      <a href="${p.href}" style="text-decoration:none;color:#000000;display:block;">
        ${p.image ? `<img src="${cut(p.image, 240, 300)}" alt="${esc(p.name)}" width="240" style="display:block;width:240px;max-width:100%;height:auto;max-height:300px;border:0;margin:0 auto;">` : `<div style="width:240px;height:300px;"></div>`}
        <p style="margin:24px 0 0 0;${SMALL}">${esc(p.name)}</p>
        <p style="margin:6px 0 0 0;${SANS}font-size:11px;line-height:1.6;color:#7a7a7a;">${formatNok(p.priceOre)}</p>
      </a>
    </td>`;
  const productRows: string[] = [];
  for (let i = 0; i < mail.products.length; i += 2) {
    productRows.push(
      `<tr>${productCell(mail.products[i])}${mail.products[i + 1] ? productCell(mail.products[i + 1]) : "<td></td>"}</tr>` +
        (i + 2 < mail.products.length ? `<tr><td colspan="2" style="padding:36px 18px 0 18px;"><div style="height:1px;background:#e6e6e6;"></div></td></tr>` : ""),
    );
  }
  const feature = (f: NewsletterFeature) =>
    `<td width="50%" valign="top" style="padding:0 6px;">
      <a href="${f.href}" style="text-decoration:none;color:#000000;">
        <img src="${f.image}" alt="" width="282" style="display:block;width:100%;height:auto;border:0;">
        <p style="margin:14px 0 0 0;${SMALL}text-align:center;">${esc(f.caption)}</p>
      </a>
    </td>`;

  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">${FONT_FACES()}</head>
<body style="margin:0;padding:0;background:#ffffff;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;"><tr><td align="center" style="padding:0;">
<table role="presentation" width="${W}" cellpadding="0" cellspacing="0" style="max-width:${W}px;width:100%;">

  <tr><td align="center" style="padding:56px 24px 40px 24px;">
    <a href="${base}" style="text-decoration:none;"><img src="${base}/email/flora-logo.png" alt="Flöra" width="112" height="25" style="display:block;width:112px;height:25px;border:0;"></a>
  </td></tr>

  <tr><td align="center" style="padding:0 24px 20px 24px;${KICKER}">${esc(mail.kicker)}</td></tr>

  <tr><td style="padding:0;">
    <a href="${shopUrl}"><img src="${mail.heroImage}" alt="" width="${W}" style="display:block;width:100%;height:auto;border:0;"></a>
  </td></tr>

  <tr><td align="center" style="padding:64px 48px 0 48px;">
    <h1 style="margin:0;${SERIF}font-size:44px;line-height:1.08;font-weight:400;letter-spacing:0.01em;color:#000000;text-align:center;">${esc(mail.title)}</h1>
  </td></tr>
  <tr><td align="center" style="padding:28px 0 0 0;"><div style="width:32px;height:1px;background:#000000;"></div></td></tr>
  <tr><td align="center" style="padding:28px 72px 0 72px;">${paragraphs(mail.intro)}</td></tr>

  ${
    mail.features
      ? `<tr><td style="padding:48px 18px 0 18px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${feature(mail.features[0])}${feature(mail.features[1])}</tr></table></td></tr>`
      : ""
  }

  ${
    mail.products.length
      ? `<tr><td align="center" style="padding:72px 24px 0 24px;${KICKER}">${esc(to.language === "no" ? "Plaggene" : "The pieces")}</td></tr>
         <tr><td style="padding:0 6px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${productRows.join("")}</table></td></tr>`
      : ""
  }

  ${
    mail.quote
      ? `<tr><td align="center" style="padding:80px 64px 0 64px;">
           <p style="margin:0;${SERIF}font-size:26px;line-height:1.35;font-weight:400;color:#000000;text-align:center;">“${esc(mail.quote)}”</p>
         </td></tr>`
      : ""
  }

  ${
    mail.closing
      ? `<tr><td style="padding:72px 0 0 0;"><img src="${mail.closing.image}" alt="" width="${W}" style="display:block;width:100%;height:auto;border:0;"></td></tr>
         <tr><td align="center" style="padding:40px 72px 0 72px;">${paragraphs(mail.closing.text)}</td></tr>`
      : ""
  }

  <tr><td align="center" style="padding:40px 24px 0 24px;">
    <a href="${shopUrl}" style="display:inline-block;border:1px solid #000000;padding:16px 36px;${KICKER}text-decoration:none;">${esc(mail.shopLabel ?? t.newsletterShop)}</a>
  </td></tr>

  <tr><td align="center" style="padding:88px 24px 56px 24px;">
    <img src="${base}/email/flora-logo.png" alt="Flöra" width="64" height="14" style="display:block;width:64px;height:14px;border:0;margin:0 auto 20px auto;">
    <p style="margin:0 0 14px 0;${SANS}font-size:10px;line-height:1.8;letter-spacing:0.25em;text-transform:uppercase;color:#000000;">
      <a href="https://www.instagram.com/" style="color:#000000;text-decoration:none;">Instagram</a>
      &nbsp;&nbsp;·&nbsp;&nbsp;<a href="${shopUrl}" style="color:#000000;text-decoration:none;">${esc(to.language === "no" ? "Butikk" : "Shop")}</a>
    </p>
    <p style="margin:0;${SANS}font-size:10px;line-height:1.8;color:#9a9a9a;">${t.newsletterWhy} ${base.replace(/^https?:\/\//, "")} · <a href="${base}/newsletter/unsubscribe?id=${encodeURIComponent(to.id)}" style="color:#9a9a9a;">${t.unsubscribe}</a></p>
  </td></tr>

</table></td></tr></table></body></html>`;
  return sendMail({ to: [to.email], subject: mail.subject, html });
}

/** Posten/Bring tracking for Norwegian parcels; other carriers get no link, just the number. */
export function trackingUrlFor(trackingNumber: string): string | undefined {
  const n = trackingNumber.trim();
  if (!n) return undefined;
  return `https://sporing.posten.no/sporing/${encodeURIComponent(n)}`;
}
