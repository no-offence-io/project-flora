import { saveVintagePage } from "../../actions";
import { ImageField } from "@/components/admin/media-field";
import { Bilingual, Button, Card, Heading, Muted, TextLink } from "@/components/admin/ui";
import { getText, type LocalizedString } from "@/lib/admin/localized";
import { adminClient } from "@/lib/admin/sanity";

type Vintage = { title?: LocalizedString; intro?: LocalizedString; emptyText?: LocalizedString; image?: { _ref: string; url: string } | null };

export default async function VintageEditor({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const { saved } = await searchParams;
  const d = (await adminClient().fetch<Vintage | null>(`*[_id == "vintagePage"][0]{ ..., "image": select(defined(image.asset) => { "_ref": image.asset._ref, "url": image.asset->url }) }`)) ?? {};
  return (
    <>
      <div className="flex flex-col gap-[12px]">
        <TextLink href="/admin/pages">← Pages</TextLink>
        <Heading>Vintage</Heading>
        <Muted>The pieces on this page are the products with &quot;Vintage piece&quot; ticked.</Muted>
        {saved && <Muted>Saved.</Muted>}
      </div>
      <form action={saveVintagePage} className="flex max-w-[860px] flex-col gap-[42px]">
        <Card>
          <div className="flex flex-col gap-[24px]">
            <Bilingual name="title" label="Title" en={getText(d.title, "en")} no={getText(d.title, "no")} required />
            <Bilingual name="intro" label="Intro" en={getText(d.intro, "en")} no={getText(d.intro, "no")} multiline rows={4} />
            <Bilingual name="emptyText" label="Text when nothing is for sale" en={getText(d.emptyText, "en")} no={getText(d.emptyText, "no")} multiline rows={2} />
            <ImageField name="image" label="Top photo" current={d.image} />
          </div>
        </Card>
        <Button className="md:max-w-[320px]">Save</Button>
      </form>
    </>
  );
}
