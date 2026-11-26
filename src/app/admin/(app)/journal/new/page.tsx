import PostForm from "@/components/admin/post-form";
import { Heading, TextLink } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/session";

export default async function NewPostPage() {
  await requireAdmin();
  return (
    <>
      <div className="flex flex-col gap-[12px]">
        <TextLink href="/admin/journal">← Journal</TextLink>
        <Heading>New post</Heading>
      </div>
      <PostForm post={null} />
    </>
  );
}
