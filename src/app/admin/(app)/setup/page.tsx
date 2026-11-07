import { sendSampleNewsletter, sendTestEmails } from "../actions";
import { analyticsConfigured, serviceAccountEmail } from "@/lib/admin/analytics";
import { Button, Card, Heading, Muted, Subheading, Tag } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/session";
import { emailConfigured } from "@/lib/notify";
import { fromHeader, getEmailSettings } from "@/lib/email-settings";
import { vippsConfigured, vippsEnv } from "@/lib/vipps";

/**
 * Every outside service the shop leans on, with whether it is connected and exactly what to paste
 * where if it isn't. Nothing here is secret: it only reports presence, never values.
 */
export default async function SetupPage({ searchParams }: { searchParams: Promise<{ sent?: string; newsletter?: string; error?: string }> }) {
  const mail = await getEmailSettings();
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
        "Add a live webhook (Developers → Webhooks → /api/webhooks/stripe, events payment_intent.succeeded, payment_intent.payment_failed and charge.refunded) and put its signing secret in STRIPE_WEBHOOK_SECRET.",
        "Register www.prosjectflora.com under Payment method domains in live mode so Apple Pay and Google Pay show.",
        "Redeploy. The site refuses to start payments if the keys don't match each other.",
      ],
    },
    {
      title: "Email (Resend)",
      ok: emailConfigured(),
      status: emailConfigured() ? `Connected — sending as ${fromHeader(mail)}${mail.fromAddress ? "" : " (Resend's test sender)"}` : "Not connected — order confirmations and shipping emails are not being sent",
      how: [
        "Create a free account at resend.com, then API Keys → Create → copy the key.",
        "In Vercel (project → Settings → Environment Variables) add RESEND_API_KEY with that key, and redeploy.",
        "To send from the shop's own address: Resend → Domains → add prosjectflora.com, put the DNS records it shows into one.com, then enter the sender under Settings & brand → Emails.",
        "Who gets told about orders, failed payments and problems is chosen there too.",
      ],
    },
    {
      title: "Google Analytics in the dashboard",
      ok: analyticsConfigured(),
      status: analyticsConfigured() ? `Connected — reading as ${serviceAccountEmail()}` : "The shop counts visitors, but the Visits page can't read the numbers yet",
      how: [
        "The measurement ID (G-…) and property ID are under Settings & brand; the shop asks visitors for consent before anything loads.",
        "Reading the numbers needs the service account flora-dashboard@floora-511706.iam.gserviceaccount.com: in Analytics → Administrator → Tilgangsadministrasjon for området, add it with the Viewer role.",
        "Make its key file (Martin: gcloud iam service-accounts keys create), base64 it, and add it in Vercel as GA_SERVICE_ACCOUNT_B64 (sensitive). Redeploy.",
      ],
    },
    {
      title: "Visitor statistics (Vercel Analytics)",
      ok: true,
      status: "Built in — turn it on once in Vercel: project → Analytics → Enable. Cookieless, so no consent banner is needed.",
      how: [],
    },
    {
      title: "Vipps MobilePay",
      ok: vippsConfigured() && vippsEnv() === "production",
      status: !vippsConfigured() ? "Not connected — the Vipps button says so to customers" : vippsEnv() === "production" ? `Live — sales unit ${process.env.VIPPS_MSN}${process.env.VIPPS_WEBHOOK_SECRET ? "" : " (no webhook secret: orders rely on the customer coming back)"}` : `Test mode — sales unit ${process.env.VIPPS_MSN}, only Vipps test users can pay`,
      how: [
        "In portal.vippsmobilepay.com → Utvikler → API-nøkler, copy the production keys for the FLÖRA sales unit.",
        "In Vercel add VIPPS_ENV=production, VIPPS_MSN, VIPPS_CLIENT_ID, VIPPS_CLIENT_SECRET and VIPPS_SUBSCRIPTION_KEY (all sensitive). Redeploy.",
        "Register the webhook once (Martin: node scripts/vipps-webhook.mjs register https://www.prosjectflora.com/api/webhooks/vipps) and put the secret it prints in VIPPS_WEBHOOK_SECRET.",
        "The live site refuses to start Vipps payments while VIPPS_ENV is test.",
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
