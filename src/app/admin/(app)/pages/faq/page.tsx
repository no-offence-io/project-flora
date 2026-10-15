import Link from "next/link";
import { Heading, Muted, Row } from "@/components/admin/ui";
import { getText, type LocalizedString } from "@/lib/admin/localized";
import { adminClient } from "@/lib/admin/sanity";

export default async function FaqList() {
  const items = await adminClient().fetch<{ _id: string; question?: LocalizedString; order?: number }[]>(`*[_type == "faqItem"] | order(order asc){_id, question, order}`);
  return (
    <>
      <div className="flex flex-col gap-[12px] md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-[12px]">
          <Heading>FAQ</Heading>
          <Muted>{items.length} questions, in the order they appear.</Muted>
        </div>
        <Link href="/admin/pages/faq/new" className="flex items-center justify-center bg-black px-[24px] py-[12px] font-gotham text-paragraph text-white hover:opacity-80 transition-opacity">
          New question
        </Link>
      </div>
      <div className="flex flex-col gap-[12px] md:max-w-[640px]">
        {items.map((it, i) => (
          <Row key={it._id} href={`/admin/pages/faq/${it._id}`}>
            <span className="shrink-0">{String(i + 1).padStart(2, "0")}</span>
            <span className="flex-1">{getText(it.question, "en") || "Untitled"}</span>
          </Row>
        ))}
        {items.length === 0 && <Muted>No questions yet.</Muted>}
      </div>
    </>
  );
}
