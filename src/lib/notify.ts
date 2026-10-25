import "server-only";
import type { RecordedLine, RecordedOrder } from "./record-order";
import { formatNok } from "./money";
import type { Block as NewsletterBlock, L as NewsletterText } from "./newsletter-blocks";

const INSTAGRAM_URL = "https://www.instagram.com/prosject.flora";

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

export type NewsletterProduct = { name: string; priceOre: number; image?: string; /** Animated GIF; shown instead of the photo when present. */ gif?: string; href: string };

const KICKER = `${SANS}font-size:10px;line-height:1;letter-spacing:0.35em;text-transform:uppercase;color:#000000;`;
const BODY = `${SANS}font-size:13px;line-height:1.85;color:#3a3a3a;`;
const SMALL = `${SANS}font-size:10px;line-height:1.8;letter-spacing:0.2em;text-transform:uppercase;color:#000000;`;
const W = 600;

export type RenderContext = {
  lang: Lang;
  /** Product ids referenced by "pieces" blocks → what to show. */
  products: Record<string, NewsletterProduct>;
  /** The recipient's own unsubscribe link; the preview passes a placeholder. */
  unsubscribeUrl: string;
  /** Preview only: tag every block, show empty ones, and add the script that makes them draggable. Never set when sending. */
  editable?: boolean;
};

const textOf = (t: NewsletterText, lang: Lang) => (lang === "no" ? t.no || t.en : t.en || t.no);
const paragraphs = (text: string) =>
  text
    .split(/\n\s*\n/)
    .filter((para) => para.trim())
    .map((para) => `<p style="margin:0 0 18px 0;${BODY}text-align:center;">${esc(para.trim()).replace(/\n/g, "<br>")}</p>`)
    .join("");
const cut = (url: string, w: number, h: number) => (url.includes("cdn.sanity.io/images/") ? `${url}?w=${w * 2}&h=${h * 2}&fit=max&fm=png` : url);

/**
 * One block → one table row. The lookbook rules live here: white page, spaced small capitals for
 * labels, the serif for the heading and the quote, pieces cut out on white two across, one
 * thin-bordered button. Photos are taken as they are; a Sanity photo gets sized by its CDN.
 */
