import { sendSampleNewsletter, sendTestEmails } from "../actions";
import { Button, Card, Heading, Muted, Subheading, Tag } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/session";
import { emailConfigured } from "@/lib/notify";

/**
 * Every outside service the shop leans on, with whether it is connected and exactly what to paste
 * where if it isn't. Nothing here is secret: it only reports presence, never values.
 */
export default async function SetupPage({ searchParams }: { searchParams: Promise<{ sent?: string; newsletter?: string; error?: string }> }) {
  const admin = await requireAdmin();
  const { sent, newsletter, error } = await searchParams;
  const stripeKey = process.env.STRIPE_SECRET_KEY ?? "";
  const stripeMode = stripeKey.startsWith("sk_live_") ? "live" : stripeKey.startsWith("sk_test_") ? "test" : "missing";
  const items: { title: string; ok: boolean; status: string; how: string[] }[] = [
    {
      title: "Payments (Stripe)",
      ok: stripeMode !== "missing",
      status: stripeMode === "live" ? "Live — real cards are charged" : stripeMode === "test" ? "Test mode — only test cards work" : "Not connected",
      how: [
        "Going live: in Stripe switch to live mode and copy the live secret and publishable keys into Vercel as STRIPE_SECRET_KEY and NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.",
        "Add a live webhook (Developers → Webhooks → /api/webhooks/stripe, event payment_intent.succeeded) and put its signing secret in STRIPE_WEBHOOK_SECRET.",
        "Register www.prosjectflora.com under Payment method domains in live mode so Apple Pay and Google Pay show.",
        "Redeploy. The site refuses to start payments if the keys don't match each other.",
      ],
    },
    {
      title: "Email (Resend)",
      ok: emailConfigured(),
      status: emailConfigured() ? `Connected — sending as ${process.env.EMAIL_FROM || "onboarding@resend.dev (Resend's test sender)"}` : "Not connected — order confirmations and shipping emails are not being sent",
      how: [
        "Create a free account at resend.com, then API Keys → Create → copy the key.",
        "In Vercel (project → Settings → Environment Variables) add RESEND_API_KEY with that key, and redeploy.",
        "To send from the shop's own address: Resend → Domains → add prosjectflora.com, put the DNS records it shows into one.com, then set EMAIL_FROM to \"Flöra <hello@prosjectflora.com>\".",
        "Optional: EMAIL_NOTIFY = the address that should get a copy of every order.",
      ],
    },
    {
      title: "Visitor statistics (Vercel Analytics)",
      ok: true,
      status: "Built in — turn it on once in Vercel: project → Analytics → Enable. Cookieless, so no consent banner is needed.",
      how: [],
    },
    {
      title: "Vipps",
      ok: false,
      status: "Placeholder button — not connected",
      how: [
        "Needs a Vipps MobilePay merchant agreement (portal.vippsmobilepay.com) for the company; that gives a client id, client secret, subscription key and merchant serial number.",
        "Once those exist, the button can be wired to Vipps's ePayment API. Until then it tells customers to pick another method.",
      ],
    },
    {
      title: "Sanity content",
      ok: Boolean(process.env.SANITY_TOKEN),
      status: process.env.SANITY_TOKEN ? "Connected" : "SANITY_TOKEN missing — orders cannot be recorded",
      how: ["sanity.io/manage → project → API → Tokens → a token with Editor rights, as SANITY_TOKEN."],
    },
  ];

  return (
    <>
      <div className="flex flex-col gap-[12px]">
        <Heading>Setup</Heading>
        <Muted>What the shop is connected to. Keys live in Vercel, never here.</Muted>
        {sent && <Muted>Four test emails were sent to {sent} — a test note, an order confirmation, a shipping email and the newsletter welcome.</Muted>}
        {newsletter && <Muted>A sample &quot;New collection&quot; newsletter was sent to {newsletter}.</Muted>}
        {error && (
          <p className="m-0 font-gotham text-paragraph text-[#b00020]" role="alert">
            {error}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-[42px] md:max-w-[860px]">
        {items.map((it) => (
          <Card key={it.title}>
            <div className="flex items-center justify-between gap-[12px]">
              <Subheading>{it.title}</Subheading>
              <Tag tone={it.ok ? "default" : "muted"}>{it.ok ? "connected" : "to do"}</Tag>
            </div>
            <div className="h-px w-full bg-black/25" />
            <Muted>{it.status}</Muted>
            {it.how.length > 0 && (
              <ol className="m-0 flex list-decimal flex-col gap-[6px] pl-[18px] text-[11px] leading-normal text-black/70">
                {it.how.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            )}
            {it.title.startsWith("Email") && emailConfigured() && (
              <div className="flex flex-col gap-[12px] md:max-w-[320px]">
                <form action={sendTestEmails}>
                  <Button>Send test emails to {admin.email}</Button>
                </form>
                <form action={sendSampleNewsletter}>
                  <Button>Send a sample newsletter</Button>
                </form>
              </div>
            )}
          </Card>
        ))}
      </div>
    </>
  );
}
