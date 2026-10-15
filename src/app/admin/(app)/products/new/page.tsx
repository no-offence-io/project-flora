import ProductForm from "@/components/admin/product-form";
import { Heading, TextLink } from "@/components/admin/ui";

export default function NewProductPage() {
  return (
    <>
      <div className="flex flex-col gap-[12px]">
        <TextLink href="/admin/products">← Products</TextLink>
        <Heading>New product</Heading>
      </div>
      <ProductForm product={null} />
    </>
  );
}
