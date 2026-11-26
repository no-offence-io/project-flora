import { saveAboutPage } from "../../actions";
import { ImageField } from "@/components/admin/media-field";
import { Bilingual, Button, Card, Heading, Muted, TextLink } from "@/components/admin/ui";
import { getBlocksText, getText, type LocalizedBlocks, type LocalizedString } from "@/lib/admin/localized";
import { adminClient } from "@/lib/admin/sanity";
import { requireAdmin } from "@/lib/admin/session";

type About = { title?: LocalizedString; intro?: LocalizedString; body?: LocalizedBlocks; image?: { _ref: string; url: string } | null };

export default async function AboutEditor({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  await requireAdmin();
  const { saved } = await searchParams;
  const d = (await adminClient().fetch<About | null>(`*[_id == "aboutPage"][0]{ ..., "image": select(defined(image.asset) => { "_ref": image.asset._ref, "url": image.asset->url, "alt": image.alt, "scale": image.scale, "x": image.x, "y": image.y }) }`)) ?? {};
  return (
    <>
      <div className="flex flex-col gap-[12px]">
        <TextLink href="/admin/pages">← Pages</TextLink>
        <Heading>About</Heading>
        {saved && <Muted>Saved.</Muted>}
      </div>
      <form action={saveAboutPage} className="flex max-w-[860px] flex-col gap-[42px]">
        <Card>
          <div className="flex flex-col gap-[24px]">
            <Bilingual name="title" label="Title" en={getText(d.title, "en")} no={getText(d.title, "no")} required />
            <Bilingual name="intro" label="Intro" en={getText(d.intro, "en")} no={getText(d.intro, "no")} multiline rows={3} />
            <Bilingual name="body" label="Text" en={getBlocksText(d.body, "en")} no={getBlocksText(d.body, "no")} multiline rows={12} />
            <Muted>Leave an empty line between paragraphs.</Muted>
            <ImageField name="image" label="Photo" current={d.image} />
          </div>
        </Card>
        <Button className="md:max-w-[320px]">Save</Button>
      </form>
    </>
  );
}
