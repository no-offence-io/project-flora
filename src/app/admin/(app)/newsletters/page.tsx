import { Heading, Muted, Row, Tag } from "@/components/admin/ui";
import { adminClient } from "@/lib/admin/sanity";
import { requireAdmin } from "@/lib/admin/session";

type Row_ = { _id: string; title?: string; subjectEn?: string; status?: string; sentAt?: string; sentCount?: number; _updatedAt?: string };

export default async function NewslettersPage() {
  await requireAdmin();
  const [rows, subscribers] = await Promise.all([
    adminClient().fetch<Row_[]>(`*[_type == "newsletter"] | order(coalesce(sentAt, _updatedAt) desc){ _id, title, subjectEn, status, sentAt, sentCount, _updatedAt }`),
    adminClient().fetch<number>(`count(*[_type == "subscriber" && !defined(unsubscribedAt)])`),
  ]);
  return (
    <>
      <div className="flex flex-col gap-[12px]">
        <div className="flex flex-col gap-[12px]">
          <Heading>Newsletters</Heading>
          <Muted>{subscribers} subscribers on the list. Write a draft, send yourself a test, then send to everyone.</Muted>
        </div>
      </div>
      {rows.length === 0 ? (
        <Muted>Nothing written yet.</Muted>
      ) : (
        <div className="flex flex-col gap-[12px]">
          {rows.map((n) => (
            <Row key={n._id} href={`/admin/newsletters/${n._id}`} className="flex-wrap">
              <span className="min-w-0 flex-1 truncate">
                {n.title || "Untitled"} <span className="text-black/50">{n.subjectEn}</span>
              </span>
              <span className="text-[11px] text-black/50">
                {n.status === "sent" && n.sentAt ? `sent ${new Date(n.sentAt).toLocaleDateString("nb-NO")} · ${n.sentCount ?? 0} people` : n._updatedAt ? `edited ${new Date(n._updatedAt).toLocaleDateString("nb-NO")}` : ""}
              </span>
              {n.status === "sent" ? <Tag tone="muted">sent</Tag> : <Tag>draft</Tag>}
            </Row>
          ))}
        </div>
      )}
    </>
  );
}
