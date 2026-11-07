import { saveVintageCard } from "./actions";
import InstagramExport, { type ExportablePiece } from "@/components/admin/instagram-export";
import VintageCardForm from "@/components/admin/vintage-card-form";
import { Heading, Muted, Subheading } from "@/components/admin/ui";
import { adminClient } from "@/lib/admin/sanity";
import { parseVintageCard } from "@/lib/vintage-card-shared";

type Piece = { slug?: string | null; nameEn?: string | null; nameNo?: string | null; priceOre?: number | null; src?: string | null; alt?: string | null };
type Current = { vintageCard?: Record<string, unknown> | null; sample?: { src?: string | null; alt?: string | null; name?: string | null } | null; pieces?: Piece[] | null };

export default async function VintageCardPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const { saved } = await searchParams;
  // The setting, and one vintage piece's first photo for the preview (any product's if none is vintage yet).
  const current = await adminClient().fetch<Current | null>(
    `{ "vintageCard": *[_id == "siteSettings"][0].vintageCard, "sample": coalesce(*[_type == "product" && vintage == true && defined(images[0].asset)] | order(_createdAt desc)[0], *[_type == "product" && defined(images[0].asset)][0]){ "src": images[0].asset->url, "alt": images[0].alt, "name": name[_key == "en"][0].value },
      "pieces": *[_type == "product" && vintage == true && defined(images[0].asset) && defined(slug.current)] | order(_createdAt desc){ "slug": slug.current, "nameEn": name[_key == "en"][0].value, "nameNo": name[_key == "no"][0].value, priceOre, "src": images[0].asset->url, "alt": images[0].alt } }`,
  );
  const pieces: ExportablePiece[] = (current?.pieces ?? []).flatMap((p) => (p.slug && p.src ? [{ slug: p.slug, name: { en: p.nameEn ?? p.slug, no: p.nameNo ?? p.nameEn ?? p.slug }, priceOre: p.priceOre ?? 0, src: p.src, alt: p.alt ?? "" }] : []));
  const setting = parseVintageCard(current?.vintageCard);
  const sample = current?.sample?.src ? { src: current.sample.src, alt: current.sample.alt ?? current.sample.name ?? "" } : null;
  return (
    <>
      <div className="flex flex-col gap-[12px]">
        <Heading>Vintage card</Heading>
        {saved ? <Muted>Saved. Vintage pages use it from the next time they are opened.</Muted> : <Muted>How a vintage piece is shown at the top of its page. Drag the preview to turn it.</Muted>}
      </div>
      <VintageCardForm initial={setting} sample={sample} action={saveVintageCard} />
      <div className="flex flex-col gap-[12px]">
        <Subheading>Export for Instagram</Subheading>
        <Muted>A short video of a piece turning once, with its words, ready to post as a reel. It loops seamlessly. Made here in the browser, then downloaded.</Muted>
      </div>
      <InstagramExport pieces={pieces} setting={setting} oneOfAKind={{ en: "One of a kind", no: "Unikt plagg" }} />
    </>
  );
}
