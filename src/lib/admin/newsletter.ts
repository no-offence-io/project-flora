import "server-only";
import { adminClient } from "./sanity";
import { parseBlocks, type Block } from "@/lib/newsletter-blocks";
import { renderNewsletter, sendNewsletter, unsubscribeUrlFor, type NewsletterProduct } from "@/lib/notify";

/*
 * A newsletter document → rendered mail per language, and the send loop. Product names are
 * English in both languages, by the brand's choice.
 */
export type NewsletterDoc = { _id: string; subjectEn?: string; subjectNo?: string; title?: string; blocks?: string; status?: string; sentAt?: string; sentCount?: number; testSentAt?: string };

export async function loadNewsletter(id: string): Promise<NewsletterDoc | null> {
  return adminClient().fetch<NewsletterDoc | null>(`*[_type == "newsletter" && _id == $id][0]{ _id, subjectEn, subjectNo, title, blocks, status, sentAt, sentCount, testSentAt }`, { id });
}

const base = () => (process.env.NEXT_PUBLIC_SITE_URL || "https://www.prosjectflora.com").replace(/\/$/, "");

/** Everything a "pieces" block could point at, keyed by product id. */
export async function productsForNewsletter(ids: string[]): Promise<Record<string, NewsletterProduct>> {
  if (!ids.length) return {};
  const rows = await adminClient().fetch<{ _id: string; name?: string; priceOre?: number; image?: string; gif?: string; slug?: string }[]>(
    `*[_type == "product" && _id in $ids]{ _id, "name": name[_key == "en"][0].value, priceOre, "image": images[0].asset->url, "gif": gif.asset->url, "slug": slug.current }`,
    { ids },
  );
  const out: Record<string, NewsletterProduct> = {};
  for (const r of rows) out[r._id] = { name: r.name ?? "", priceOre: r.priceOre ?? 0, image: r.image, gif: r.gif, href: `${base()}/shop/${r.slug ?? ""}` };
  return out;
}

export const productIdsIn = (blocks: Block[]) => blocks.flatMap((b) => (b.kind === "products" ? b.ids : []));

export async function renderForLang(blocks: Block[], lang: "en" | "no", unsubscribeUrl: string, editable = false): Promise<string> {
  const products = await productsForNewsletter(productIdsIn(blocks));
  return renderNewsletter(blocks, { lang, products, unsubscribeUrl, editable });
}

export async function sendNewsletterToAll(doc: NewsletterDoc): Promise<number> {
  const blocks = parseBlocks(doc.blocks);
  if (!blocks.length) throw new Error("The newsletter is empty");
  const subject = { en: doc.subjectEn ?? "", no: doc.subjectNo || doc.subjectEn || "" };
  if (!subject.en) throw new Error("A subject line is needed before sending");
  const products = await productsForNewsletter(productIdsIn(blocks));
  const subscribers = await adminClient().fetch<{ _id: string; email: string; language?: string }[]>(
    `*[_type == "subscriber" && !defined(unsubscribedAt) && defined(email) && demo != true]{ _id, email, language }`,
  );
  let sent = 0;
  const failed: string[] = [];
  for (const s of subscribers) {
    const lang = s.language === "no" ? "no" : "en";
    try {
      const html = renderNewsletter(blocks, { lang, products, unsubscribeUrl: unsubscribeUrlFor(s._id) });
      if (await sendNewsletter({ email: s.email, subject: subject[lang] }, html)) sent++;
    } catch (err) {
      console.error(`[newsletter] failed for ${s.email}`, err);
      failed.push(s.email);
    }
  }
  const { notice } = await import("@/lib/notices");
  const name = doc.title || subject.en;
  if (failed.length) await notice({ kind: "error", source: "newsletter", title: `Newsletter "${name}" failed for ${failed.length} of ${subscribers.length}`, detail: failed.slice(0, 20).join(", "), href: `/admin/newsletters/${doc._id}` });
  else await notice({ kind: "info", source: "newsletter", title: `Newsletter "${name}" sent to ${sent} subscribers`, href: `/admin/newsletters/${doc._id}` });
  return sent;
}