function renderBlock(b: NewsletterBlock, ctx: RenderContext, t: (typeof T)[Lang]): string {
  const lang = ctx.lang;
  switch (b.kind) {
    case "kicker":
      return `<tr><td align="center" style="padding:40px 24px 0 24px;${KICKER}">${esc(textOf(b.text, lang))}</td></tr>`;
    case "heading":
      return `<tr><td align="center" style="padding:48px 48px 0 48px;"><h1 style="margin:0;${SERIF}font-size:44px;line-height:1.08;font-weight:400;letter-spacing:0.01em;color:#000000;text-align:center;">${esc(textOf(b.text, lang))}</h1></td></tr>`;
    case "text":
      return `<tr><td align="center" style="padding:28px 72px 0 72px;">${paragraphs(textOf(b.text, lang))}</td></tr>`;
    case "image": {
      if (!b.src) return ctx.editable ? `<tr><td style="padding:40px 0 0 0;"><div style="height:280px;background:#f7f7f7;border:1px dashed rgba(0,0,0,0.3);"></div></td></tr>` : "";
      const img = `<img src="${esc(b.src)}" alt="${esc(b.alt)}" width="${W}" style="display:block;width:100%;height:auto;border:0;">`;
      return `<tr><td style="padding:40px 0 0 0;">${b.href ? `<a href="${esc(b.href)}">${img}</a>` : img}</td></tr>`;
    }
    case "twoImages": {
      const side = (f: { src: string; caption: NewsletterText; href: string }) =>
        `<td width="50%" valign="top" style="padding:0 6px;">${f.href ? `<a href="${esc(f.href)}" style="text-decoration:none;color:#000000;">` : ""}${
          f.src ? `<img src="${esc(f.src)}" alt="" width="282" style="display:block;width:100%;height:auto;border:0;">` : `<div style="width:100%;height:280px;background:#f7f7f7;"></div>`
        }${textOf(f.caption, lang) ? `<p style="margin:14px 0 0 0;${SMALL}text-align:center;">${esc(textOf(f.caption, lang))}</p>` : ""}${f.href ? "</a>" : ""}</td>`;
      return `<tr><td style="padding:48px 18px 0 18px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${side(b.left)}${side(b.right)}</tr></table></td></tr>`;
    }
    case "products": {
      const items = b.ids.map((id) => ctx.products[id]).filter(Boolean);
      if (!items.length) return ctx.editable ? `<tr><td align="center" style="padding:40px 24px 0 24px;${BODY}"><div style="padding:40px;border:1px dashed rgba(0,0,0,0.3);">Pieces — none chosen yet</div></td></tr>` : "";
      const cell = (p: NewsletterProduct) =>
        `<td width="50%" valign="bottom" align="center" style="padding:36px 18px 0 18px;"><a href="${esc(p.href)}" style="text-decoration:none;color:#000000;display:block;">${
          b.useGifs && p.gif
            ? `<img src="${esc(p.gif)}" alt="${esc(p.name)}" width="240" height="300" style="display:block;width:240px;max-width:100%;height:auto;border:0;margin:0 auto;">`
            : p.image
              ? `<img src="${cut(p.image, 240, 300)}" alt="${esc(p.name)}" width="240" style="display:block;width:240px;max-width:100%;height:auto;max-height:300px;border:0;margin:0 auto;">`
              : `<div style="width:240px;height:300px;"></div>`
        }<p style="margin:24px 0 0 0;${SMALL}">${esc(p.name)}</p><p style="margin:6px 0 0 0;${SANS}font-size:11px;line-height:1.6;color:#7a7a7a;">${formatNok(p.priceOre)}</p></a></td>`;
      const rows: string[] = [];
      for (let i = 0; i < items.length; i += 2) {
        rows.push(`<tr>${cell(items[i])}${items[i + 1] ? cell(items[i + 1]) : "<td></td>"}</tr>`);
        if (i + 2 < items.length) rows.push(`<tr><td colspan="2" style="padding:36px 18px 0 18px;"><div style="height:1px;background:#e6e6e6;"></div></td></tr>`);
      }
      const title = textOf(b.title, lang);
      return `${title ? `<tr><td align="center" style="padding:64px 24px 0 24px;${KICKER}">${esc(title)}</td></tr>` : ""}<tr><td style="padding:0 6px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows.join("")}</table></td></tr>`;
    }
    case "quote":
      return `<tr><td align="center" style="padding:64px 64px 0 64px;"><p style="margin:0;${SERIF}font-size:26px;line-height:1.35;font-weight:400;color:#000000;text-align:center;">“${esc(textOf(b.text, lang))}”</p></td></tr>`;
    case "button":
      return `<tr><td align="center" style="padding:40px 24px 0 24px;"><a href="${esc(b.href || siteUrl() + "/shop")}" style="display:inline-block;border:1px solid #000000;padding:16px 36px;${KICKER}text-decoration:none;">${esc(textOf(b.label, lang) || t.newsletterShop)}</a></td></tr>`;
    case "divider":
      return `<tr><td align="center" style="padding:28px 0 0 0;"><div style="width:32px;height:1px;background:#000000;"></div></td></tr>`;
    case "spacer":
      return `<tr><td style="padding:0;height:${Math.max(0, Math.min(200, b.height))}px;font-size:0;line-height:0;">&nbsp;</td></tr>`;
  }
}

