import "server-only";
import { defineQuery } from "next-sanity";
import { CONTENT_TAG } from "./catalog";
import { getLanguage } from "./language";
import { sanityFetch } from "@/sanity/lib/live";

const L = (field: string) => `coalesce(${field}[_key == $lang][0].value, ${field}[_key == "en"][0].value)`;
const IMG = (field: string) => `{ "src": ${field}.asset->url, "alt": ${L(`${field}.alt`)} }`;
const FIELDS = `"slug": slug.current, "title": ${L("title")}, date, "intro": ${L("intro")}, "body": ${L("body")}, "image": ${IMG("image")}`;

const POSTS_QUERY = defineQuery(`*[_type == "post" && published == true && defined(slug.current)] | order(date desc, _createdAt desc){ ${FIELDS} }`);
const POST_QUERY = defineQuery(`*[_type == "post" && published == true && slug.current == $slug][0]{ ${FIELDS} }`);

type Block = { children?: { text?: string }[] };
type Raw = { slug: string; title?: string | null; date?: string | null; intro?: string | null; body?: Block[] | null; image?: { src?: string | null; alt?: string | null } | null };
export type Post = { slug: string; title: string; date?: string; intro: string; paragraphs: string[]; image?: { src: string; alt: string } };

const toPost = (r: Raw): Post => ({
  slug: r.slug,
  title: r.title ?? "",
  date: r.date ?? undefined,
  intro: r.intro ?? "",
  paragraphs: (r.body ?? []).map((b) => (b.children ?? []).map((c) => c.text ?? "").join("")).filter(Boolean),
  ...(r.image?.src ? { image: { src: r.image.src, alt: r.image.alt ?? r.title ?? "" } } : {}),
});

export async function getPosts(): Promise<Post[]> {
  const lang = await getLanguage();
  const { data } = await sanityFetch({ query: POSTS_QUERY, params: { lang }, stega: false, tags: [CONTENT_TAG] });
  return ((data ?? []) as Raw[]).map(toPost);
}

export async function getPost(slug: string): Promise<Post | null> {
  const lang = await getLanguage();
  const { data } = await sanityFetch({ query: POST_QUERY, params: { slug, lang }, stega: false, tags: [CONTENT_TAG] });
  return data ? toPost(data as Raw) : null;
}
