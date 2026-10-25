import { saveSettings } from "../actions";
import { Bilingual, Button, Card, Checkbox, Heading, Input, Labelled, Muted, Subheading, Textarea } from "@/components/admin/ui";
import { ImageField } from "@/components/admin/media-field";
import { getText, type LocalizedString } from "@/lib/admin/localized";
import { adminClient, oreToKroner } from "@/lib/admin/sanity";

type Settings = {
  siteName?: string; announcement?: LocalizedString; signUpTitle?: LocalizedString; signUpText?: LocalizedString; signUpButton?: LocalizedString;
  footerText?: LocalizedString; instagram?: string; contactEmail?: string; shippingOre?: number; freeShippingFromOre?: number;
  signUpImage?: Pic; footerImage?: Pic;
  measurementFields?: { _key: string; label?: LocalizedString; hint?: LocalizedString }[];
  sizeGuide?: LocalizedString;
  shippingZones?: { _key: string; name?: string; countries?: string[]; shippingOre?: number; freeShippingFromOre?: number | null }[];
  shipsTo?: string[];
};
type Pic = { _ref: string; url: string } | null;
const PIC = (f: string) => `"${f}": select(defined(${f}.asset) => { "_ref": ${f}.asset._ref, "url": ${f}.asset->url })`;

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const { saved } = await searchParams;
  const s = (await adminClient().fetch<Settings | null>(`*[_id == "siteSettings"][0]{ ..., ${PIC("signUpImage")}, ${PIC("footerImage")} }`)) ?? {};
  const measureSlots = [...(s.measurementFields ?? []), null];
  const zoneSlots = [...(s.shippingZones ?? []), null];
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
          <Subheading>Shipping</Subheading>
          <div className="h-px w-full bg-black/25" />
          <div className="flex flex-col gap-[24px] md:flex-row">
            <Labelled label="Shipping (kr)" hint="For countries not in a zone below." className="flex-1"><Input name="shipping" inputMode="decimal" defaultValue={oreToKroner(s.shippingOre ?? 8900)} /></Labelled>
            <Labelled label="Free shipping from (kr)" hint="Leave empty for never." className="flex-1"><Input name="freeShippingFrom" inputMode="decimal" defaultValue={oreToKroner(s.freeShippingFromOre ?? 150000)} /></Labelled>
          </div>
          <Labelled label="Countries we ship to" hint="One per line or comma-separated, as the checkout should list them. Leave empty for Norway, Sweden, Denmark, Finland, Germany, United Kingdom.">
            <Textarea name="shipsTo" rows={3} defaultValue={(s.shipsTo ?? []).join("\n")} />
          </Labelled>
          <Muted>Zones — countries with their own price:</Muted>
          <input type="hidden" name="zoneCount" value={zoneSlots.length} />
          {zoneSlots.map((z, i) => (
            <div key={z?._key ?? "new"} className="flex flex-col gap-[12px] border-t border-black/25 pt-[12px]">
              <input type="hidden" name={`zoneKey_${i}`} value={z?._key ?? ""} />
              <div className="flex flex-col gap-[12px] md:flex-row">
                <Labelled label="Name" className="flex-1"><Input name={`zoneName_${i}`} defaultValue={z?.name ?? ""} placeholder={z ? "" : "e.g. Nordics"} /></Labelled>
                <Labelled label="Shipping (kr)" className="md:w-[140px]"><Input name={`zonePrice_${i}`} inputMode="decimal" defaultValue={oreToKroner(z?.shippingOre)} /></Labelled>
                <Labelled label="Free from (kr)" className="md:w-[140px]"><Input name={`zoneFreeFrom_${i}`} inputMode="decimal" defaultValue={oreToKroner(z?.freeShippingFromOre)} /></Labelled>
              </div>
              <Labelled label="Countries" hint="Comma-separated, spelled as in the list above."><Input name={`zoneCountries_${i}`} defaultValue={(z?.countries ?? []).join(", ")} /></Labelled>
              {z && <Checkbox name={`zoneRemove_${i}`} label="Remove this zone" />}
            </div>
          ))}
        </Card>

        <Card>
          <Subheading>Sizing</Subheading>
          <div className="h-px w-full bg-black/25" />
          <Muted>What a customer fills in, in cm, for made-to-measure products. Empty = Bust, Waist, Hips, Height.</Muted>
          <input type="hidden" name="measureCount" value={measureSlots.length} />
          {measureSlots.map((m, i) => (
            <div key={m?._key ?? "new"} className="flex flex-col gap-[12px] border-t border-black/25 pt-[12px]">
              <input type="hidden" name={`measureKey_${i}`} value={m?._key ?? ""} />
              <Bilingual name={`measureLabel_${i}`} label={m ? `Measurement ${i + 1}` : "Add a measurement"} en={getText(m?.label, "en")} no={getText(m?.label, "no")} />
              <Bilingual name={`measureHint_${i}`} label="How to measure (optional)" en={getText(m?.hint, "en")} no={getText(m?.hint, "no")} />
              {m && <Checkbox name={`measureRemove_${i}`} label="Remove" />}
            </div>
          ))}
          <Bilingual name="sizeGuide" label="Size guide, shown under the measurements on the product page" en={getText(s.sizeGuide, "en")} no={getText(s.sizeGuide, "no")} multiline rows={5} />
        </Card>
        <Button className="md:max-w-[320px]">Save</Button>
      </form>
    </>
  );
}
