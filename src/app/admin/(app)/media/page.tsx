import Image from "next/image";
import { deleteMedia, uploadMedia } from "../actions";
import { Button, Card, Heading, Labelled, Muted, Subheading } from "@/components/admin/ui";
import { formatBytes, listMedia } from "@/lib/admin/media";
import { requireAdmin } from "@/lib/admin/session";

/**
 * Everything ever uploaded: photos and videos, newest first, with where they're used. Upload here
 * to have a file ready, or upload straight from the field that needs it — both end up in this list.
 */
export default async function MediaPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  await requireAdmin();
  const { saved, error } = await searchParams;
  const assets = await listMedia();
  const images = assets.filter((a) => a._type === "sanity.imageAsset");
  const files = assets.filter((a) => a._type === "sanity.fileAsset");

  return (
    <>
      <div className="flex flex-col gap-[12px]">
        <Heading>Media</Heading>
        <Muted>
          {images.length} photos, {files.length} videos. Files in use can&apos;t be deleted; remove them from their page first.
        </Muted>
        {saved && <Muted>Uploaded.</Muted>}
        {error && (
          <p className="m-0 font-gotham text-paragraph text-[#b00020]" role="alert">
            {error}
          </p>
        )}
      </div>

      <Card className="md:max-w-[640px]">
        <Subheading>Upload</Subheading>
        <div className="h-px w-full bg-black/25" />
        <form action={uploadMedia} className="flex flex-col gap-[24px]">
          <Labelled label="Photos or videos" hint="JPG, PNG or WebP up to 15 MB; MP4 or WebM up to 60 MB. Several at once is fine.">
            <input type="file" name="files" accept="image/*,video/mp4,video/webm" multiple required className="font-gotham text-paragraph file:mr-[12px] file:border file:border-black/20 file:bg-transparent file:px-[12px] file:py-[8px] file:font-gotham file:text-paragraph file:text-black" />
          </Labelled>
          <Button className="md:max-w-[320px]">Upload</Button>
        </form>
      </Card>

      <section className="flex flex-col gap-[12px]">
        <Subheading>Photos</Subheading>
        <div className="h-px w-full bg-black/25" />
        {images.length === 0 ? (
          <Muted>No photos yet.</Muted>
        ) : (
          <ul className="m-0 grid list-none grid-cols-2 gap-[12px] p-0 md:grid-cols-4 lg:grid-cols-6">
            {images.map((a) => (
              <li key={a._id} className="flex flex-col gap-[6px] font-gotham text-[11px] leading-normal text-black">
                <a href={a.url} target="_blank" rel="noreferrer" className="relative flex aspect-[4/5] w-full items-center justify-center bg-[#f7f7f7]">
                  <Image src={a.url} alt={a.originalFilename ?? ""} fill sizes="200px" className="object-contain p-[12px]" />
                </a>
                <span className="truncate" title={a.originalFilename}>{a.originalFilename ?? a._id}</span>
                <span className="text-black/50">
                  {a.width}×{a.height} · {formatBytes(a.size)} · {a.usedBy === 0 ? "not in use" : `used in ${a.usedBy}`}
                </span>
                {a.usedBy === 0 && (
                  <form action={deleteMedia}>
                    <input type="hidden" name="id" value={a._id} />
                    <button type="submit" className="text-black/50 underline hover:text-black transition-colors">Delete</button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-[12px]">
        <Subheading>Videos</Subheading>
        <div className="h-px w-full bg-black/25" />
        {files.length === 0 ? (
          <Muted>No videos yet.</Muted>
        ) : (
          <ul className="m-0 grid list-none grid-cols-1 gap-[12px] p-0 md:grid-cols-3">
            {files.map((a) => (
              <li key={a._id} className="flex flex-col gap-[6px] font-gotham text-[11px] leading-normal text-black">
                <video src={a.url} controls muted playsInline preload="metadata" className="aspect-video w-full bg-[#f7f7f7]" />
                <span className="truncate" title={a.originalFilename}>{a.originalFilename ?? a._id}</span>
                <span className="text-black/50">
                  {formatBytes(a.size)} · {a.usedBy === 0 ? "not in use" : `used in ${a.usedBy}`}
                </span>
                {a.usedBy === 0 && (
                  <form action={deleteMedia}>
                    <input type="hidden" name="id" value={a._id} />
                    <button type="submit" className="text-black/50 underline hover:text-black transition-colors">Delete</button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
