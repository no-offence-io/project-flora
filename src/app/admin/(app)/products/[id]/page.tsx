import { notFound } from "next/navigation";
import ProductForm, { PRODUCT_ADMIN_PROJECTION, type ProductDoc } from "@/components/admin/product-form";
import { Heading, Muted, TextLink } from "@/components/admin/ui";
import { getText } from "@/lib/admin/localized";
import { adminClient } from "@/lib/admin/sanity";
import { requireAdmin } from "@/lib/admin/session";

export default async function ProductPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; gif?: string; error?: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const { saved, gif, error } = await searchParams;
  const product = await adminClient().fetch<ProductDoc | null>(
    `*[_type == "product" && _id == $id][0]${PRODUCT_ADMIN_PROJECTION}`,
    { id },
  );
  if (!product) notFound();
  return (
    <>
      <div className="flex flex-col gap-[12px]">
        <TextLink href="/admin/products">← Products</TextLink>
        <Heading>{getText(product.name, "en") || "Product"}</Heading>
        {saved && <Muted>Saved.</Muted>}
        {gif && <Muted>GIF made.</Muted>}
        {error && (
          <p className="m-0 font-gotham text-paragraph text-[#b00020]" role="alert">
            {error}
          </p>
        )}
      </div>
      <ProductForm product={product} />
    </>
  );
}
