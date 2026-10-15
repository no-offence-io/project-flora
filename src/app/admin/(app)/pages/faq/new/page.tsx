import FaqForm from "@/components/admin/faq-form";
import { Heading, TextLink } from "@/components/admin/ui";

export default function NewFaqPage() {
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
