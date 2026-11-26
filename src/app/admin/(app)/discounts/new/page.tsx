import DiscountForm from "@/components/admin/discount-form";
import { Heading, TextLink } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/session";

export default async function NewDiscountPage() {
  await requireAdmin();
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