/** The whole mail: fixed header (wordmark) and footer (links, unsubscribe) around the blocks. */
export function renderNewsletter(blocks: NewsletterBlock[], ctx: RenderContext): string {
  const t = T[ctx.lang];
  const base = siteUrl();
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">${FONT_FACES()}</head>
<body style="margin:0;padding:0;background:#ffffff;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;"><tr><td align="center" style="padding:0;">
<table role="presentation" width="${W}" cellpadding="0" cellspacing="0" style="max-width:${W}px;width:100%;">
  <tr><td align="center" style="padding:56px 24px 0 24px;"><a href="${base}" style="text-decoration:none;"><img src="${base}/email/flora-logo.png" alt="Flöra" width="112" height="25" style="display:block;width:112px;height:25px;border:0;"></a></td></tr>
  ${blocks.map((b) => tag(renderBlock(b, ctx, t), b.id, ctx.editable)).join("\n")}
  <tr><td align="center" style="padding:88px 24px 56px 24px;">
    <img src="${base}/email/flora-logo.png" alt="Flöra" width="64" height="14" style="display:block;width:64px;height:14px;border:0;margin:0 auto 20px auto;">
    <p style="margin:0 0 14px 0;${SANS}font-size:10px;line-height:1.8;letter-spacing:0.25em;text-transform:uppercase;color:#000000;"><a href="${INSTAGRAM_URL}" style="color:#000000;text-decoration:none;">Instagram</a>&nbsp;&nbsp;·&nbsp;&nbsp;<a href="${base}/shop" style="color:#000000;text-decoration:none;">${ctx.lang === "no" ? "Butikk" : "Shop"}</a></p>
    <p style="margin:0;${SANS}font-size:10px;line-height:1.8;color:#9a9a9a;">${t.newsletterWhy} ${base.replace(/^https?:\/\//, "")} · <a href="${esc(ctx.unsubscribeUrl)}" style="color:#9a9a9a;">${t.unsubscribe}</a></p>
  </td></tr>
</table></td></tr></table>${ctx.editable ? EDITOR_SCRIPT : ""}</body></html>`;
}

/** Preview: the first row of a block carries its id, so the editor script can find it. */
const tag = (html: string, id: string, editable?: boolean) => (editable ? html.replace("<tr>", `<tr data-block="${id}">`) : html);

/**
 * Lives only in the preview iframe (sandboxed, scripts allowed, no origin). Makes every block
 * draggable, accepts drops from the editor's own list and palette (their dataTransfer text is
 * "flora-id:…" or "flora-kind:…"), and tells the parent what happened. Links are inert here.
 */
const EDITOR_SCRIPT = `<style>
tr[data-block]{cursor:grab}tr[data-block]:hover>td{outline:1px dashed rgba(0,0,0,.45);outline-offset:-1px}
tr[data-block].over>td{box-shadow:inset 0 3px 0 #000}tr[data-block].active>td{outline:1px solid #000;outline-offset:-1px}
tr[data-block].dragging{opacity:.35}body{-webkit-user-select:none;user-select:none}
</style><script>
(function(){
  var rows=Array.prototype.slice.call(document.querySelectorAll('tr[data-block]'));var dragId=null;
  function send(m){parent.postMessage(Object.assign({flora:true},m),'*');}
  function dataOf(e){var d=e.dataTransfer.getData('text/plain')||'';return d||(dragId?'flora-id:'+dragId:'');}
  rows.forEach(function(tr){
    tr.setAttribute('draggable','true');
    tr.addEventListener('dragstart',function(e){dragId=tr.getAttribute('data-block');tr.classList.add('dragging');e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain','flora-id:'+dragId);send({type:'drag',id:dragId});});
    tr.addEventListener('dragend',function(){dragId=null;rows.forEach(function(r){r.classList.remove('dragging','over');});send({type:'dragend'});});
    tr.addEventListener('dragover',function(e){e.preventDefault();rows.forEach(function(r){r.classList.remove('over');});tr.classList.add('over');});
    tr.addEventListener('dragleave',function(){tr.classList.remove('over');});
    tr.addEventListener('drop',function(e){e.preventDefault();tr.classList.remove('over');send({type:'drop',data:dataOf(e),to:tr.getAttribute('data-block')});dragId=null;});
    tr.addEventListener('click',function(e){e.preventDefault();send({type:'select',id:tr.getAttribute('data-block')});});
  });
  document.body.addEventListener('dragover',function(e){e.preventDefault();});
  document.body.addEventListener('drop',function(e){e.preventDefault();if(!e.target.closest||!e.target.closest('tr[data-block]'))send({type:'drop',data:dataOf(e),to:null});});
  Array.prototype.forEach.call(document.querySelectorAll('a'),function(a){a.addEventListener('click',function(e){e.preventDefault();});});
  window.addEventListener('message',function(e){var m=e.data||{};if(!m.flora)return;if(m.type==='active'){rows.forEach(function(r){r.classList.toggle('active',r.getAttribute('data-block')===m.id);});var el=rows.filter(function(r){return r.getAttribute('data-block')===m.id})[0];if(el&&m.scroll)el.scrollIntoView({block:'center',behavior:'smooth'});}});
  send({type:'ready'});
})();
</script>`;

export function unsubscribeUrlFor(subscriberId: string): string {
  return `${siteUrl()}/newsletter/unsubscribe?id=${encodeURIComponent(subscriberId)}`;
}

export async function sendNewsletter(to: { email: string; subject: string }, html: string): Promise<boolean> {
  return sendMail({ to: [to.email], subject: to.subject, html });
}

/** Posten/Bring tracking for Norwegian parcels; other carriers get no link, just the number. */
export function trackingUrlFor(trackingNumber: string): string | undefined {
  const n = trackingNumber.trim();
  if (!n) return undefined;
  return `https://sporing.posten.no/sporing/${encodeURIComponent(n)}`;
}
