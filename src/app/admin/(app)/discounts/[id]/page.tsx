import { notFound } from "next/navigation";
import DiscountForm, { type DiscountDoc } from "@/components/admin/discount-form";
import { Heading, Muted, TextLink } from "@/components/admin/ui";
import { adminClient } from "@/lib/admin/sanity";
import { requireAdmin } from "@/lib/admin/session";

export default async function DiscountPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const { saved } = await searchParams;
  const discount = await adminClient().fetch<DiscountDoc | null>(`*[_type == "discount" && _id == $id][0]`, { id });
  if (!discount) notFound();
  return (
    <>
      <div className="flex flex-col gap-[12px]">
        <TextLink href="/admin/discounts">← Discount codes</TextLink>
        <Heading>{discount.code}</Heading>
        {saved && <Muted>Saved.</Muted>}
      </div>
      <DiscountForm discount={discount} />
    </>
  );
}
