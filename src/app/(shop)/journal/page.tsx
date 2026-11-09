import type { Metadata } from "next";
import { mediaStyle } from "@/lib/media-transform";
import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/navbar";
import RolloverText from "@/components/rollover-text";
import SignUpBanner from "@/components/sign-up-banner";
import { getT } from "@/lib/i18n-server";
import { getPosts } from "@/lib/journal";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("meta.journal") };
}

const when = (iso?: string, lang = "en") => (iso ? new Date(iso).toLocaleDateString(lang === "no" ? "nb-NO" : "en-GB", { day: "numeric", month: "long", year: "numeric" }) : "");

/** The journal: posts as the shop grid shows products — photo, title, a line — three across. */
export default async function JournalPage() {
  const [posts, t] = await Promise.all([getPosts(), getT()]);
  return (
    <div className="flex flex-col gap-[60px] pb-[60px] md:gap-[120px] md:pb-[120px]">
      <div className="flex flex-col gap-[60px] md:gap-0">
        <Navbar tone="dark" />
        <header className="flex flex-col gap-[24px] px-[24px] md:px-[42px] md:pt-[42px] md:pb-[60px]">
          <h1 className="m-0 font-americana text-big-header-mobile capitalize text-black md:text-big-header-desktop">{t("journal.title")}</h1>
        </header>
        <div className="grid grid-cols-1 gap-[42px] px-[24px] md:grid-cols-3 md:gap-[42px] md:px-[42px]">
          {posts.length === 0 && <p className="m-0 font-gotham text-paragraph text-black/50">{t("journal.empty")}</p>}
          {posts.map((post) => (
            <article key={post.slug} className="flex flex-col gap-[12px] font-gotham text-paragraph text-black">
              <Link href={`/journal/${post.slug}`} className="relative block aspect-[4/5] w-full overflow-hidden bg-[#f7f7f7]">
                {post.image && <Image src={post.image.src} alt={post.image.alt} fill sizes="(min-width: 768px) 33vw, 100vw" className="object-cover" style={mediaStyle(post.image)} />}
              </Link>
              <p className="m-0 text-[11px] leading-normal text-black/50">{when(post.date, t("nav.shop") === "Butikk" ? "no" : "en")}</p>
              <Link href={`/journal/${post.slug}`} className="font-americana text-big-header-mobile capitalize">
                <RolloverText text={post.title} capitalize />
              </Link>
              {post.intro && <p className="m-0 text-black/70">{post.intro}</p>}
            </article>
          ))}
        </div>
      </div>
      <SignUpBanner variant="smaller" mobileVariant="clothing" />
    </div>
  );
}
