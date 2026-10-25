import NewsletterEditor from "@/components/admin/newsletter-editor";
import { Heading, Muted, TextLink } from "@/components/admin/ui";
import { adminClient } from "@/lib/admin/sanity";
import { requireAdmin } from "@/lib/admin/session";
import { defaultBlocks } from "@/lib/newsletter-blocks";
import { emailConfigured } from "@/lib/notify";

const PRODUCTS = `*[_type == "product" && visible != false] | order(_createdAt asc){ _id, "name": name[_key == "en"][0].value, priceOre, "image": images[0].asset->url, "gif": gif.asset->url }`;

export default async function NewNewsletterPage() {
  const admin = await requireAdmin();
  const [products, subscribers] = await Promise.all([adminClient().fetch(PRODUCTS), adminClient().fetch<number>(`count(*[_type == "subscriber" && !defined(unsubscribedAt)])`)]);
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.prosjectflora.com").replace(/\/$/, "");
  return (
    <>
      <div className="flex flex-col gap-[12px]">
        <TextLink href="/admin/newsletters">← Newsletters</TextLink>
        <Heading>New newsletter</Heading>
        <Muted>Starts as the lookbook layout — change the words, swap the photos, drag the blocks around. The preview on the right is the real mail.</Muted>
      </div>
      <NewsletterEditor doc={null} products={products} subscribers={subscribers} email={admin.email} mailReady={emailConfigured()} initialBlocks={defaultBlocks(base, products.slice(0, 4).map((p: { _id: string }) => p._id))} />
    </>
  );
}
