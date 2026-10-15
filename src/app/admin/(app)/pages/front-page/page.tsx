import { saveFrontPage } from "../../actions";
import { ImageField, VideoField } from "@/components/admin/media-field";
import { Bilingual, Button, Card, Checkbox, Heading, Input, Labelled, Muted, Select, Subheading, TextLink } from "@/components/admin/ui";
import { getText, type LocalizedString } from "@/lib/admin/localized";
import { adminClient } from "@/lib/admin/sanity";

type Pic = { _ref: string; url: string } | null;
type Vid = { _ref: string; url: string; filename?: string } | null;
type ValueItem = { _key: string; title?: LocalizedString; description?: LocalizedString; image?: Pic };
type Home = {
  hero?: { video?: Vid; videoUrl?: string; logoPosition?: string };
  productsTitle?: LocalizedString;
  values?: { title?: LocalizedString; intro?: LocalizedString; items?: ValueItem[] };
};

const QUERY = `*[_id == "homePage"][0]{
  ...,
  "hero": { ...hero, "video": select(defined(hero.video.asset) => { "_ref": hero.video.asset._ref, "url": hero.video.asset->url, "filename": hero.video.asset->originalFilename }) },
  "values": { ...values, "items": values.items[]{ _key, title, description, "image": select(defined(image.asset) => { "_ref": image.asset._ref, "url": image.asset->url }) } }
}`;

export default async function FrontPageEditor({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const { saved } = await searchParams;
  const h = (await adminClient().fetch<Home | null>(QUERY)) ?? {};
  // One slot per existing value plus an empty one to add the next.
  const slots: (ValueItem | null)[] = [...(h.values?.items ?? []), null];

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
            <VideoField name="heroVideo" label="Video" hint="MP4 or WebM, muted, ideally under 10 MB — it loops on every visit. Without one, the site uses its built-in video." current={h.hero?.video} />
            <Labelled label="Or a video URL" hint="Used only when no video is uploaded above.">
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
          <Subheading>Products section</Subheading>
          <div className="h-px w-full bg-black/25" />
          <Bilingual name="productsTitle" label="Title" en={getText(h.productsTitle, "en")} no={getText(h.productsTitle, "no")} />
        </Card>

        <Card>
          <Subheading>Values</Subheading>
          <div className="h-px w-full bg-black/25" />
          <div className="flex flex-col gap-[24px]">
            <Bilingual name="valuesTitle" label="Title" en={getText(h.values?.title, "en")} no={getText(h.values?.title, "no")} />
            <Bilingual name="valuesIntro" label="Intro" en={getText(h.values?.intro, "en")} no={getText(h.values?.intro, "no")} multiline rows={4} />
          </div>
          <input type="hidden" name="valueCount" value={slots.length} />
          {slots.map((v, i) => (
            <div key={v?._key ?? "new"} className="flex flex-col gap-[24px] border-t border-black/25 pt-[24px]">
              <Muted>{v ? `Value ${i + 1}` : "Add a value"}</Muted>
              <input type="hidden" name={`valueKey_${i}`} value={v?._key ?? ""} />
              <Bilingual name={`valueTitle_${i}`} label="Title" en={getText(v?.title, "en")} no={getText(v?.title, "no")} />
              <Bilingual name={`valueText_${i}`} label="Text" en={getText(v?.description, "en")} no={getText(v?.description, "no")} multiline rows={4} />
              <ImageField name={`valueImage_${i}`} label="Photo" current={v?.image} />
              {v && <Checkbox name={`valueRemove_${i}`} label="Remove this value" />}
            </div>
          ))}
        </Card>
        <Button className="md:max-w-[320px]">Save</Button>
      </form>
    </>
  );
}
