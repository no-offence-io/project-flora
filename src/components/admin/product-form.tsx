import Image from "next/image";
import { deleteProduct, makeGif, removeGif, saveProduct } from "@/app/admin/(app)/actions";
import { ImageField } from "@/components/admin/media-field";
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
  images?: { _key: string; asset?: { _ref: string }; url?: string }[];
  sizing?: string;
  sizes?: { _key: string; label?: string; stock?: number }[];
  gif?: string | null;
  gifSources?: string[];
  vintage?: boolean;
  colors?: { _key: string; name?: LocalizedString; hex?: string; image?: { _ref: string; url: string } | null }[];
  specs?: { _key: string; label?: LocalizedString; value?: LocalizedString; emphasis?: boolean; expandable?: boolean; hideOnMobile?: boolean }[];
};

/** The admin's view of a product: images, colours and their photos resolved to URLs for the previews. */
export const PRODUCT_ADMIN_PROJECTION = `{
  ...,
  "images": images[]{ _key, asset, "url": asset->url },
  "sizes": sizes[]{ _key, label, stock },
  "gif": gif.asset->url,
  "gifSources": array::compact([images[0].asset->url] + colors[].image.asset->url),
  "colors": colors[]{ _key, name, hex, "image": select(defined(image.asset) => { "_ref": image.asset._ref, "url": image.asset->url }) },
  "specs": specs[]{ _key, label, value, emphasis, expandable, hideOnMobile }
}`;

const CATEGORIES = ["Tops", "Skirts", "Pants", "Sets", "Accessories"];

