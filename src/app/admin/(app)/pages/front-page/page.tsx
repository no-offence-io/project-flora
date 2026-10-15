import { saveFrontPage } from "../../actions";
import { Bilingual, Button, Card, Heading, Input, Labelled, Muted, Select, Subheading, TextLink } from "@/components/admin/ui";
import { getText, type LocalizedString } from "@/lib/admin/localized";
import { adminClient } from "@/lib/admin/sanity";

type Home = { hero?: { videoUrl?: string; logoPosition?: string }; productsTitle?: LocalizedString; values?: { title?: LocalizedString; intro?: LocalizedString } };

export default async function FrontPageEditor({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const { saved } = await searchParams;
  const h = (await adminClient().fetch<Home | null>(`*[_id == "homePage"][0]`)) ?? {};
  return (
    <>
      <div className="flex flex-col gap-[12px]">
        <TextLink href="/admin/pages">← Pages</TextLink>
        <Heading>Front page</Heading>
        {saved && <Muted>Saved.</Muted>}
      </div>
      <form action={saveFrontPage} className="flex max-w-[860px] flex-col gap-[42px]">
        <Card>
          <Subheading>Top video</Subheading>
          <div className="h-px w-full bg-black/25" />
          <div className="flex flex-col gap-[24px]">
            <Labelled label="Video URL" hint="A hosted MP4. Keep it short and muted; it loops in the background.">
              <Input name="videoUrl" type="url" defaultValue={h.hero?.videoUrl ?? ""} />
            </Labelled>
            <Labelled label="Logo position">
              <Select name="logoPosition" defaultValue={h.hero?.logoPosition ?? "left"}>
                <option value="left">Left</option>
                <option value="center">Centre</option>
              </Select>
            </Labelled>
          </div>
        </Card>
        <Card>
          <Subheading>Sections</Subheading>
          <div className="h-px w-full bg-black/25" />
          <div className="flex flex-col gap-[24px]">
            <Bilingual name="productsTitle" label="Products section title" en={getText(h.productsTitle, "en")} no={getText(h.productsTitle, "no")} />
            <Bilingual name="valuesTitle" label="Values title" en={getText(h.values?.title, "en")} no={getText(h.values?.title, "no")} />
            <Bilingual name="valuesIntro" label="Values intro" en={getText(h.values?.intro, "en")} no={getText(h.values?.intro, "no")} multiline rows={4} />
            <Muted>The four values with their photos are edited in the Studio for now.</Muted>
          </div>
        </Card>
        <Button className="md:max-w-[320px]">Save</Button>
      </form>
    </>
  );
}
