import Image from "next/image";
import ColourList from "@/components/admin/colour-list";
import ShowWhen from "@/components/admin/show-when";
import { deleteProduct, makeGif, removeGif, saveProduct } from "@/app/admin/(app)/actions";
import { ImageField, productFrames } from "@/components/admin/media-field";
import { Bilingual, Button, Card, Checkbox, Input, Labelled, Muted, Select, Subheading } from "@/components/admin/ui";
import { getText, type LocalizedString } from "@/lib/admin/localized";
import { oreToKroner } from "@/lib/admin/sanity";

export type ProductDoc = {
  _id: string;
  name?: LocalizedString;
  slug?: { current?: string };
  category?: string;
  description?: LocalizedString;
  priceOre?: number;
  compareAtPriceOre?: number;
  stock?: number;
  visible?: boolean;
  images?: { _key: string; asset?: { _ref: string }; url?: string; alt?: LocalizedString | null; scale?: number | null; x?: number | null; y?: number | null }[];
  sizing?: string;
  tailored?: boolean;
  tailoredExtraOre?: number;
  trackStock?: boolean;
  sizes?: { _key: string; label?: string; stock?: number }[];
  gif?: string | null;
  gifSources?: string[];
  vintage?: boolean;
  vintageLayout?: string;
  colors?: { _key: string; name?: LocalizedString; hex?: string; photoKeys?: string[] | null; image?: { _ref: string; url: string; alt?: LocalizedString | null; scale?: number | null; x?: number | null; y?: number | null } | null }[];
  specs?: { _key: string; label?: LocalizedString; value?: LocalizedString; emphasis?: boolean; expandable?: boolean; hideOnMobile?: boolean }[];
};

/** The admin's view of a product: images, colours and their photos resolved to URLs for the previews. */
export const PRODUCT_ADMIN_PROJECTION = `{
  ...,
  "images": images[]{ _key, asset, alt, scale, x, y, "url": asset->url },
  "sizes": sizes[]{ _key, label, stock },
  "gif": gif.asset->url,
  "gifSources": array::compact([images[0].asset->url] + colors[].image.asset->url),
  "colors": colors[]{ _key, name, hex, photoKeys, "image": select(defined(image.asset) => { "_ref": image.asset._ref, "url": image.asset->url, "alt": image.alt, "scale": image.scale, "x": image.x, "y": image.y }) },
  "specs": specs[]{ _key, label, value, emphasis, expandable, hideOnMobile }
}`;

const CATEGORIES = ["Tops", "Skirts", "Pants", "Sets", "Accessories"];

const SIZING_HINT: Record<string, string> = {
  sizes: "A list of sizes below, each with its own stock.",
  both: "The customer picks a size from the list below, or Tailored and gives their measurements. Tailored pieces are made to order, so they never run out.",
  measurements: "Every piece is made to the customer's measurements in cm (what to ask for is set under Settings → Sizing).",
  none: "One size, e.g. an accessory or a vintage piece.",
};

/**
 * The product editor. Two columns on a computer, so the page stays short: what the product is and
 * how it looks on the left; price, stock, sizes and details on the right. A Save bar stays in view at
 * the bottom. Fields that don't apply to the choices made are hidden, not just explained.
 */
