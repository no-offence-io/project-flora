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
| `NEXT_PUBLIC_SITE_URL` | return URL after payment |

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

**Go-live checklist**

1. Switch `STRIPE_SECRET_KEY` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` to live keys in Vercel's
   environment variables (Production scope). Never in the repo.
2. Register the webhook again in live mode: Developers → Webhooks → add
   `https://<domain>/api/webhooks/stripe` for `payment_intent.succeeded` and
   `payment_intent.payment_failed`; put its signing secret in `STRIPE_WEBHOOK_SECRET`.
3. Set `NEXT_PUBLIC_SITE_URL` to the production origin.
4. Apple Pay: the site serves Stripe's domain-association file from
   `public/.well-known/apple-developer-merchantid-domain-association` (downloaded from
   https://stripe.com/files/apple-pay/apple-developer-merchantid-domain-association). Stripe registers the domain
   automatically when the Payment Element first loads; if the Apple Pay tab still doesn't show, add the
   domain by hand under Settings → Payment methods → Apple Pay. The file must be reachable without a login,
   so Vercel Deployment Protection has to be off for production.
5. Register the production domain under payment method domains in live mode (see Wallets above).
6. Check the **live** payment method configuration (Settings → Payment methods): Apple Pay, Google
   Pay and Klarna on, Link off. Test and live are separate configurations, and in test Google Pay
   was off and Link on until both were changed by hand.
7. Confirm Vipps status (above).
8. Make one real purchase, check the order number in the PaymentIntent metadata and the webhook
   delivery shows 200, then refund it from the dashboard.
