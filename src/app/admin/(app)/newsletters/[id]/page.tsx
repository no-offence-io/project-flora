import { notFound } from "next/navigation";
import NewsletterEditor from "@/components/admin/newsletter-editor";
import { Heading, TextLink } from "@/components/admin/ui";
import { loadNewsletter } from "@/lib/admin/newsletter";
import { adminClient } from "@/lib/admin/sanity";
import { requireAdmin } from "@/lib/admin/session";
import { parseBlocks } from "@/lib/newsletter-blocks";
import { emailConfigured } from "@/lib/notify";

const PRODUCTS = `*[_type == "product" && visible != false] | order(_createdAt asc){ _id, "name": name[_key == "en"][0].value, priceOre, "image": images[0].asset->url, "gif": gif.asset->url }`;

export default async function NewsletterPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const { id } = await params;
  const [doc, products, subscribers] = await Promise.all([loadNewsletter(id), adminClient().fetch(PRODUCTS), adminClient().fetch<number>(`count(*[_type == "subscriber" && !defined(unsubscribedAt)])`)]);
  if (!doc) notFound();
  return (
    <>
      <div className="flex flex-col gap-[12px]">
        <TextLink href="/admin/newsletters">← Newsletters</TextLink>
        <Heading>{doc.title || "Newsletter"}</Heading>
      </div>
      <NewsletterEditor doc={{ ...doc, blocks: parseBlocks(doc.blocks) }} products={products} subscribers={subscribers} email={admin.email} mailReady={emailConfigured()} initialBlocks={[]} />
    </>
  );
}