export default function ProductForm({ product }: { product: ProductDoc | null }) {
  const p = product;
  const photos = (p?.images ?? []).filter((img) => img.asset?._ref && img.url);
  const sizeSlots = [...(p?.sizes ?? []), null, null];
  const sizing = p?.sizing === "sizes" ? (p.tailored ? "both" : "sizes") : p?.sizing === "none" ? "none" : "measurements";
  const sized = sizing === "sizes" || sizing === "both";
  const counted = p?.trackStock !== false;
  const specSlots = [...(p?.specs ?? []), null];

  return (
    <form action={saveProduct} className="flex flex-col gap-[24px]">
      {p && <input type="hidden" name="id" value={p._id} />}

      <div className="grid items-start gap-[24px] lg:grid-cols-2 lg:gap-[24px]">
        {/* What it is, and how it looks */}
        <div className="flex min-w-0 flex-col gap-[24px]">
          <Card>
            <Subheading>Name & description</Subheading>
            <div className="h-px w-full bg-black/25" />
            <div className="flex flex-col gap-[24px]">
              <Labelled label="Name" hint="Product names are always in English — the same on the Norwegian site.">
                <Input name="name.en" defaultValue={getText(p?.name, "en")} required />
              </Labelled>
              <div className="grid gap-[24px] md:grid-cols-2">
                <Labelled label="Web address" hint="Lowercase letters, numbers and dashes. Changing it breaks old links.">
                  <Input name="slug" defaultValue={p?.slug?.current ?? ""} required pattern="[a-z0-9\-]+" title="Lowercase letters, numbers and dashes, e.g. wrap-skirt" />
                </Labelled>
                <Labelled label="Category">
                  <Select name="category" defaultValue={p?.category ?? ""} required>
                    <option value="" disabled>
                      Choose…
                    </option>
                    {CATEGORIES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </Select>
                </Labelled>
              </div>
              <Bilingual name="description" label="Description" en={getText(p?.description, "en")} no={getText(p?.description, "no")} multiline rows={5} />
              <Checkbox name="vintage" label="Vintage piece — shown on the Vintage page instead of the shop" defaultChecked={p?.vintage === true} />
              <ShowWhen field="vintage" values={["on"]} initial={p?.vintage === true}>
                <Labelled label="Vintage page layout" hint="The 3D card is the turning card at the top of the page (set up under Vintage card); the normal layout is the page every other product has.">
                  <Select name="vintageLayout" defaultValue={p?.vintageLayout === "plain" ? "plain" : "card"}>
                    <option value="card">3D card at the top</option>
                    <option value="plain">Normal product page, no 3D card</option>
                  </Select>
                </Labelled>
              </ShowWhen>
            </div>
          </Card>

          <Card>
            <Subheading>Photos</Subheading>
            <div className="h-px w-full bg-black/25" />
            {/* Each photo as the shop's card draws it, with an Edit view: place it in the box, swap it, name it, remove it. The first is the thumbnail. */}
            {photos.length ? (
              <div className="grid gap-[24px] xl:grid-cols-2">
                {photos.map((img, i) => (
                  <div key={img._key} className="min-w-0">
                    <input type="hidden" name="imageKey" value={img._key} />
                    <ImageField name={`image_${img._key}`} label={i === 0 ? "Thumbnail (first photo)" : `Photo ${i + 1}`} current={{ _ref: img.asset!._ref, url: img.url!, alt: img.alt, scale: img.scale, x: img.x, y: img.y }} frames={productFrames(p?.vintage === true)} />
                  </div>
                ))}
              </div>
            ) : (
              <Muted>No photos yet.</Muted>
            )}
            <Labelled label="Add photos" hint="JPG or PNG, up to 15 MB each. Add every photo here, the ones for each colour too; save, and then pick a colour's photos below.">
              <input type="file" name="newImages" accept="image/*" multiple className="font-gotham text-paragraph file:mr-[12px] file:border file:border-black/20 file:bg-transparent file:px-[12px] file:py-[8px] file:font-gotham file:text-paragraph file:text-black" />
            </Labelled>
          </Card>

          <Card>
            <Subheading>Colours</Subheading>
            <div className="h-px w-full bg-black/25" />
            <Muted>Only for a piece that comes in more than one colour. For each colour, tap the photos that show it; the colour dot and the name fill in by themselves. Customers then choose a colour on the product page, and the order says which.</Muted>
            <ColourList photos={photos.map((img) => ({ key: img._key, ref: img.asset!._ref, url: img.url! }))} saved={p?.colors ?? []} />
          </Card>
        </div>

        {/* What it costs, how many, how it is sized, and the details */}
        <div className="flex min-w-0 flex-col gap-[24px]">
          <Card>
            <Subheading>Price & stock</Subheading>
            <div className="h-px w-full bg-black/25" />
            <div className="flex flex-col gap-[24px]">
              <div className="grid gap-[24px] md:grid-cols-2">
                <Labelled label="Price (kr, VAT included)">
                  <Input name="price" inputMode="decimal" defaultValue={oreToKroner(p?.priceOre)} required pattern="\d+([.,]\d{1,2})?" title="A price in kroner, e.g. 890" />
                </Labelled>
                <Labelled label="Previous price (kr), if on sale" hint="Leave empty unless on sale. Shown struck through.">
                  <Input name="compareAtPrice" inputMode="decimal" defaultValue={oreToKroner(p?.compareAtPriceOre)} pattern="\d+([.,]\d{1,2})?" title="A price in kroner, higher than the price" />
                </Labelled>
              </div>
              <Labelled label="Stock">
                <Select name="trackStock" defaultValue={counted ? "on" : "off"}>
                  <option value="on">Count stock — sold out at zero</option>
                  <option value="off">Don&apos;t count stock — always available</option>
                </Select>
              </Labelled>
              <ShowWhen field="trackStock" values={["on"]} initial={counted} disable>
                <ShowWhen field="sizing" values={["measurements", "none"]} initial={!sized} disable>
                  <Labelled label="In stock" hint="Counts down by itself with every paid order.">
                    <Input name="stock" type="number" min={0} step={1} defaultValue={p?.stock ?? 0} required />
                  </Labelled>
                </ShowWhen>
                <ShowWhen field="sizing" values={["sizes", "both"]} initial={sized}>
                  <Muted className="text-[11px]">Each size has its own stock, under Sizing.</Muted>
                </ShowWhen>
              </ShowWhen>
              <Checkbox name="visible" label="Show in the shop" defaultChecked={p ? p.visible !== false : true} />
            </div>
          </Card>

          <Card>
            <Subheading>Sizing</Subheading>
            <div className="h-px w-full bg-black/25" />
            <div className="flex flex-col gap-[24px]">
              <Labelled label="How is it sized?">
                <Select name="sizing" defaultValue={sizing}>
                  <option value="sizes">Standard sizes</option>
                  <option value="both">Standard sizes, or Tailored to the customer&apos;s measurements</option>
                  <option value="measurements">Tailored only — the customer gives measurements</option>
                  <option value="none">One size</option>
                </Select>
              </Labelled>
              {Object.entries(SIZING_HINT).map(([value, hint]) => (
                <ShowWhen key={value} field="sizing" values={[value]} initial={sizing === value}>
                  <Muted className="text-[11px]">{hint}</Muted>
                </ShowWhen>
              ))}
              <ShowWhen field="sizing" values={["both"]} initial={sizing === "both"} disable>
                <Labelled label="Extra for Tailored (kr)" hint="Added to the price when the customer chooses Tailored. Leave at 0 for the same price.">
                  <Input name="tailoredExtra" inputMode="decimal" defaultValue={oreToKroner(p?.tailoredExtraOre) || "0"} pattern="\d+([.,]\d{1,2})?" title="An amount in kroner, e.g. 300, or 0" />
                </Labelled>
              </ShowWhen>
              <ShowWhen field="sizing" values={["sizes", "both"]} initial={sized}>
                <div className="flex flex-col gap-[12px]">
                  <Muted className="text-[11px]">Sizes. Empty rows are ignored.</Muted>
                  <input type="hidden" name="sizeCount" value={sizeSlots.length} />
                  {sizeSlots.map((sz, i) => (
                    <div key={sz?._key ?? `new-${i}`} className="flex min-w-0 flex-wrap items-end gap-[12px]">
                      <input type="hidden" name={`sizeKey_${i}`} value={sz?._key ?? ""} />
                      <Labelled label="Size" className="min-w-[120px] flex-1">
                        <Input name={`sizeLabel_${i}`} defaultValue={sz?.label ?? ""} placeholder="e.g. S, M, 38" pattern="[A-Za-z0-9 .\/\-]{1,20}" title="Letters, numbers, space, . / - (up to 20)" />
                      </Labelled>
                      <ShowWhen field="trackStock" values={["on"]} initial={counted}>
                        <Labelled label="In stock" className="w-[110px]">
                          <Input name={`sizeStock_${i}`} type="number" min={0} step={1} defaultValue={sz?.stock ?? 0} />
                        </Labelled>
                      </ShowWhen>
                      {sz && (
                        <label className="flex h-[44px] items-center gap-[6px] whitespace-nowrap text-[11px] text-black/50">
                          <input type="checkbox" name={`sizeRemove_${i}`} className="accent-black" /> Remove
                        </label>
                      )}
                    </div>
                  ))}
                </div>
              </ShowWhen>
            </div>
          </Card>

          <Card>
            <Subheading>Details list</Subheading>
            <div className="h-px w-full bg-black/25" />
            <Muted>The rows under the price on the product page (material, fit, care…).</Muted>
            <input type="hidden" name="specCount" value={specSlots.length} />
            {specSlots.map((row, i) => (
              <div key={row?._key ?? "new"} className="flex flex-col gap-[18px] border-t border-black/25 pt-[18px]">
                <Muted>{row ? `Row ${i + 1}` : "Add a row"}</Muted>
                <input type="hidden" name={`specKey_${i}`} value={row?._key ?? ""} />
                <Bilingual name={`specLabel_${i}`} label="Label" en={getText(row?.label, "en")} no={getText(row?.label, "no")} />
                <Bilingual name={`specValue_${i}`} label="Value" en={getText(row?.value, "en")} no={getText(row?.value, "no")} />
                <div className="flex flex-col gap-[12px] md:flex-row md:flex-wrap md:gap-x-[24px]">
                  <Checkbox name={`specEmphasis_${i}`} label="Highlight" defaultChecked={row?.emphasis ?? false} />
                  <Checkbox name={`specExpandable_${i}`} label="Collapsible on mobile" defaultChecked={row?.expandable ?? false} />
                  <Checkbox name={`specHideOnMobile_${i}`} label="Hide on mobile" defaultChecked={row?.hideOnMobile ?? false} />
                </div>
                {row && <Checkbox name={`specRemove_${i}`} label="Remove this row" />}
              </div>
            ))}
          </Card>

          <Card>
            <Subheading>Animated GIF</Subheading>
            <div className="h-px w-full bg-black/25" />
            <Muted>For newsletters: the main photo and the colour photos cross-fade (with one photo, a slow zoom). Save the product first if you just added photos.</Muted>
            {p?.gif ? (
              <div className="flex flex-col gap-[12px]">
                {/* A GIF must bypass the optimiser, which would freeze it to its first frame. */}
                <Image src={p.gif} alt="" width={240} height={300} unoptimized className="h-auto w-[240px] border-[0.25px] border-black/25" />
                <div className="flex gap-[12px]">
                  <button type="submit" formAction={makeGif} formNoValidate className="font-gotham text-paragraph text-black underline transition-opacity hover:opacity-70">
                    Make it again
                  </button>
                  <button type="submit" formAction={removeGif} formNoValidate className="font-gotham text-paragraph text-black/50 underline transition-colors hover:text-black">
                    Remove
                  </button>
                </div>
              </div>
            ) : p ? (
              <button type="submit" formAction={makeGif} formNoValidate disabled={(p.gifSources ?? []).length === 0} className="flex w-full items-center justify-center bg-black p-[12px] font-gotham text-paragraph text-white disabled:cursor-not-allowed disabled:opacity-50 md:max-w-[320px]">
                Make a GIF from {(p.gifSources ?? []).length} photo{(p.gifSources ?? []).length === 1 ? "" : "s"}
              </button>
            ) : (
              <Muted>Create the product first.</Muted>
            )}
          </Card>

          {p && (
            <button type="submit" formAction={deleteProduct} formNoValidate className="self-start font-gotham text-paragraph text-black/50 underline transition-colors hover:text-black">
              Delete this product
            </button>
          )}
        </div>
      </div>

      {/* Save stays in view while scrolling; clear of the round + button in the corner. */}
      <div className="sticky bottom-0 z-[40] -mx-[24px] flex items-center gap-[18px] border-t border-black/25 bg-white px-[24px] py-[12px] pr-[96px] md:-mx-[42px] md:px-[42px] md:pr-[112px]">
        <div className="w-[200px] shrink-0">
          <Button>{p ? "Save" : "Create product"}</Button>
        </div>
        <span className="hidden font-gotham text-[11px] leading-normal text-black/50 md:inline">Nothing changes in the shop until you save.</span>
      </div>
    </form>
  );
}
