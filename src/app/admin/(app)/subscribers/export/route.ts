import { adminClient } from "@/lib/admin/sanity";
import { requireAdmin } from "@/lib/admin/session";

/** The active list as CSV, for Mailchimp or a spreadsheet. Behind the same login as the pages. */
export async function GET() {
  await requireAdmin();
  const subs = await adminClient().fetch<{ email: string; language?: string; signedUpAt?: string }[]>(
    `*[_type == "subscriber" && !defined(unsubscribedAt) && defined(email)] | order(signedUpAt desc){ email, language, signedUpAt }`,
  );
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const csv = ["email,language,signed_up", ...subs.map((s) => [esc(s.email), esc(s.language ?? "en"), esc(s.signedUpAt ?? "")].join(","))].join("\n");
  return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="flora-subscribers-${new Date().toISOString().slice(0, 10)}.csv"` } });
}
