import { notFound } from "next/navigation";
import { savePolicy } from "../../../actions";
import { Bilingual, Button, Card, Heading, Muted, TextLink } from "@/components/admin/ui";
import { getBlocksText, getText, type LocalizedBlocks, type LocalizedString } from "@/lib/admin/localized";
import { adminClient } from "@/lib/admin/sanity";

const TITLES: Record<string, string> = { terms: "Terms", "refunds-and-exchange": "Refunds & exchange", privacy: "Privacy", shipping: "Shipping" };
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
            <Muted>Leave an empty line between paragraphs.</Muted>
          </div>
        </Card>
        <Button className="md:max-w-[320px]">Save</Button>
      </form>
    </>
  );
}
