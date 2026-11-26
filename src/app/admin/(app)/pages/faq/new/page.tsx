import FaqForm from "@/components/admin/faq-form";
import { Heading, TextLink } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/session";

export default async function NewFaqPage() {
  await requireAdmin();
  return (
    <>
      <div className="flex flex-col gap-[12px]">
        <TextLink href="/admin/pages/faq">← FAQ</TextLink>
        <Heading>New question</Heading>
      </div>
      <FaqForm item={null} />
    </>
  );
}
