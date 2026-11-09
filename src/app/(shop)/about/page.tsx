import type { Metadata } from "next";
import { mediaStyle } from "@/lib/media-transform";
import Image from "next/image";
import Navbar from "@/components/navbar";
import SignUpBanner from "@/components/sign-up-banner";
import { getAboutPage } from "@/lib/catalog";
import { getT } from "@/lib/i18n-server";

export async function generateMetadata(): Promise<Metadata> {
  const [t, about] = await Promise.all([getT(), getAboutPage()]);
  return { title: about ? `${about.title} – Flöra` : t("meta.about"), description: about?.intro.slice(0, 160) };
}

/** About: photo one side, words the other, like the values blocks. Editable under Pages → About. */
export default async function AboutPage() {
  const [about, t] = await Promise.all([getAboutPage(), getT()]);
  const title = about?.title ?? t("nav.about");
  return (
    <div className="flex flex-col gap-[60px] pb-[60px] md:gap-[120px] md:pb-[120px]">
      <div className="flex flex-col gap-[60px] md:gap-[42px]">
        <Navbar tone="dark" />
        <section className="flex flex-col gap-[42px] px-[24px] md:grid md:grid-cols-2 md:items-start md:gap-[42px] md:px-[42px]">
          {about?.image && (
            <div className="relative aspect-[4/5] w-full overflow-hidden md:sticky md:top-[42px]">
              <Image src={about.image.src} alt={about.image.alt} fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" style={mediaStyle(about.image)} />
            </div>
          )}
          <div className="flex flex-col gap-[24px] font-gotham text-paragraph text-black">
            <h1 className="m-0 font-americana text-big-header-mobile capitalize md:text-big-header-desktop">{title}</h1>
            {about?.intro && <p className="m-0 text-black">{about.intro}</p>}
            {(about?.paragraphs ?? []).map((para, i) => (
              <p key={i} className="m-0 text-black/70">
                {para}
              </p>
            ))}
            {!about && <p className="m-0 text-black/50">This page is written in the admin under Pages → About.</p>}
          </div>
        </section>
      </div>
      <SignUpBanner variant="smaller" mobileVariant="clothing" />
    </div>
  );
}
