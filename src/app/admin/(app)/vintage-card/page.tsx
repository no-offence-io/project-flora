import { saveVintageCard } from "./actions";
import VintageCardForm from "@/components/admin/vintage-card-form";
import { Heading, Muted } from "@/components/admin/ui";
import { adminClient } from "@/lib/admin/sanity";
import { parseVintageCard } from "@/lib/vintage-card-shared";

type Current = { vintageCard?: Record<string, unknown> | null; sample?: { src?: string | null; alt?: string | null; name?: string | null } | null };

export default async function VintageCardPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const { saved } = await searchParams;
  // The setting, and one vintage piece's first photo for the preview (any product's if none is vintage yet).
  const current = await adminClient().fetch<Current | null>(
    `{ "vintageCard": *[_id == "siteSettings"][0].vintageCard, "sample": coalesce(*[_type == "product" && vintage == true && defined(images[0].asset)] | order(_createdAt desc)[0], *[_type == "product" && defined(images[0].asset)][0]){ "src": images[0].asset->url, "alt": images[0].alt, "name": name[_key == "en"][0].value } }`,
  );
  const sample = current?.sample?.src ? { src: current.sample.src, alt: current.sample.alt ?? current.sample.name ?? "" } : null;
  return (
    <>
      <div className="flex flex-col gap-[12px]">
        <Heading>Vintage card</Heading>
        {saved ? <Muted>Saved. Vintage pages use it from the next time they are opened.</Muted> : <Muted>How a vintage piece is shown at the top of its page. Drag the preview to turn it.</Muted>}
      </div>
      <VintageCardForm initial={parseVintageCard(current?.vintageCard)} sample={sample} action={saveVintageCard} />
    </>
  );
}
