import { deletePost, savePost } from "@/app/admin/(app)/journal/actions";
import { ImageField } from "@/components/admin/media-field";
import { Bilingual, Button, Card, Checkbox, Input, Labelled, Muted } from "@/components/admin/ui";
import { getBlocksText, getText, type LocalizedBlocks, type LocalizedString } from "@/lib/admin/localized";

export type PostDoc = { _id: string; title?: LocalizedString; slug?: { current?: string }; date?: string; intro?: LocalizedString; body?: LocalizedBlocks; image?: { _ref: string; url: string } | null; published?: boolean };

export const POST_PROJECTION = `{ ..., "image": select(defined(image.asset) => { "_ref": image.asset._ref, "url": image.asset->url }) }`;

export default function PostForm({ post }: { post: PostDoc | null }) {
  const p = post;
  return (
    <form action={savePost} className="flex max-w-[860px] flex-col gap-[42px]">
      {p && <input type="hidden" name="id" value={p._id} />}
      <Card>
        <div className="flex flex-col gap-[24px]">
          <Bilingual name="title" label="Title" en={getText(p?.title, "en")} no={getText(p?.title, "no")} required />
          <div className="flex flex-col gap-[24px] md:flex-row">
            <Labelled label="Web address" hint="Lowercase letters, numbers and dashes." className="flex-1">
              <Input name="slug" defaultValue={p?.slug?.current ?? ""} required pattern="[a-z0-9-]+" />
            </Labelled>
            <Labelled label="Date" className="md:w-[200px]">
              <Input name="date" type="date" defaultValue={p?.date ?? new Date().toISOString().slice(0, 10)} />
            </Labelled>
          </div>
          <ImageField name="image" label="Photo" current={p?.image} />
          <Bilingual name="intro" label="Intro" en={getText(p?.intro, "en")} no={getText(p?.intro, "no")} multiline rows={3} />
          <Bilingual name="body" label="Text" en={getBlocksText(p?.body, "en")} no={getBlocksText(p?.body, "no")} multiline rows={14} />
          <Muted>Leave an empty line between paragraphs.</Muted>
          <Checkbox name="published" label="Published — shown in the journal" defaultChecked={p?.published === true} />
        </div>
      </Card>
      <div className="flex flex-col gap-[12px] md:max-w-[320px]">
        <Button>{p ? "Save" : "Create post"}</Button>
        {p && (
          <button type="submit" formAction={deletePost} className="font-gotham text-paragraph text-black/50 underline hover:text-black transition-colors">
            Delete this post
          </button>
        )}
      </div>
    </form>
  );
}
