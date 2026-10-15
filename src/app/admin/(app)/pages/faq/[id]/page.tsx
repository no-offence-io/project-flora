import { notFound } from "next/navigation";
import FaqForm, { type FaqDoc } from "@/components/admin/faq-form";
import { Heading, Muted, TextLink } from "@/components/admin/ui";
import { adminClient } from "@/lib/admin/sanity";

export default async function FaqPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const { id } = await params;
  const { saved } = await searchParams;
  const item = await adminClient().fetch<FaqDoc | null>(`*[_type == "faqItem" && _id == $id][0]{ ..., "image": select(defined(image.asset) => { "_ref": image.asset._ref, "url": image.asset->url }) }`, { id });
  if (!item) notFound();
  return (
    <>
      <div className="flex flex-col gap-[12px]">
        <TextLink href="/admin/pages/faq">← FAQ</TextLink>
        <Heading>Question</Heading>
        {saved && <Muted>Saved.</Muted>}
      </div>
      <FaqForm item={item} />
    </>
  );
}
