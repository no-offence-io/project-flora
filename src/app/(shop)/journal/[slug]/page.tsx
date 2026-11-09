import type { Metadata } from "next";
import { mediaStyle } from "@/lib/media-transform";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import Navbar from "@/components/navbar";
import RolloverText from "@/components/rollover-text";
import SignUpBanner from "@/components/sign-up-banner";
import { getT } from "@/lib/i18n-server";
import { getPost } from "@/lib/journal";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: "Flöra" };
  return { title: `${post.title} – Flöra`, description: post.intro.slice(0, 160), openGraph: post.image ? { images: [{ url: post.image.src, alt: post.image.alt }] } : undefined };
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [post, t] = await Promise.all([getPost(slug), getT()]);
  if (!post) notFound();
  return (
    <div className="flex flex-col gap-[60px] pb-[60px] md:gap-[120px] md:pb-[120px]">
      <div className="flex flex-col gap-[60px] md:gap-[42px]">
        <Navbar tone="dark" />
        <article className="flex flex-col gap-[42px] px-[24px] md:grid md:grid-cols-2 md:items-start md:gap-[42px] md:px-[42px]">
          {post.image && (
            <div className="relative aspect-[4/5] w-full overflow-hidden md:sticky md:top-[42px]">
              <Image src={post.image.src} alt={post.image.alt} fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" style={mediaStyle(post.image)} priority />
            </div>
          )}
          <div className="flex flex-col gap-[24px] font-gotham text-paragraph text-black">
            <Link href="/journal" className="text-black/50">
              <RolloverText text={`← ${t("journal.title")}`} />
            </Link>
            <h1 className="m-0 font-americana text-big-header-mobile capitalize md:text-big-header-desktop">{post.title}</h1>
            {post.intro && <p className="m-0">{post.intro}</p>}
            {post.paragraphs.map((para, i) => (
              <p key={i} className="m-0 text-black/70">
                {para}
              </p>
            ))}
          </div>
        </article>
      </div>
      <SignUpBanner variant="smaller" mobileVariant="clothing" />
    </div>
  );
}
