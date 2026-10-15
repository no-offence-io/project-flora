import { saveSettings } from "../actions";
import { Bilingual, Button, Card, Heading, Input, Labelled, Muted, Subheading } from "@/components/admin/ui";
import { ImageField } from "@/components/admin/media-field";
import { getText, type LocalizedString } from "@/lib/admin/localized";
import { adminClient, oreToKroner } from "@/lib/admin/sanity";

type Settings = {
  siteName?: string; announcement?: LocalizedString; signUpTitle?: LocalizedString; signUpText?: LocalizedString; signUpButton?: LocalizedString;
  footerText?: LocalizedString; instagram?: string; contactEmail?: string; shippingOre?: number; freeShippingFromOre?: number;
  signUpImage?: Pic; footerImage?: Pic;
};
type Pic = { _ref: string; url: string } | null;
const PIC = (f: string) => `"${f}": select(defined(${f}.asset) => { "_ref": ${f}.asset._ref, "url": ${f}.asset->url })`;

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const { saved } = await searchParams;
  const s = (await adminClient().fetch<Settings | null>(`*[_id == "siteSettings"][0]{ ..., ${PIC("signUpImage")}, ${PIC("footerImage")} }`)) ?? {};
  return (
    <>
      <div className="flex flex-col gap-[12px]">
        <Heading>Site settings</Heading>
        {saved ? <Muted>Saved.</Muted> : <Muted>Things that appear on every page.</Muted>}
      </div>
      <form action={saveSettings} className="flex max-w-[860px] flex-col gap-[42px]">
        <Card>
          <Subheading>General</Subheading>
          <div className="h-px w-full bg-black/25" />
          <div className="flex flex-col gap-[24px]">
            <Labelled label="Site name"><Input name="siteName" defaultValue={s.siteName ?? "Flöra"} /></Labelled>
            <Bilingual name="announcement" label="Announcement bar (leave empty to hide)" en={getText(s.announcement, "en")} no={getText(s.announcement, "no")} />
          </div>
        </Card>
        <Card>
          <Subheading>Sign-up banner</Subheading>
          <div className="h-px w-full bg-black/25" />
          <div className="flex flex-col gap-[24px]">
            <Bilingual name="signUpTitle" label="Title" en={getText(s.signUpTitle, "en")} no={getText(s.signUpTitle, "no")} />
            <Bilingual name="signUpText" label="Text" en={getText(s.signUpText, "en")} no={getText(s.signUpText, "no")} multiline rows={3} />
            <Bilingual name="signUpButton" label="Button label" en={getText(s.signUpButton, "en")} no={getText(s.signUpButton, "no")} />
            <ImageField name="signUpImage" label="Background photo" hint="Leave empty to keep the built-in photo." current={s.signUpImage} />
          </div>
        </Card>
        <Card>
          <Subheading>Footer</Subheading>
          <div className="h-px w-full bg-black/25" />
          <div className="flex flex-col gap-[24px]">
            <Bilingual name="footerText" label="Footer text" en={getText(s.footerText, "en")} no={getText(s.footerText, "no")} multiline rows={3} />
            <ImageField name="footerImage" label="Background photo" hint="Leave empty to keep the built-in photo." current={s.footerImage} />
            <div className="flex flex-col gap-[24px] md:flex-row">
              <Labelled label="Instagram URL" className="flex-1"><Input name="instagram" type="url" defaultValue={s.instagram ?? ""} /></Labelled>
              <Labelled label="Contact email" className="flex-1"><Input name="contactEmail" type="email" defaultValue={s.contactEmail ?? ""} /></Labelled>
            </div>
          </div>
        </Card>
        <Card>
          <Subheading>Shop rules</Subheading>
          <div className="h-px w-full bg-black/25" />
          <div className="flex flex-col gap-[24px] md:flex-row">
            <Labelled label="Shipping (kr)" className="flex-1"><Input name="shipping" inputMode="decimal" defaultValue={oreToKroner(s.shippingOre ?? 8900)} /></Labelled>
            <Labelled label="Free shipping from (kr)" hint="Leave empty for never." className="flex-1"><Input name="freeShippingFrom" inputMode="decimal" defaultValue={oreToKroner(s.freeShippingFromOre ?? 150000)} /></Labelled>
          </div>
        </Card>
        <Button className="md:max-w-[320px]">Save</Button>
      </form>
    </>
  );
}
