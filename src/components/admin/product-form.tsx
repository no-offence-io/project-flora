import Image from "next/image";
import { deleteProduct, saveProduct } from "@/app/admin/(app)/actions";
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
};

const CATEGORIES = ["Tops", "Skirts", "Sets", "Accessories"];

/** The product editor: the checkout form's fields, grouped the way the product page shows them. */
export default function ProductForm({ product }: { product: ProductDoc | null }) {
  const p = product;
  const existing = (p?.images ?? []).filter((img) => img.asset?._ref).map((img) => ({ _key: img._key, asset: { _ref: img.asset!._ref } }));

  return (
    <form action={saveProduct} className="grid gap-[42px] md:grid-cols-[minmax(0,1fr)_420px]">
      {p && <input type="hidden" name="id" value={p._id} />}
      <input type="hidden" name="existingImages" value={JSON.stringify(existing)} />

      <div className="flex flex-col gap-[42px]">
        <Card>
          <Subheading>Name & description</Subheading>
          <div className="h-px w-full bg-black/25" />
          <div className="flex flex-col gap-[24px]">
            <Bilingual name="name" label="Name" en={getText(p?.name, "en")} no={getText(p?.name, "no")} required />
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
          </div>
        </Card>

        <Card>
          <Subheading>Photos</Subheading>
          <div className="h-px w-full bg-black/25" />
          {p?.images?.length ? (
            <div className="grid grid-cols-3 gap-[12px] md:grid-cols-4">
              {p.images.map((img) => (
                <label key={img._key} className="flex cursor-pointer flex-col gap-[6px]">
                  <span className="relative aspect-[4/5] w-full overflow-hidden bg-[#f7f7f7]">
                    {img.url && <Image src={img.url} alt="" fill sizes="200px" className="object-cover" />}
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
            <Labelled label="In stock" hint="Counts down by itself with every paid order.">
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
