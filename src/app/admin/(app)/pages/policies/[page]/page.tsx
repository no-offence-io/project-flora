import { notFound } from "next/navigation";
import { savePolicy } from "../../../actions";
import { Bilingual, Button, Card, Heading, Muted, TextLink } from "@/components/admin/ui";
import { getBlocksText, getText, type LocalizedBlocks, type LocalizedString } from "@/lib/admin/localized";
import { adminClient } from "@/lib/admin/sanity";

const TITLES: Record<string, string> = { terms: "Terms", "refunds-and-exchange": "Refunds & exchange", privacy: "Privacy", shipping: "Shipping" };
/** What Norwegian consumer law (angrerettloven, forbrukerkjøpsloven, ehandelsloven) and GDPR expect each page to cover. */
const MUST_HAVE: Record<string, string[]> = {
  terms: ["Who sells: company name, organisation number, address and email.", "Prices include 25% VAT; what currency.", "How an order is confirmed and when the contract is binding.", "Payment methods.", "Delivery times, and that made-to-measure pieces are sewn to the customer's measurements.", "Complaints (reklamasjon): 2 years under forbrukerkjøpsloven.", "Disputes: Forbrukertilsynet / the EU ODR platform."],
  "refunds-and-exchange": ["14-day right of withdrawal (angrerett) from delivery, and the withdrawal form.", "Exception: made-to-measure garments are exempt from angrerett — say so clearly, before purchase.", "Condition items must be returned in; who pays return shipping.", "How refunds are made and within how many days (14)."],
  privacy: ["What is collected: name, address, email, phone, measurements, order history.", "Why: to fulfil orders, send order emails, and the newsletter if signed up.", "Processors: Stripe (payment), Sanity (storage), Vercel (hosting), Resend (email).", "How long data is kept; the right to access, correct and delete; how to contact you."],
  shipping: ["Which countries, carriers and prices (matches the shipping zones in Settings).", "Delivery time, including sewing time for made-to-measure.", "Who pays customs outside Norway/EU."],
};
type Policy = { title?: LocalizedString; intro?: LocalizedString; body?: LocalizedBlocks };

export default async function PolicyEditor({ params, searchParams }: { params: Promise<{ page: string }>; searchParams: Promise<{ saved?: string }> }) {
  const { page } = await params;
  const { saved } = await searchParams;
  if (!TITLES[page]) notFound();
  const d = (await adminClient().fetch<Policy | null>(`*[_id == $id][0]`, { id: `policy-${page}` })) ?? {};
  return (
    <>
      <div className="flex flex-col gap-[12px]">
        <TextLink href="/admin/pages">← Pages</TextLink>
        <Heading>{TITLES[page]}</Heading>
        {saved && <Muted>Saved.</Muted>}
      </div>
      <form action={savePolicy} className="flex max-w-[860px] flex-col gap-[42px]">
        <input type="hidden" name="page" value={page} />
        <Card>
          <div className="flex flex-col gap-[24px]">
            <Bilingual name="title" label="Title" en={getText(d.title, "en")} no={getText(d.title, "no")} required />
            <Bilingual name="intro" label="Intro" en={getText(d.intro, "en")} no={getText(d.intro, "no")} multiline rows={3} />
            <Bilingual name="body" label="Text" en={getBlocksText(d.body, "en")} no={getBlocksText(d.body, "no")} multiline rows={14} />
            <Muted>Leave an empty line between paragraphs. Start a paragraph with a heading and a dash, e.g. &quot;Orders — An order is confirmed…&quot;, and it becomes a collapsible section on the site.</Muted>
          </div>
        </Card>
        <Card>
          <Muted>This page should cover:</Muted>
          <ul className="m-0 flex list-disc flex-col gap-[6px] pl-[18px] text-[11px] leading-normal text-black/70">
            {(MUST_HAVE[page] ?? []).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </Card>
        <Button className="md:max-w-[320px]">Save</Button>
      </form>
    </>
  );
}