/** The product editor: the checkout form's fields, grouped the way the product page shows them. */
export default function ProductForm({ product }: { product: ProductDoc | null }) {
  const p = product;
  const existing = (p?.images ?? []).filter((img) => img.asset?._ref).map((img) => ({ _key: img._key, asset: { _ref: img.asset!._ref } }));
  const colorSlots = [...(p?.colors ?? []), null];
  const sizeSlots = [...(p?.sizes ?? []), null, null];
  const sizing = p?.sizing === "sizes" || p?.sizing === "none" ? p.sizing : "measurements";
  const specSlots = [...(p?.specs ?? []), null];

  return (
    <form action={saveProduct} className="grid gap-[42px] md:grid-cols-[minmax(0,1fr)_420px]">
      {p && <input type="hidden" name="id" value={p._id} />}
      <input type="hidden" name="existingImages" value={JSON.stringify(existing)} />

      <div className="flex flex-col gap-[42px]">
        <Card>
          <Subheading>Name & description</Subheading>
          <div className="h-px w-full bg-black/25" />
          <div className="flex flex-col gap-[24px]">
            <Labelled label="Name" hint="Product names are always in English — the same on the Norwegian site.">
              <Input name="name.en" defaultValue={getText(p?.name, "en")} required />
            </Labelled>
            <Labelled label="Web address" hint="Lowercase letters, numbers and dashes, e.g. wrap-skirt. Changing it breaks old links.">
              <Input name="slug" defaultValue={p?.slug?.current ?? ""} required pattern="[a-z0-9-]+" />
            </Labelled>
            <Labelled label="Category">
              <Select name="category" defaultValue={p?.category ?? ""} required>
                <option value="" disabled>Category</option>
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            </Labelled>
            <Bilingual name="description" label="Description" en={getText(p?.description, "en")} no={getText(p?.description, "no")} multiline rows={5} />
            <Checkbox name="vintage" label="Vintage piece — shown on the Vintage page instead of the shop" defaultChecked={p?.vintage === true} />
          </div>
        </Card>

        <Card>
          <Subheading>Sizing</Subheading>
          <div className="h-px w-full bg-black/25" />
          <div className="flex flex-col gap-[24px]">
            <Labelled label="How is it sized?" hint="Measurements: the customer types their measurements in cm when ordering (what to ask for is set under Settings → Sizing). Fixed sizes: a list with stock per size. No size: one size, e.g. accessories or a vintage piece.">
              <Select name="sizing" defaultValue={sizing}>
                <option value="measurements">Customer gives measurements in cm</option>
                <option value="sizes">Fixed sizes with stock per size</option>
                <option value="none">No size</option>
              </Select>
            </Labelled>
            <Muted>Sizes (only used with &quot;Fixed sizes&quot;; empty rows are ignored):</Muted>
            <input type="hidden" name="sizeCount" value={sizeSlots.length} />
            <div className="flex flex-col gap-[12px]">
              {sizeSlots.map((sz, i) => (
                <div key={sz?._key ?? `new-${i}`} className="flex items-end gap-[12px]">
                  <input type="hidden" name={`sizeKey_${i}`} value={sz?._key ?? ""} />
                  <Labelled label="Size" className="flex-1">
                    <Input name={`sizeLabel_${i}`} defaultValue={sz?.label ?? ""} placeholder="e.g. S, M, 38" />
                  </Labelled>
                  <Labelled label="In stock" className="w-[120px]">
                    <Input name={`sizeStock_${i}`} type="number" min={0} step={1} defaultValue={sz?.stock ?? 0} />
                  </Labelled>
                  {sz && (
                    <label className="flex h-[44px] items-center gap-[6px] whitespace-nowrap text-[11px] text-black/50">
                      <input type="checkbox" name={`sizeRemove_${i}`} className="accent-black" /> Remove
                    </label>
                  )}
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card>
          <Subheading>Photos</Subheading>
          <div className="h-px w-full bg-black/25" />
          {/* The cart's thumbnail treatment: whole photo on a light box, never cropped or blown up. */}
          {p?.images?.length ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-[12px]">
              {p.images.map((img) => (
                <label key={img._key} className="flex cursor-pointer flex-col gap-[6px]">
                  <span className="relative flex aspect-[4/5] w-full items-center justify-center bg-[#f7f7f7] p-[12px]">
                    {img.url && <Image src={img.url} alt="" fill sizes="160px" className="object-contain p-[12px]" />}
                  </span>
                  <span className="flex items-center gap-[6px] text-[11px] leading-normal text-black/50">
                    <input type="checkbox" name="removeImage" value={img._key} className="accent-black" /> Remove
                  </span>
                </label>
              ))}
            </div>
          ) : (
            <Muted>No photos yet.</Muted>
          )}
          <Labelled label="Add photos" hint="JPG or PNG, up to 15 MB each. The first photo is the one shown in the shop.">
            <input type="file" name="newImages" accept="image/*" multiple className="font-gotham text-paragraph file:mr-[12px] file:border file:border-black/20 file:bg-transparent file:px-[12px] file:py-[8px] file:font-gotham file:text-paragraph file:text-black" />
          </Labelled>
        </Card>

        <Card>
          <Subheading>Animated GIF</Subheading>
          <div className="h-px w-full bg-black/25" />
          <Muted>For newsletters: the main photo and the colour photos cross-fade (with one photo, a slow zoom). Made here from the photos above — save the product first if you just added photos.</Muted>
          {p?.gif ? (
            <div className="flex flex-col gap-[12px]">
              {/* A GIF must bypass the optimiser, which would freeze it to its first frame. */}
              <Image src={p.gif} alt="" width={240} height={300} unoptimized className="h-auto w-[240px] border-[0.25px] border-black/25" />
              <div className="flex gap-[12px]">
                <button type="submit" formAction={makeGif} className="font-gotham text-paragraph text-black underline hover:opacity-70 transition-opacity">Make it again</button>
                <button type="submit" formAction={removeGif} className="font-gotham text-paragraph text-black/50 underline hover:text-black transition-colors">Remove</button>
              </div>
            </div>
          ) : p ? (
            <button type="submit" formAction={makeGif} disabled={(p.gifSources ?? []).length === 0} className="flex w-full items-center justify-center bg-black p-[12px] font-gotham text-paragraph text-white disabled:cursor-not-allowed disabled:opacity-50 md:max-w-[320px]">
              Make a GIF from {(p.gifSources ?? []).length} photo{(p.gifSources ?? []).length === 1 ? "" : "s"}
            </button>
          ) : (
            <Muted>Create the product first.</Muted>
          )}
        </Card>

        <Card>
          <Subheading>Colours</Subheading>
          <div className="h-px w-full bg-black/25" />
          <Muted>The swatches on the product page. Each can have its own photo.</Muted>
          <input type="hidden" name="colorCount" value={colorSlots.length} />
          {colorSlots.map((c, i) => (
            <div key={c?._key ?? "new"} className="flex flex-col gap-[24px] border-t border-black/25 pt-[24px]">
              <Muted>{c ? `Colour ${i + 1}` : "Add a colour"}</Muted>
              <input type="hidden" name={`colorKey_${i}`} value={c?._key ?? ""} />
              <Bilingual name={`colorName_${i}`} label="Name" en={getText(c?.name, "en")} no={getText(c?.name, "no")} />
              <Labelled label="Swatch colour" hint="Hex code, e.g. #6b7280">
                <div className="flex items-center gap-[12px]">
                  <span aria-hidden className="h-[24px] w-[24px] shrink-0 rounded-full border border-black/20" style={{ backgroundColor: c?.hex ?? "transparent" }} />
                  <Input name={`colorHex_${i}`} defaultValue={c?.hex ?? ""} pattern="#([0-9a-fA-F]{3}){1,2}" className="md:max-w-[160px]" />
                </div>
              </Labelled>
              <ImageField name={`colorImage_${i}`} label="Photo in this colour" current={c?.image} />
              {c && <Checkbox name={`colorRemove_${i}`} label="Remove this colour" />}
            </div>
          ))}
        </Card>

        <Card>
          <Subheading>Details list</Subheading>
          <div className="h-px w-full bg-black/25" />
          <Muted>The rows under the price on the product page (material, fit, care…).</Muted>
          <input type="hidden" name="specCount" value={specSlots.length} />
          {specSlots.map((row, i) => (
            <div key={row?._key ?? "new"} className="flex flex-col gap-[24px] border-t border-black/25 pt-[24px]">
              <Muted>{row ? `Row ${i + 1}` : "Add a row"}</Muted>
              <input type="hidden" name={`specKey_${i}`} value={row?._key ?? ""} />
              <Bilingual name={`specLabel_${i}`} label="Label" en={getText(row?.label, "en")} no={getText(row?.label, "no")} />
              <Bilingual name={`specValue_${i}`} label="Value" en={getText(row?.value, "en")} no={getText(row?.value, "no")} />
              <div className="flex flex-col gap-[12px] md:flex-row md:gap-[24px]">
                <Checkbox name={`specEmphasis_${i}`} label="Highlight" defaultChecked={row?.emphasis ?? false} />
                <Checkbox name={`specExpandable_${i}`} label="Collapsible on mobile" defaultChecked={row?.expandable ?? false} />
                <Checkbox name={`specHideOnMobile_${i}`} label="Hide on mobile" defaultChecked={row?.hideOnMobile ?? false} />
              </div>
              {row && <Checkbox name={`specRemove_${i}`} label="Remove this row" />}
            </div>
          ))}
        </Card>
      </div>

      <div className="flex flex-col gap-[42px]">
        <Card>
          <Subheading>Price & stock</Subheading>
          <div className="h-px w-full bg-black/25" />
          <div className="flex flex-col gap-[24px]">
            <Labelled label="Price (kr, VAT included)">
              <Input name="price" inputMode="decimal" defaultValue={oreToKroner(p?.priceOre)} required />
            </Labelled>
            <Labelled label="Previous price (kr), if on sale" hint="Leave empty unless the product is on sale. Shown struck through, and turns on the sale badge.">
              <Input name="compareAtPrice" inputMode="decimal" defaultValue={oreToKroner(p?.compareAtPriceOre)} />
            </Labelled>
            <Labelled label="In stock" hint="Counts down by itself with every paid order. Ignored for fixed sizes — each size has its own number.">
              <Input name="stock" type="number" min={0} step={1} defaultValue={p?.stock ?? 0} required />
            </Labelled>
            <Checkbox name="visible" label="Show in the shop" defaultChecked={p ? p.visible !== false : true} />
          </div>
        </Card>
        <Button>{p ? "Save" : "Create product"}</Button>
        {p && (
          <button type="submit" formAction={deleteProduct} className="font-gotham text-paragraph text-black/50 underline hover:text-black transition-colors">
            Delete this product
          </button>
        )}
      </div>
    </form>
  );
}
