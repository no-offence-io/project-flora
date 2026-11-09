import { saveIcon } from "./actions";
import { ImageField } from "@/components/admin/media-field";
import { Button, Card, Heading, Muted, Subheading } from "@/components/admin/ui";
import { adminClient } from "@/lib/admin/sanity";
import { squarePng } from "@/lib/brand";
import { FAVICON_LABEL, FAVICON_STYLES, faviconSvg, parseFaviconStyle } from "@/lib/favicon";

type Pic = { _ref: string; url: string } | null;
type IconSettings = { favicon?: string; tabIcon?: Pic; homeIcon?: Pic; androidIcon?: Pic };
const PIC = (f: string) => `"${f}": select(defined(brand.${f}.asset) => { "_ref": brand.${f}.asset._ref, "url": brand.${f}.asset->url })`;

/*
 * Previews are drawn with CSS, not screenshots, so they always show the icon as it is right now.
 * They sit in an `admin-true-colors` wrapper, which night mode inverts back so a Safari tab is
 * light and a Chrome tab dark whatever the admin's mode. The icons inside are background images
 * rather than <img>, which night mode would invert on its own.
 */
const Icon = ({ src, px, radius = "0", className = "" }: { src: string; px: number; radius?: string; className?: string }) => (
  <span aria-hidden className={`inline-block shrink-0 ${className}`} style={{ width: px, height: px, borderRadius: radius, backgroundImage: `url("${src}")`, backgroundSize: "cover" }} />
);

function Mock({ title, note, children }: { title: string; note: string; children: React.ReactNode }) {
  return (
    <figure className="m-0 flex flex-col gap-[8px]">
      {children}
      <figcaption className="flex flex-col gap-[2px] font-gotham text-[11px] leading-normal">
        <span className="text-black">{title}</span>
        <span className="text-black/50">{note}</span>
      </figcaption>
    </figure>
  );
}

const SF = { fontFamily: "-apple-system, 'Helvetica Neue', Arial, sans-serif" } as const;

