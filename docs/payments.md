# Payments

How money moves through the shop, and the things that are easy to get wrong.

- [Cards and wallets (Stripe)](#cards-and-wallets-stripe)
- [The wallet buttons](#the-wallet-buttons)
- [Vipps MobilePay](#vipps-mobilepay)
- [Pricing, shipping and discounts](#pricing-shipping-and-discounts)
- [The configuration guard](#the-configuration-guard)
- [Local development](#local-development)
- [Going live](#going-live)

## Cards and wallets (Stripe)

Card data goes from the customer's browser to Stripe inside Stripe-hosted fields. It never touches
this codebase or its server, which keeps PCI scope at SAQ A.

1. `POST /api/checkout/intent` quotes the cart and creates or updates a PaymentIntent in NOK. The
   request may only name products, quantities, the chosen size or measurements, a country and a
   discount code. The zod schema is strict and rejects any price field, so changing prices in the
   browser changes nothing. The quote reads products and shipping rules straight from the API, never
   a cache, so an edit in the dashboard is what the next checkout charges.
2. The browser confirms the PaymentIntent with Stripe directly and lands on `/order-complete`, which
   only *reads* the payment's status.
3. `POST /api/webhooks/stripe` records the order, after verifying Stripe's signature on the raw
   body and reading the PaymentIntent back from Stripe. It handles `payment_intent.succeeded`,
   `payment_intent.payment_failed` and `charge.refunded`.

The order document's id is derived from the PaymentIntent id, and it is written with `create` in one
transaction together with the stock decrements. A second delivery of the same event fails as a whole:
one order, one decrement, even for two deliveries in the same instant. If the server's Sanity token
is missing, the webhook answers 500 on purpose, so Stripe keeps retrying and no order is lost.

What the customer chose (sizes, measurements, colours) travels on the PaymentIntent's metadata.
`src/lib/order-metadata.ts` keeps every value under Stripe's 500-character limit.

## The wallet buttons

Apple Pay, Google Pay and Klarna are Stripe-drawn buttons in their brands' official styling, side by
side above an "Or pay with card" divider, with Stripe's card fields below.

The side-by-side part is the non-obvious bit. Stripe's Express Checkout Element lays its buttons out
itself and stacks them once they don't fit the column, so each button gets its **own Elements group**
in its own column of a flex row, each restricted to one method (`paymentMethods`). All groups run in
deferred mode (`mode`, `amount`, `currency`, `paymentMethodTypes`) and confirm the same server-priced
PaymentIntent by client secret. Klarna needs its own group because it is its own payment method type;
the wallets ride on `card`. The card fields are a fourth group with `paymentMethodTypes: ["card"]`
and wallets off, which is what stops Stripe drawing a tab strip.

`applePay: "always"` is what also gets Apple Pay onto desktop Chrome, Edge and Firefox, through
Apple's scan-to-pay code. A column is dropped only once Stripe reports that button unusable in the
browser.

Both wallets need the domain registered under **payment method domains** in the Stripe dashboard
(Settings, Payment methods, Payment method domains), in test mode and again in live mode; the older
Apple Pay-only list is not enough. Registration verifies
`/.well-known/apple-developer-merchantid-domain-association`, which the app serves from `public/`,
so the site must be publicly reachable.

Traps:

- `overflow: "never"` and a `maxRows` above 0 can't be combined.
- An invalid option makes an element fail to mount rather than degrade, which looks exactly like a
  device with no wallets. `?debug=wallets` on the checkout prints each column's reported
  availability.
- Link is switched off in the Stripe payment method configuration.

## Vipps MobilePay

Vipps is integrated directly with the ePayment API (`src/lib/vipps.ts`, `src/lib/vipps-checkout.ts`),
next to Stripe rather than through it.

1. `POST /api/checkout/vipps` quotes the cart the same way the card route does, stores the quote as
   a `vippsPayment` document, creates the payment at Vipps and sends the customer there.
2. `settleVippsPayment` is called from wherever news arrives first: the customer landing back on the
   site, Vipps' webhook (`/api/webhooks/vipps`, HMAC-verified), or a later poll. It does the same
   thing every time: read the live state from Vipps, check the authorised amount against the stored
   quote, capture, and write the order.
3. Every step is idempotent. The capture carries an idempotency key and the order id is derived from
   the payment reference, so two of these racing each other produce one capture and one order.

`VIPPS_ENV` chooses between the test API (`apitest.vipps.no`) and production. A production
deployment refuses to start a Vipps payment with test credentials, and the dashboard shows a warning
until the live keys are in.

`node scripts/vipps-webhook.mjs register <url>` registers the webhook and prints its secret once.

## Pricing, shipping and discounts

All the maths is in `src/lib/pricing.ts`, which is pure and unit-tested. Prices are in øre, in NOK,
with 25% VAT included in the listed price.

- **Shipping** is set in the dashboard: a flat price, a free-shipping threshold, the countries
  offered at checkout, and zones with their own price and threshold. The checkout sends the country
  as soon as it is chosen, so the shipping line follows.
- **Discount codes** are documents: a percentage, an amount or free shipping, with dates, a minimum
  order and a usage cap. The browser sends only the code; `src/lib/discounts.ts` decides what it is
  worth, and recording the order counts the use.
- **Sizing** rides on the cart line (`src/data/cart.ts`: one line per product, size and set of
  measurements), is validated on the server in `quoteCart`, and lands on the order. Sized products
  count down the chosen size's own stock. Tailored pieces are made to order and take no stock.

## The configuration guard

`assertStripeEnvironment()` in `src/lib/stripe.ts` runs before any PaymentIntent is created and
refuses two states outright:

- **Mode mismatch**: a live secret key with a test publishable key, or the reverse. The browser
  couldn't confirm an intent this server created, so the customer would fail at the moment of paying.
- **Live keys with no `STRIPE_WEBHOOK_SECRET`**: the webhook records the order and rejects unsigned
  deliveries, so this state would charge real customers and record nothing.

`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is inlined at build time, so the guard compares the server's key
against the publishable key actually shipped to browsers. Changing it needs a redeploy, not just an
environment edit.

## Local development

```bash
cp .env.example .env.local   # then paste test keys
npm run dev
stripe listen --forward-to localhost:3000/api/webhooks/stripe   # prints the whsec_ for .env.local
```

| Card | Result |
| --- | --- |
| `4242 4242 4242 4242` | Succeeds |
| `4000 0000 0000 0002` | Declined |
| `4000 0025 0000 3155` | Requires 3D Secure |

Any future expiry, any CVC.

## Going live

1. Put the live `STRIPE_SECRET_KEY` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` in the host's
   environment settings (production scope). Never in the repository.
2. Register the webhook again in live mode for `payment_intent.succeeded`,
   `payment_intent.payment_failed` and `charge.refunded`, pointing at `/api/webhooks/stripe` on the
   live domain, and put its signing secret in `STRIPE_WEBHOOK_SECRET`.
3. Register the domain, with and without `www`, under payment method domains in live mode. Apple Pay
   verification fetches the `.well-known` file, so the domain must be reachable without a login.
4. Check the **live** payment method configuration: Apple Pay, Google Pay and Klarna on, Link off.
   Test and live are separate configurations.
5. Set `VIPPS_ENV=production` with the live Vipps keys, and register the Vipps webhook for the live
   domain.
6. Redeploy, since the publishable key is baked into the build.
7. Make one real purchase with a card and one with Vipps. Check that each order appears in the
   dashboard and that the webhook deliveries show 200, then refund them.

The dashboard's Setup page checks most of this and says what is still missing.
