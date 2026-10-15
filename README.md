This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Content (Sanity) and Ida's dashboard

Sanity project **`559r73zo`**, dataset `production`. The Studio lives in `studio/` (standalone, its
own `package.json`) and is Ida's dashboard: Sanity's own login, roles and 2FA, no custom auth code.

- Hosted at **https://prosjectflora-admin.sanity.studio** (`cd studio && npx sanity deploy`).
  Moving it to `admin.prosjectflora.com` means deploying `studio/` as its own Vercel project (root
  directory `studio`, framework preset Sanity) and a CNAME at the registrar.
- **Dashboard tab** (`studio/tools/dashboard.tsx`): revenue today / 7 / 30 days, orders to pack,
  latest orders, low stock, one-click links to every editable part of the site.
- **Every text field is bilingual.** `sanity-plugin-internationalized-array` turns each string,
  text and rich-text field into `[{_key: "en"}, {_key: "no"}]`; editors see English with a
  "+ Norsk" button. Query with `coalesce(field[_key == $lang][0].value, field[_key == "en"][0].value)`.
- **Orders are documents, written only by the Stripe webhook** (`src/lib/record-order.ts`). The
  document id is `order-<paymentIntentId>` and it is created with `create` inside a transaction with
  the stock decrements, so a duplicate delivery fails atomically — one order, one decrement, even
  for two deliveries in the same instant. The Studio offers no "new order" button and the order's
  money fields are read-only; fulfilment status, tracking and notes are editable.
- `SANITY_TOKEN` (Developer/Editor role) is **server-only**: `src/sanity/lib/write.ts` is guarded by
  `server-only`, and the live-preview tokens are explicitly `false` so nothing with write access can
  reach the browser. If it's missing in production the webhook returns 500 on purpose, so Stripe
  keeps retrying until it's set and no order is lost.
- Types: `cd studio && npm run typegen` regenerates `src/sanity/sanity.types.ts` from the schema.
- `node scripts/migrate-content.mjs` copies the static content in `src/data/*` and the front page into
  Sanity (products with photos, colours and spec rows; front page; FAQ; policy pages; site settings).
  Re-runnable: it upserts by slug or fixed id and uploads each image once. English only.

Not done yet: the storefront still reads products and page copy from `src/data/*`. Moving those
reads to Sanity (with a language switch) and migrating the current content in are the next steps.

## Coming-soon gate

`src/proxy.ts` holds the whole site behind `/coming-soon` while `COMING_SOON=true`. Set it to
anything else (or remove it) to open the site — no code change needed.

To see the real site while it's closed, visit any URL with `?preview=<PREVIEW_TOKEN>`. The token is
swapped for a 30-day cookie and dropped from the address bar, so a preview link can be handed to the
client without the token ending up in their history or a screenshot.

Every URL keeps its own address and simply renders the placeholder (a rewrite, not a redirect), so
the site's structure isn't advertised. Two paths are deliberately never gated:

- `/api/webhooks/stripe` — Stripe calls it, and it's the only thing that records an order.
- `/.well-known/…` — Apple fetches it to verify the domain for Apple Pay.

Static assets are also excluded, or the placeholder itself couldn't render. See the `matcher` in
`src/proxy.ts`.

Note for future Next.js work: `middleware.ts` is deprecated in Next 16 and renamed to `proxy.ts`.

## Payments

Checkout is Stripe Payment Element only. Card data goes from the customer's browser to Stripe inside
Stripe-hosted iframes; it never touches this codebase or server, which keeps PCI scope at SAQ A.
Apple Pay, Google Pay and cards appear automatically; Vipps appears too once it is enabled on the
Stripe account (see below).

**How money flows**

- `POST /api/checkout/intent` quotes the cart from `src/data/products.ts` and `src/lib/pricing.ts`
  (VAT 25% included in listed prices, 89 kr shipping, free over 1 500 kr) and creates or updates a
  PaymentIntent in NOK. The request may only name product ids and quantities — the zod schema is
  strict and rejects any price field. Changing prices in devtools changes nothing.
- The browser confirms the PaymentIntent with Stripe directly and lands on `/order-complete`, which
  only *reads* the payment status.
- `POST /api/webhooks/stripe` is the only thing that creates an order, after verifying Stripe's
  signature on the raw body. The order number is derived from the PaymentIntent id, so replaying the
  webhook cannot create a second order.

**Environment** — see `.env.example`. `.env.local` is git-ignored; no secret is ever `NEXT_PUBLIC_`.

| Variable | Where it's used |
| --- | --- |
| `STRIPE_SECRET_KEY` | server only (`src/lib/stripe.ts`, guarded by `server-only`) |
| `STRIPE_WEBHOOK_SECRET` | webhook route only |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | browser, loads Stripe.js |

**Local development**

```bash
cp .env.example .env.local   # then paste test keys
npm run dev
stripe listen --forward-to localhost:3000/api/webhooks/stripe   # prints the whsec_ for .env.local
```

Test cards: `4242 4242 4242 4242` succeeds, `4000 0000 0000 0002` is declined inline,
`4000 0025 0000 3155` requires 3D Secure. Any future expiry, any CVC.

