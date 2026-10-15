import { notFound } from "next/navigation";
import ProductForm, { type ProductDoc } from "@/components/admin/product-form";
import { Heading, Muted, TextLink } from "@/components/admin/ui";
import { getText } from "@/lib/admin/localized";
import { adminClient } from "@/lib/admin/sanity";

export default async function ProductPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const { id } = await params;
  const { saved } = await searchParams;
  const product = await adminClient().fetch<ProductDoc | null>(
    `*[_type == "product" && _id == $id][0]{..., "images": images[]{_key, asset, "url": asset->url}}`,
    { id },
  );
  if (!product) notFound();
  return (
    <>
      <div className="flex flex-col gap-[12px]">
        <TextLink href="/admin/products">← Products</TextLink>
        <Heading>{getText(product.name, "en") || "Product"}</Heading>
        {saved && <Muted>Saved.</Muted>}
      </div>
      <ProductForm product={product} />
    </>
  );
}
