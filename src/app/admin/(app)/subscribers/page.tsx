import Link from "next/link";
import { resubscribeSubscriber, unsubscribeSubscriber } from "./actions";
import { Card, Heading, Muted, Row, Subheading, Tag, TextLink } from "@/components/admin/ui";
import { adminClient } from "@/lib/admin/sanity";

type Sub = { _id: string; email?: string; language?: string; signedUpAt?: string; unsubscribedAt?: string };

const ANALYTICS_URL = "https://vercel.com/no-offence/project-flora/analytics";

export default async function SubscribersPage() {
  const subs = await adminClient().fetch<Sub[]>(`*[_type == "subscriber"] | order(signedUpAt desc)[0...500]{ _id, email, language, signedUpAt, unsubscribedAt }`);
  const active = subs.filter((s) => !s.unsubscribedAt).length;
  return (
    <>
      <div className="flex flex-col gap-[12px] md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-[12px]">
          <Heading>Visitors &amp; subscribers</Heading>
          <Muted>{active} on the newsletter list, {subs.length - active} unsubscribed.</Muted>
        </div>
        <Link href="/admin/subscribers/export" prefetch={false} className="flex items-center justify-center bg-black px-[24px] py-[12px] font-gotham text-paragraph text-white hover:opacity-80 transition-opacity md:w-auto">
          Download as CSV
        </Link>
      </div>

      <Card className="md:max-w-[640px]">
        <Subheading>Visitor statistics</Subheading>
        <div className="h-px w-full bg-black/25" />
        <Muted>
          Page views, visitors, countries and top pages are counted by Vercel, with no cookies.{" "}
          <TextLink href={ANALYTICS_URL}>Open the statistics</TextLink> (signs in with the Vercel account).
        </Muted>
      </Card>

      {subs.length === 0 ? (
        <Muted>No sign-ups yet. The form at the bottom of the shop adds people here.</Muted>
      ) : (
        <div className="flex flex-col gap-[12px]">
          {subs.map((s) => (
            <Row key={s._id} className="flex-wrap">
              <span className="min-w-0 flex-1 truncate">{s.email}</span>
              <span className="text-[11px] text-black/50">{s.language === "no" ? "Norsk" : "English"}</span>
              <span className="text-[11px] text-black/50">{s.signedUpAt ? new Date(s.signedUpAt).toLocaleDateString("nb-NO") : ""}</span>
              {s.unsubscribedAt ? <Tag tone="muted">unsubscribed</Tag> : <Tag>subscribed</Tag>}
              <form action={s.unsubscribedAt ? resubscribeSubscriber : unsubscribeSubscriber}>
                <input type="hidden" name="id" value={s._id} />
                <button type="submit" className="font-gotham text-[11px] text-black/50 underline hover:text-black transition-colors">{s.unsubscribedAt ? "Re-add" : "Remove"}</button>
              </form>
            </Row>
          ))}
        </div>
      )}
    </>
  );
}