**Known limits with the static product file**

- Stock is *checked* at checkout (`quoteCart`) but cannot be *decremented* — there is no datastore
  to write to. The webhook marks where that goes.
- The PaymentIntent is the order record (items, customer, amounts, order number all live in its
  metadata, visible in the Stripe dashboard). Move this to a database when one is added.
- No email provider is configured; `src/lib/notify.ts` logs instead. Stripe's own receipt email
  (dashboard setting, live mode) covers the basics meanwhile.

**Wallets and Klarna**

Apple Pay, Google Pay and Klarna are Stripe-drawn buttons in their brands' official styling, side
by side above an "Or pay with card" divider, with Stripe's card fields below. Card data never touches
this code.

The side-by-side part is the non-obvious bit. Stripe's Express Checkout Element lays its buttons out
itself and stacks them once they don't fit the 520px column, so each button gets its **own Elements
group** in its own column of our flex row, each restricted to one method (`paymentMethods`). All
groups run in deferred mode (`mode`, `amount`, `currency`, `paymentMethodTypes`) and confirm the
same server-priced PaymentIntent by client secret. Klarna needs its own group because it is its own
payment method type; the wallets ride on `card`. The card fields are a fourth group with
`paymentMethodTypes: ["card"]` and wallets off, which is what stops Stripe drawing a tab strip.

`applePay: "always"` is what also gets Apple Pay onto desktop Chrome, Edge and Firefox via Apple's
scan-to-pay code. A column is dropped only once Stripe reports that button unusable in the browser.
Both wallets need the domain registered under **payment method domains** (Settings → Payment
methods → Payment method domains, or `/v1/payment_method_domains`), in test mode and again in live
mode; the older Apple Pay-only list is not enough. Registration verifies
`/.well-known/apple-developer-merchantid-domain-association`, so the site must be publicly reachable.

Traps: `overflow: "never"` and a `maxRows` above 0 can't be combined, and an invalid option makes an
element fail to mount rather than degrade, which looks exactly like a device with no wallets.
`?debug=wallets` on the checkout prints each column's reported availability. Link is switched off in
the Stripe payment method configuration.

**Vipps**

Vipps on Stripe is in private preview. Check Settings → Payment methods on the Stripe account. If it
is enabled, nothing here changes — it shows up as a redirect method inside the Payment Element. If
it is not, a separate Vipps MobilePay ePayment path is the follow-up (server creates payment →
redirect → HMAC-verified webhook → capture → same order pipeline), tested against apitest.vipps.no.

**Hosting and the domain**

The app needs a Node server for `/api/checkout/intent` and `/api/webhooks/stripe`, so it runs on
Vercel. `prosjectflora.com` is registered at one.com, and one.com's own web hosting (SSH/SFTP into
`/webroots/…`) is **static and PHP only** — no `node`, `npm` or `pm2` on that box — so the site is
not deployed there. one.com is the registrar and DNS host; the records point at Vercel.

| Record | Host | Value |
| --- | --- | --- |
| A | `@` | `76.76.21.21` |
| CNAME | `www` | `cname.vercel-dns.com` |

Take the authoritative values from Vercel (Project → Settings → Domains) when adding the domain —
Vercel sometimes issues a project-specific CNAME. Deploying is unchanged: push to `main`.

**Configuration guard**

`assertStripeEnvironment()` in `src/lib/stripe.ts` runs before any PaymentIntent is created and
refuses two states outright, with the reason returned in the response:

- **Mode mismatch** — a live secret key with a test publishable key (or the reverse). The browser
  couldn't confirm an intent this server created, so the customer would fail at the moment of paying.
- **Live keys with no `STRIPE_WEBHOOK_SECRET`** — the webhook is the only thing that records an
  order and it rejects unsigned deliveries, so this state charges real customers and records nothing.

Note that `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is inlined at build time, so the guard compares the
server's key against the publishable key actually shipped to browsers. Changing it needs a redeploy,
not just an environment edit.

**Go-live checklist**

1. Switch `STRIPE_SECRET_KEY` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` to live keys in Vercel's
   environment variables (Production scope). Never in the repo.
2. Register the webhook again in live mode: Developers → Webhooks → add
   `https://prosjectflora.com/api/webhooks/stripe` for `payment_intent.succeeded` and
   `payment_intent.payment_failed`; put its signing secret in `STRIPE_WEBHOOK_SECRET`.
3. Register `prosjectflora.com` and `www.prosjectflora.com` under payment method domains in live
   mode (see Wallets above). Apple Pay verification fetches
   `/.well-known/apple-developer-merchantid-domain-association`, which the app serves from `public/`,
   so the domain must resolve to Vercel and be reachable without a login first — Vercel Deployment
   Protection has to stay off for production.
4. Check the **live** payment method configuration (Settings → Payment methods): Apple Pay, Google
   Pay and Klarna on, Link off. Test and live are separate configurations, and in test Google Pay
   was off and Link on until both were changed by hand.
5. Confirm Vipps status (above) — it is a placeholder button until the direct integration is built.
6. Make one real purchase, check the order number in the PaymentIntent metadata and the webhook
   delivery shows 200, then refund it from the dashboard.
