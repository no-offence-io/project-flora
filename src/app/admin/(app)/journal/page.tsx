import Image from "next/image";
import Link from "next/link";
import { Heading, Muted, Row, Tag } from "@/components/admin/ui";
import { getText, type LocalizedString } from "@/lib/admin/localized";
import { adminClient } from "@/lib/admin/sanity";

type Row_ = { _id: string; title?: LocalizedString; date?: string; published?: boolean; image?: string };

export default async function PostsPage() {
  const posts = await adminClient().fetch<Row_[]>(`*[_type == "post"] | order(date desc, _createdAt desc){ _id, title, date, published, "image": image.asset->url }`);
  return (
    <>
      <div className="flex flex-col gap-[12px] md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-[12px]">
          <Heading>Journal</Heading>
          <Muted>Posts at /journal — behind the scenes, new pieces, anything worth a few paragraphs and a photo.</Muted>
        </div>
        <Link href="/admin/journal/new" className="flex items-center justify-center bg-black px-[24px] py-[12px] font-gotham text-paragraph text-white hover:opacity-80 transition-opacity md:w-auto">
          New post
        </Link>
      </div>
      {posts.length === 0 ? (
        <Muted>No posts yet.</Muted>
      ) : (
        <div className="flex flex-col gap-[12px]">
          {posts.map((p) => (
            <Row key={p._id} href={`/admin/journal/${p._id}`}>
              <span className="relative h-[56px] w-[44px] shrink-0 bg-[#f7f7f7]">{p.image && <Image src={p.image} alt="" fill sizes="44px" className="object-cover" />}</span>
              <span className="min-w-0 flex-1 truncate">{getText(p.title, "en") || "Untitled"}</span>
              <span className="text-[11px] text-black/50">{p.date ?? ""}</span>
              {p.published ? <Tag>published</Tag> : <Tag tone="muted">draft</Tag>}
            </Row>
          ))}
        </div>
      )}
    </>
  );
}
