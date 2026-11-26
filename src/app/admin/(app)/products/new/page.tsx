import ProductForm from "@/components/admin/product-form";
import { Heading, TextLink } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/session";

export default async function NewProductPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireAdmin();
  const { error } = await searchParams;
  return (
    <>
      <div className="flex flex-col gap-[12px]">
        <TextLink href="/admin/products">← Products</TextLink>
        <Heading>New product</Heading>
        {error && (
          <p className="m-0 font-gotham text-paragraph text-[#b00020]" role="alert">
            {error}
          </p>
        )}
      </div>
      <ProductForm product={null} />
    </>
  );
}
