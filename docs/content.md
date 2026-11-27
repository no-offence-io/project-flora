# Content, the dashboard and the gate

How the shop's content is stored and edited, and the parts around it.

- [The content model](#the-content-model)
- [How the storefront reads it](#how-the-storefront-reads-it)
- [Languages](#languages)
- [The dashboard](#the-dashboard)
- [Email and newsletters](#email-and-newsletters)
- [Brand](#brand)
- [The coming-soon gate](#the-coming-soon-gate)
- [Scripts](#scripts)

## The content model

Everything lives in one Sanity dataset. The schema is in `studio/schemaTypes/`.

| Kind | Documents |
| --- | --- |
| Catalogue | `product` |
| Pages | `homePage`, `aboutPage`, `vintagePage`, `policyPage`, `faqItem`, `post` (the journal) |
| Settings | `siteSettings`: shipping, sizing, brand, shop status, analytics. `emailSettings` (private): who emails come from and who is told about orders and errors |
| Trade | `order`, `customer`, `discount`, `vippsPayment` |
| Audience | `subscriber`, `newsletter` |
| Housekeeping | `notification`, `rateLimit` |

- **Private documents have a dot in their id.** Sanity hands a document to an anonymous reader only
  when its id has no dot, so orders, customers, subscribers, discount codes, Vipps payments,
  newsletters and notifications get ids like `order.<payment>` from `src/lib/doc-ids.ts`. They need
  the server's token whatever the dataset's visibility is. Create them through the shop or the
  dashboard, not by hand in the Studio, which would give them a public id.
- **Orders are written by the payment code only** (`src/lib/record-order.ts`), never by hand. The
  money fields are read-only everywhere; fulfilment status, tracking and notes can be edited.
- **`SANITY_TOKEN` is server-only.** `src/sanity/lib/write.ts` is guarded by `server-only`, and the
  browser is never given a token.
- **Types** are generated from the schema: `cd studio && npm run typegen` rewrites
  `src/sanity/sanity.types.ts`.

## How the storefront reads it

`src/lib/catalog.ts` holds every storefront query, projected straight into the shapes the components
take (`src/lib/catalog-types.ts`). Pages read through `sanityFetch`; checkout pricing
(`src/lib/orders.ts`) reads products and shipping rules from the API directly, so an edit is what
the next checkout charges.

Edits reach the site without anyone having it open. Every storefront read is tagged
`sanity-content`; a Sanity webhook posts to `/api/revalidate` with the `x-revalidate-secret` header
on any publish, which drops the tag. `REVALIDATE_SECRET` must match on the host and in the webhook.

## Languages

Every text field is stored as `[{_key: "en"}, {_key: "no"}]`. Queries take `$lang` and fall back to
English per field:

```groq
coalesce(field[_key == $lang][0].value, field[_key == "en"][0].value)
```

A half-translated site therefore shows English where Norwegian is missing rather than a gap.

The language switch sets a cookie through a server action, so it works without JavaScript. The
interface texts (navigation, cart, checkout, emails) come from one dictionary, `src/lib/i18n.ts`:
server components call `await getT()`, client components call `useT()`. Add a string by adding a key
to both languages; TypeScript refuses unknown keys. The dashboard stays in English.

## The dashboard

`/admin` is the owner's side of the shop, in the site's own design. Sign-in is Google through
Auth.js, and only the addresses in `ADMIN_EMAILS` get in. Every page, every server action and every
route handler checks the session itself, and re-checks the allowlist on each request, so removing an
address locks that person out at once.

- **Media** lists every photo and video with a preview, its size and where it is used. Files can be
  uploaded there or straight from the field that needs them, and deleted only once nothing
  references them. `src/lib/admin/media.ts` turns form fields into Sanity asset references.
- **Products** can be sized three ways (`sizing` on the product): by the customer's measurements in
  centimetres, by a fixed list of sizes with stock per size, or not at all. Colours are sets of the
  product's own photos.
- **Policy pages** are plain paragraphs in the editor; a paragraph written as "Heading — text"
  becomes a collapsible section on the page.
- **Payments** shows the Stripe balance and the latest payments, refunds in full with confirmation,
  and can import the sales made in the same Stripe account before this shop existed
  (`src/lib/admin/stripe-import.ts`). Imported sales become completed orders marked "from Stripe", kept up to date by the sweep:
  no email, no stock, one per charge so importing twice adds nothing, and removable again.
- **Setup** lists every outside service as connected or to-do, with the exact steps.
- **Notifications** (`src/lib/notices.ts`) combines live health checks with events the site writes
  itself (webhooks, emails, sends), and emails the owner about errors.

A Sanity Studio (`studio/`) sits beside the dashboard for direct access to the documents.

## Email and newsletters

Email goes through Resend's HTTP API (`src/lib/notify.ts`, no SDK): order confirmation, shipping
notification with a tracking link, sign-in links, the newsletter welcome, and a test set from the
Setup page. Templates are bilingual and follow the customer's language at the time of ordering.
Without `RESEND_API_KEY` nothing is sent, and the dashboard says so where it matters.

Newsletters are built from blocks (`src/lib/newsletter-blocks.ts`) in a drag-and-drop editor with a
live preview. The server renders them (unit-tested) and sends to every subscriber in their language,
each with a personal unsubscribe link. Product GIFs (`src/lib/admin/gif.ts`) are made from a
product's photos for use in a newsletter.

Sign-ups are `subscriber` documents with ids derived from the address, so signing up twice is a
no-op; a honeypot field drops bots.

## Brand

Settings, then Brand, can replace the logo, choose heading and body typefaces, and set type sizes
and colours. `src/lib/brand.ts` turns that into CSS variables on `<html>`; only what is set is
overridden, so an empty brand changes nothing.

The two built-in typefaces are licensed and are not in the repository. `scripts/fonts.mjs` puts them
in place before `dev` and `build`: the shop's own builds fetch them with the server token, and any
other build gets open-licensed stand-ins. A production build refuses to fall back to stand-ins.

## The coming-soon gate

`src/proxy.ts` holds the whole site behind a "coming soon" page while the shop is closed. (Next.js 16
renamed `middleware.ts` to `proxy.ts`.)

- The switch is in the dashboard under Settings, Shop status. Until something has been saved there,
  the `COMING_SOON` environment variable decides.
- To see the real site while it is closed, open any address with `?preview=<PREVIEW_TOKEN>`. The
  token is swapped for a cookie and dropped from the address bar, so a preview link can be shared
  without the token ending up in someone's history or a screenshot.
- Every address keeps its own URL and simply renders the placeholder (a rewrite, not a redirect), so
  the site's structure isn't advertised. `robots.txt` disallows everything while the gate is on.
- Never gated: the payment webhooks, sign-in, `/admin`, revalidation, and `/.well-known/`, which
  Apple fetches to verify the domain for Apple Pay.

## Scripts

| Script | What it does |
| --- | --- |
| `scripts/fonts.mjs` | Puts the typefaces in place. Runs before `dev` and `build`. |
| `scripts/migrate-content.mjs` | The record of the original content import into Sanity. Re-runnable: it upserts by slug or fixed id. |
| `scripts/translate-no.mjs` | Writes the Norwegian translation next to the English, replacing only the `no` entries. |
| `scripts/vipps-webhook.mjs` | Registers, lists and removes Vipps webhooks. |
| `scripts/private-ids.mjs` | Moves private documents from the old public ids to private ones. Dry run by default. |
