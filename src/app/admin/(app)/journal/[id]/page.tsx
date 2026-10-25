import { notFound } from "next/navigation";
import PostForm, { POST_PROJECTION, type PostDoc } from "@/components/admin/post-form";
import { Heading, Muted, TextLink } from "@/components/admin/ui";
import { getText } from "@/lib/admin/localized";
import { adminClient } from "@/lib/admin/sanity";

export default async function PostPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const { id } = await params;
  const { saved } = await searchParams;
  const post = await adminClient().fetch<PostDoc | null>(`*[_type == "post" && _id == $id][0]${POST_PROJECTION}`, { id });
  if (!post) notFound();
  return (
    <>
      <div className="flex flex-col gap-[12px]">
        <TextLink href="/admin/journal">← Journal</TextLink>
        <Heading>{getText(post.title, "en") || "Post"}</Heading>
        {saved && <Muted>Saved.</Muted>}
      </div>
      <PostForm post={post} />
    </>
  );
}
