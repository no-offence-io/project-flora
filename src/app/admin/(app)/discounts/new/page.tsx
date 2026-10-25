import DiscountForm from "@/components/admin/discount-form";
import { Heading, TextLink } from "@/components/admin/ui";

export default function NewDiscountPage() {
  return (
    <>
      <div className="flex flex-col gap-[12px]">
        <TextLink href="/admin/discounts">← Discount codes</TextLink>
        <Heading>New code</Heading>
      </div>
      <DiscountForm discount={null} />
    </>
  );
}