export default async function IconPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const { saved, error } = await searchParams;
  const s = (await adminClient().fetch<IconSettings | null>(`*[_id == "siteSettings"][0]{ "favicon": brand.favicon, ${PIC("tabIcon")}, ${PIC("homeIcon")}, ${PIC("androidIcon")} }`)) ?? {};
  const style = parseFaviconStyle(s.favicon);
  const builtIn = `data:image/svg+xml;utf8,${encodeURIComponent(faviconSvg(style))}`;
  // What each place shows today, with the same fallbacks the live routes use.
  const tab = s.tabIcon ? squarePng(s.tabIcon.url, 128) : builtIn;
  const home = s.homeIcon ? squarePng(s.homeIcon.url, 180, true) : s.tabIcon ? squarePng(s.tabIcon.url, 180, true) : builtIn;
  const android = s.androidIcon ? squarePng(s.androidIcon.url, 192, true) : home;
  const homeTile = s.homeIcon || s.tabIcon ? home : builtIn; // the built-in mark is a disc; iOS shows it on its white tile
  const isBuiltIn = (place: "tab" | "home" | "android") => (place === "tab" ? !s.tabIcon : place === "home" ? !s.homeIcon && !s.tabIcon : !s.androidIcon && !s.homeIcon && !s.tabIcon);

  return (
    <>
      <div className="flex flex-col gap-[12px]">
        <Heading>Icon</Heading>
        <Muted>The little picture in the browser tab, in Google results and on phone home screens. The bud mark is built in; upload your own for any place if you want something else.</Muted>
        {saved && <Muted>Saved. It can take a while to show up — see the note at the bottom.</Muted>}
        {error && (
          <p className="m-0 font-gotham text-paragraph text-[#b00020]" role="alert">
            {error}
          </p>
        )}
      </div>

      <Card>
        <Subheading>How it looks right now</Subheading>
        <div className="h-px w-full bg-black/25" />
        <div className="admin-true-colors grid gap-[24px] md:grid-cols-2 lg:grid-cols-3">
          <Mock title="Safari on Mac" note={isBuiltIn("tab") ? "Built-in mark" : "Your uploaded tab icon"}>
            <div style={{ backgroundColor: "#e9e9e9" }} className="overflow-hidden rounded-[8px] border border-black/10">
              <div className="flex items-center gap-[6px] px-[10px] pt-[9px]">
                <span className="h-[10px] w-[10px] rounded-full" style={{ backgroundColor: "#ff5f57" }} />
                <span className="h-[10px] w-[10px] rounded-full" style={{ backgroundColor: "#febc2e" }} />
                <span className="h-[10px] w-[10px] rounded-full" style={{ backgroundColor: "#28c840" }} />
              </div>
              <div className="flex items-end gap-[6px] px-[10px] pt-[6px]">
                <div style={{ backgroundColor: "#ffffff" }} className="flex items-center gap-[7px] rounded-t-[7px] px-[12px] py-[7px]">
                  <Icon src={tab} px={16} radius="3px" />
                  <span style={{ ...SF, color: "#1d1d1f" }} className="text-[12px]">Flöra</span>
                </div>
                <div style={{ backgroundColor: "#dedede" }} className="flex items-center gap-[7px] rounded-t-[7px] px-[12px] py-[7px]">
                  <span className="h-[14px] w-[14px] rounded-[3px]" style={{ backgroundColor: "#c4c4c4" }} />
                  <span style={{ ...SF, color: "#6e6e73" }} className="text-[12px]">Instagram</span>
                </div>
              </div>
              <div style={{ backgroundColor: "#ffffff" }} className="px-[10px] py-[8px]">
                <div style={{ backgroundColor: "#f1f1f1" }} className="mx-auto flex h-[22px] w-[70%] items-center justify-center gap-[6px] rounded-[6px]">
                  <Icon src={tab} px={12} radius="2px" />
                  <span style={{ ...SF, color: "#1d1d1f" }} className="text-[11px]">prosjectflora.com</span>
                </div>
              </div>
            </div>
          </Mock>

          <Mock title="Chrome, dark mode" note={isBuiltIn("tab") ? "Built-in mark" : "Your uploaded tab icon"}>
            <div style={{ backgroundColor: "#202124" }} className="overflow-hidden rounded-[8px] border border-black/10">
              <div className="flex items-end gap-[2px] px-[8px] pt-[8px]">
                <div style={{ backgroundColor: "#35363a" }} className="flex items-center gap-[8px] rounded-t-[8px] px-[12px] py-[8px]">
                  <Icon src={tab} px={16} radius="3px" />
                  <span style={{ ...SF, color: "#e8eaed" }} className="text-[12px]">Flöra – Shop</span>
                  <span style={{ color: "#9aa0a6" }} className="text-[12px]">×</span>
                </div>
                <div className="flex items-center gap-[8px] px-[12px] py-[8px]">
                  <span className="h-[14px] w-[14px] rounded-[3px]" style={{ backgroundColor: "#5f6368" }} />
                  <span style={{ ...SF, color: "#9aa0a6" }} className="text-[12px]">Inbox</span>
                </div>
              </div>
              <div style={{ backgroundColor: "#35363a" }} className="px-[10px] py-[8px]">
                <div style={{ backgroundColor: "#202124" }} className="flex h-[24px] items-center gap-[8px] rounded-full px-[12px]">
                  <span style={{ ...SF, color: "#e8eaed" }} className="text-[11px]">prosjectflora.com</span>
                </div>
              </div>
            </div>
          </Mock>

          <Mock title="Google search result" note="Google fetches the tab icon itself; a change can take weeks to reach results">
            <div style={{ backgroundColor: "#ffffff" }} className="rounded-[8px] border border-black/10 px-[16px] py-[14px]">
              <div className="flex items-center gap-[10px]">
                <span style={{ backgroundColor: "#f1f3f4" }} className="flex h-[26px] w-[26px] items-center justify-center rounded-full">
                  <Icon src={tab} px={18} radius="50%" />
                </span>
                <span className="flex flex-col">
                  <span style={{ ...SF, color: "#202124" }} className="text-[13px] leading-[18px]">Flöra</span>
                  <span style={{ ...SF, color: "#4d5156" }} className="text-[11px] leading-[14px]">https://www.prosjectflora.com</span>
                </span>
              </div>
              <p style={{ ...SF, color: "#1a0dab" }} className="m-0 mt-[6px] text-[17px] leading-[22px]">Flöra – Made-to-measure garments</p>
              <p style={{ ...SF, color: "#4d5156" }} className="m-0 mt-[3px] text-[12px] leading-[18px]">Garments sewn to your measurements in Oslo. Tops, skirts, sets and a small vintage edit.</p>
            </div>
          </Mock>

          <Mock title="iPhone home screen" note={isBuiltIn("home") ? "Built-in mark on a white tile; iOS rounds the corners" : "Your uploaded home-screen icon"}>
            <div style={{ backgroundColor: "#6b7a99", backgroundImage: "linear-gradient(160deg, #c9d2e3 0%, #7f8db0 55%, #4b5577 100%)" }} className="rounded-[8px] border border-black/10 px-[16px] pb-[14px] pt-[22px]">
              <div className="grid grid-cols-4 gap-[10px]">
                {[
                  { src: homeTile, label: "Flöra", bg: "#ffffff" },
                  { label: "Messages", bg: "#34c759" },
                  { label: "Photos", bg: "#ffffff" },
                  { label: "Instagram", bg: "#d62976" },
                ].map((app) => (
                  <span key={app.label} className="flex flex-col items-center gap-[5px]">
                    <span style={{ backgroundColor: app.bg }} className="flex h-[52px] w-[52px] items-center justify-center overflow-hidden rounded-[12px] shadow-[0_2px_6px_rgba(0,0,0,0.25)]">
                      {app.src && <Icon src={app.src} px={52} />}
                    </span>
                    <span style={{ ...SF, color: "#ffffff", textShadow: "0 1px 2px rgba(0,0,0,0.4)" }} className="text-[10px]">{app.label}</span>
                  </span>
                ))}
              </div>
            </div>
          </Mock>

          <Mock title="Android home screen" note={isBuiltIn("android") ? "Built-in mark; Android cuts icons into circles" : "Your uploaded Android icon, cut into a circle"}>
            <div style={{ backgroundColor: "#2d3a4a", backgroundImage: "linear-gradient(160deg, #3d5068 0%, #22303f 100%)" }} className="rounded-[8px] border border-black/10 px-[16px] pb-[14px] pt-[22px]">
              <div className="grid grid-cols-4 gap-[10px]">
                {[
                  { src: android, label: "Flöra", bg: "#ffffff" },
                  { label: "Chrome", bg: "#f6f6f6" },
                  { label: "Maps", bg: "#ffffff" },
                  { label: "Vipps", bg: "#ff5b24" },
                ].map((app) => (
                  <span key={app.label} className="flex flex-col items-center gap-[5px]">
                    <span style={{ backgroundColor: app.bg }} className="flex h-[48px] w-[48px] items-center justify-center overflow-hidden rounded-full shadow-[0_2px_6px_rgba(0,0,0,0.3)]">
                      {app.src && <Icon src={app.src} px={48} />}
                    </span>
                    <span style={{ ...SF, color: "#ffffff" }} className="text-[10px]">{app.label}</span>
                  </span>
                ))}
              </div>
            </div>
          </Mock>

          <Mock title="Safari on iPhone — start page" note={isBuiltIn("tab") ? "Built-in mark" : "Your uploaded tab icon"}>
            <div style={{ backgroundColor: "#f2f2f7" }} className="rounded-[8px] border border-black/10 px-[16px] pb-[14px] pt-[14px]">
              <span style={{ ...SF, color: "#1d1d1f" }} className="mb-[10px] block text-[13px] font-semibold">Favourites</span>
              <div className="grid grid-cols-4 gap-[10px]">
                {[
                  { src: tab, label: "Flöra" },
                  { label: "Finn" },
                  { label: "DNB" },
                  { label: "VG" },
                ].map((site) => (
                  <span key={site.label} className="flex flex-col items-center gap-[5px]">
                    <span style={{ backgroundColor: "#ffffff" }} className="flex h-[52px] w-[52px] items-center justify-center overflow-hidden rounded-[12px] shadow-[0_1px_3px_rgba(0,0,0,0.12)]">
                      {site.src ? <Icon src={site.src} px={30} radius="6px" /> : <span className="h-[26px] w-[26px] rounded-[6px]" style={{ backgroundColor: "#d9d9de" }} />}
                    </span>
                    <span style={{ ...SF, color: "#1d1d1f" }} className="text-[10px]">{site.label}</span>
                  </span>
                ))}
              </div>
            </div>
          </Mock>
        </div>
      </Card>

      <form action={saveIcon} className="flex max-w-[860px] flex-col gap-[42px]">
        <Card>
          <Subheading>The built-in mark</Subheading>
          <div className="h-px w-full bg-black/25" />
          <fieldset className="m-0 flex flex-col gap-[6px] border-0 p-0">
            <legend className="mb-[6px] font-gotham text-[11px] leading-normal text-black">Colourway — used wherever nothing is uploaded below</legend>
            <div className="flex flex-col gap-[12px] md:flex-row md:gap-[24px]">
              {FAVICON_STYLES.map((option) => (
                <label key={option} className="flex flex-1 cursor-pointer items-center gap-[12px] border border-black/20 p-[12px] has-[:checked]:border-black">
                  <input type="radio" name="favicon" value={option} defaultChecked={style === option} className="h-[14px] w-[14px] accent-black" />
                  <Icon src={`data:image/svg+xml;utf8,${encodeURIComponent(faviconSvg(option))}`} px={32} className="admin-true-colors" />
                  <span>{FAVICON_LABEL[option]}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </Card>

        <Card>
          <Subheading>Your own pictures</Subheading>
          <div className="h-px w-full bg-black/25" />
          <Muted className="text-[11px]">Square PNG or JPG, at least 512 × 512 px. Keep the picture simple — it is shown as small as 16 px. Leave a place empty to use the mark, or the icon above it in this list.</Muted>
          <ImageField name="tabIcon" label="Browser tab, Google results, bookmarks" hint="Shown tiny, usually on white. Transparent background is fine here." current={s.tabIcon ?? null} crop={false} alt={false} frame={{ aspect: 1, fit: "contain", pad: [0.15, 0.15] }} />
          <ImageField name="homeIcon" label="iPhone and iPad home screen" hint="iOS rounds the corners and fills transparency with white. Empty = the tab icon." current={s.homeIcon ?? null} crop={false} alt={false} frame={{ aspect: 1, fit: "contain", pad: [0.15, 0.15] }} />
          <ImageField name="androidIcon" label="Android home screen" hint="Android cuts a circle out of the middle, so keep the subject centred. Empty = the home-screen icon." current={s.androidIcon ?? null} crop={false} alt={false} frame={{ aspect: 1, fit: "contain", pad: [0.15, 0.15] }} />
        </Card>

        <Button className="md:max-w-[320px]">Save</Button>
      </form>

      <Card>
        <Subheading>Why a change takes a while to show</Subheading>
        <div className="h-px w-full bg-black/25" />
        <ul className="m-0 flex list-disc flex-col gap-[6px] pl-[18px] font-gotham text-[11px] leading-normal text-black/70">
          <li>The site itself serves the new icon within about an hour (it is cached that long).</li>
          <li>Browsers hang on to the old icon stubbornly, often for days. To see it sooner, open the site in a private window, or clear the site&apos;s data in the browser.</li>
          <li>An icon already on someone&apos;s phone home screen never updates by itself — they would have to remove it and add the site again.</li>
          <li>Google re-fetches the icon for search results on its own schedule; count on a few weeks.</li>
        </ul>
      </Card>
    </>
  );
}
