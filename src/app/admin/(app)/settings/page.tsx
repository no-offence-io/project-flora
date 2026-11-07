import { saveSettings } from "../actions";
import { Bilingual, Button, Card, Checkbox, Heading, Input, Labelled, Muted, Select, Subheading, Textarea, TextLink } from "@/components/admin/ui";
import { ImageField } from "@/components/admin/media-field";
import { getText, type LocalizedString } from "@/lib/admin/localized";
import { FONTS } from "@/lib/brand-shared";
import { DEFAULT_LOGO } from "@/lib/brand";
import { getEmailSettings, siteDomain } from "@/lib/email-settings";
import { NOTIFY_SCENARIOS } from "@/lib/email-shared";
import { emailConfigured } from "@/lib/notify";
import { adminClient, oreToKroner } from "@/lib/admin/sanity";

type Settings = {
  siteName?: string; gaMeasurementId?: string; gaPropertyId?: string; announcement?: LocalizedString; signUpTitle?: LocalizedString; signUpText?: LocalizedString; signUpButton?: LocalizedString;
  footerText?: LocalizedString; instagram?: string; contactEmail?: string; shippingOre?: number; freeShippingFromOre?: number;
  signUpImage?: Pic; footerImage?: Pic;
  measurementFields?: { _key: string; label?: LocalizedString; hint?: LocalizedString }[];
  sizeGuide?: LocalizedString;
  shippingZones?: { _key: string; name?: string; countries?: string[]; shippingOre?: number; freeShippingFromOre?: number | null }[];
  shipsTo?: string[];
  brand?: { logo?: Pic; headingFont?: string; bodyFont?: string; headingSizeDesktop?: number; headingSizeMobile?: number; bannerSize?: number; paragraphSize?: number; backgroundColor?: string; textColor?: string };
};
type Pic = { _ref: string; url: string } | null;
const PIC = (f: string) => `"${f}": select(defined(${f}.asset) => { "_ref": ${f}.asset._ref, "url": ${f}.asset->url })`;

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const { saved, error } = await searchParams;
  const s = (await adminClient().fetch<Settings | null>(`*[_id == "siteSettings"][0]{ ..., ${PIC("signUpImage")}, ${PIC("footerImage")}, "brand": { ...brand, ${PIC("logo").replace('"logo"', '"logo"').replace("logo.asset", "brand.logo.asset")} } }`)) ?? {};
  const b = s.brand ?? {};
  const mail = await getEmailSettings();
  const measureSlots = [...(s.measurementFields ?? []), null];
  const zoneSlots = [...(s.shippingZones ?? []), null];
  return (
    <>
      <div className="flex flex-col gap-[12px]">
        <Heading>Site settings</Heading>
        {saved ? <Muted>Saved.</Muted> : <Muted>Things that appear on every page.</Muted>}
        {error && (
          <p className="m-0 font-gotham text-paragraph text-[#b00020]" role="alert">
            {error}
          </p>
        )}
      </div>
      <form action={saveSettings} className="flex max-w-[860px] flex-col gap-[42px]">
        <Card>
          <Subheading>General</Subheading>
          <div className="h-px w-full bg-black/25" />
          <div className="flex flex-col gap-[24px]">
            <Labelled label="Site name"><Input name="siteName" defaultValue={s.siteName ?? "Flöra"} /></Labelled>
            <Bilingual name="announcement" label="Announcement bar (leave empty to hide)" en={getText(s.announcement, "en")} no={getText(s.announcement, "no")} />
            <Labelled label="Google Analytics measurement ID" hint="Looks like G-AB12CD34EF — in Analytics under Administrator → Datastrømmer. Visitors are asked before anything loads. Leave empty to turn analytics off.">
              <Input name="gaMeasurementId" defaultValue={s.gaMeasurementId ?? ""} placeholder="G-…" autoComplete="off" />
            </Labelled>
            <Labelled label="Google Analytics property ID" hint="Nine digits — in Analytics under Administrator → Områdedetaljer. What the Visits page reads.">
              <Input name="gaPropertyId" defaultValue={s.gaPropertyId ?? ""} placeholder="123456789" inputMode="numeric" autoComplete="off" />
            </Labelled>
          </div>
        </Card>
        <Card>
          <Subheading>Brand</Subheading>
          <div className="h-px w-full bg-black/25" />
          <Muted>The look of the whole site. What you see here is what the site uses right now — the built-in design unless you have changed it. Edit anything and save.</Muted>
          <ImageField name="brandLogo" label="Logo" hint="White on a transparent background, SVG or PNG. The site darkens it where it sits on white." current={b.logo} placeholder={DEFAULT_LOGO} dark />
          <Muted className="text-[11px]">The browser-tab and home-screen icon has its own page: <TextLink href="/admin/icon">Icon</TextLink>.</Muted>
          <div className="flex flex-col gap-[24px] md:flex-row">
            <Labelled label="Heading font" className="flex-1">
              <Select name="headingFont" defaultValue={b.headingFont ?? ""}>
                <option value="">Americana (built-in)</option>
                {Object.entries(FONTS).map(([key, f]) => (
                  <option key={key} value={key}>{f.label}</option>
                ))}
              </Select>
            </Labelled>
            <Labelled label="Text font" className="flex-1">
              <Select name="bodyFont" defaultValue={b.bodyFont ?? ""}>
                <option value="">Gotham (built-in)</option>
                {Object.entries(FONTS).map(([key, f]) => (
                  <option key={key} value={key}>{f.label}</option>
                ))}
              </Select>
            </Labelled>
          </div>
          <div className="grid grid-cols-2 gap-[12px] md:grid-cols-4 md:gap-[24px]">
            <Labelled label="Heading, desktop (px)"><Input name="headingSizeDesktop" inputMode="decimal" defaultValue={b.headingSizeDesktop ?? 60} /></Labelled>
            <Labelled label="Heading, mobile (px)"><Input name="headingSizeMobile" inputMode="decimal" defaultValue={b.headingSizeMobile ?? 24} /></Labelled>
            <Labelled label="Banner title (px)"><Input name="bannerSize" inputMode="decimal" defaultValue={b.bannerSize ?? 80} /></Labelled>
            <Labelled label="Paragraph (px)"><Input name="paragraphSize" inputMode="decimal" defaultValue={b.paragraphSize ?? 13.35} /></Labelled>
          </div>
          <div className="flex flex-col gap-[24px] md:flex-row">
            <Labelled label="Background colour" hint="Hex, e.g. #ffffff" className="flex-1">
              <div className="flex items-center gap-[12px]">
                <span aria-hidden className="h-[24px] w-[24px] shrink-0 rounded-full border border-black/20" style={{ backgroundColor: b.backgroundColor ?? "#ffffff" }} />
                <Input name="backgroundColor" defaultValue={b.backgroundColor ?? "#ffffff"} pattern="#([0-9a-fA-F]{3}){1,2}" />
              </div>
            </Labelled>
            <Labelled label="Text colour" hint="Hex, e.g. #000000" className="flex-1">
              <div className="flex items-center gap-[12px]">
                <span aria-hidden className="h-[24px] w-[24px] shrink-0 rounded-full border border-black/20" style={{ backgroundColor: b.textColor ?? "#000000" }} />
                <Input name="textColor" defaultValue={b.textColor ?? "#000000"} pattern="#([0-9a-fA-F]{3}){1,2}" />
              </div>
            </Labelled>
          </div>
        </Card>

        <Card>
          <Subheading>Sign-up banner</Subheading>
          <div className="h-px w-full bg-black/25" />
          <div className="flex flex-col gap-[24px]">
            <Bilingual name="signUpTitle" label="Title" en={getText(s.signUpTitle, "en")} no={getText(s.signUpTitle, "no")} />
            <Bilingual name="signUpText" label="Text" en={getText(s.signUpText, "en")} no={getText(s.signUpText, "no")} multiline rows={3} />
            <Bilingual name="signUpButton" label="Button label" en={getText(s.signUpButton, "en")} no={getText(s.signUpButton, "no")} />
            <ImageField name="signUpImage" label="Background photo" current={s.signUpImage} placeholder="/signup/signup-bg.jpg" />
          </div>
        </Card>
        <Card>
          <Subheading>Emails</Subheading>
          <div className="h-px w-full bg-black/25" />
          <Muted>{emailConfigured() ? `What customers see as the sender, and what you get told about. Sending as ${mail.fromAddress ?? "Resend's test sender"} right now.` : "Email isn't connected yet (see Setup). These settings apply once it is."}</Muted>
          <div className="flex flex-col gap-[24px] md:flex-row">
            <Labelled label="Sender name" hint="Shown as the sender in the customer's inbox." className="flex-1"><Input name="fromName" defaultValue={mail.fromName} /></Labelled>
            <Labelled label="Sender address" hint={`Has to end with @${siteDomain()}. The mailbox doesn't need to exist.`} className="flex-1"><Input name="fromAddress" type="email" defaultValue={mail.fromAddress ?? ""} placeholder={`hello@${siteDomain()}`} /></Labelled>
          </div>
          <Labelled label="Replies go to" hint="When a customer replies to an order email, it lands here. Any address works."><Input name="replyTo" type="email" defaultValue={mail.replyTo ?? ""} /></Labelled>
          <Labelled label="Your notifications go to" hint="One or more addresses, comma-separated. Leave empty to get none."><Input name="notifyTo" defaultValue={mail.notifyTo.join(", ")} placeholder="ida@example.com" /></Labelled>
          <div className="flex flex-col gap-[12px]">
            <span className="font-gotham text-[11px] leading-normal text-black">Email me about</span>
            {NOTIFY_SCENARIOS.map((sc) => (
              <div key={sc.key} className="flex flex-col gap-[2px]">
                <Checkbox name="notifyOn" value={sc.key} label={sc.label} defaultChecked={mail.notifyOn.includes(sc.key)} />
                <span className="pl-[22px] font-gotham text-[11px] leading-normal text-black/50">{sc.hint}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <Subheading>Footer</Subheading>
          <div className="h-px w-full bg-black/25" />
          <div className="flex flex-col gap-[24px]">
            <Bilingual name="footerText" label="Footer text" en={getText(s.footerText, "en")} no={getText(s.footerText, "no")} multiline rows={3} />
            <ImageField name="footerImage" label="Background photo" current={s.footerImage} placeholder="/footer/footer-bg.jpg" />
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
