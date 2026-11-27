import Link from "next/link";
import { resubscribeSubscriber, unsubscribeSubscriber } from "./actions";
import { Card, Heading, Muted, Row, Subheading, Tag, TextLink } from "@/components/admin/ui";
import { adminClient } from "@/lib/admin/sanity";
import RangePicker, { type Filter } from "@/components/admin/range-picker";
import ShowMore, { parseShow } from "@/components/admin/show-more";
import { dayKey, parseRange, rangeParams } from "@/lib/admin/reports";
import { requireAdmin } from "@/lib/admin/session";

type Sub = { _id: string; email?: string; language?: string; signedUpAt?: string; unsubscribedAt?: string };

const ANALYTICS_URL = "https://vercel.com/no-offence/project-flora/analytics";

const STATES = [
  { value: "all", label: "Everyone" },
  { value: "on", label: "On the list" },
  { value: "off", label: "Unsubscribed" },
] as const;

export default async function SubscribersPage({ searchParams }: { searchParams: Promise<{ q?: string; range?: string; from?: string; to?: string; state?: string; show?: string }> }) {
  await requireAdmin();
  const params = await searchParams;
  const q = (params.q ?? "").trim().toLowerCase().slice(0, 80);
  const today = dayKey(new Date());
  const range = parseRange(params, today, "all");
  const state = STATES.find((x) => x.value === params.state)?.value ?? "all";
  const show = parseShow(params.show);
  const everyone = await adminClient().fetch<Sub[]>(`*[_type == "subscriber"] | order(signedUpAt desc)[0...5000]{ _id, email, language, signedUpAt, unsubscribedAt }`);
  const active = everyone.filter((s) => !s.unsubscribedAt).length;
  // The period is when they signed up.
  const inPeriod = (range.preset === "all" ? everyone : everyone.filter((s) => s.signedUpAt && dayKey(s.signedUpAt) >= range.from && dayKey(s.signedUpAt) <= range.to)).filter((s) => !q || (s.email ?? "").toLowerCase().includes(q));
  const ofState = (key: string) => (key === "on" ? inPeriod.filter((s) => !s.unsubscribedAt) : key === "off" ? inPeriod.filter((s) => s.unsubscribedAt) : inPeriod);
  const matching = ofState(state);
  const subs = matching.slice(0, show);
  const filters: Filter[] = [{ name: "state", label: "Who", value: state, fallback: "all", options: STATES.map((x) => ({ ...x, count: ofState(x.value).length })) }];
  const address: [string, string][] = [...rangeParams(range), ...(state !== "all" ? [["state", state] as [string, string]] : []), ...(q ? [["q", q] as [string, string]] : [])];
  const narrowed = Boolean(q || state !== "all" || range.preset !== "all");
  return (
    <>
      <div className="flex flex-col gap-[12px] md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-[12px]">
          <Heading>Visitors &amp; subscribers</Heading>
          <Muted>{active} on the newsletter list, {everyone.length - active} unsubscribed.</Muted>
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

      <RangePicker path="/admin/subscribers" range={range} today={today} all filters={filters} keep={{ q: q || undefined }} />

      <div className="flex flex-col gap-[12px] md:flex-row md:items-center md:justify-between">
        <form className="flex flex-1 gap-[12px]" role="search">
          {address.filter(([k]) => k !== "q").map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
          <input type="search" name="q" defaultValue={q} placeholder="Search email" aria-label="Search subscribers" className="min-w-0 flex-1 border border-black/20 bg-transparent p-[12px] font-gotham text-paragraph text-black outline-none placeholder:text-black/50 focus:border-black/60 md:max-w-[420px]" />
          <button className="border border-black px-[18px] font-gotham text-paragraph text-black hover:bg-black hover:text-white transition-colors">Search</button>
        </form>
        <p className="m-0 font-gotham text-paragraph text-black" role="status">
          {matching.length} {matching.length === 1 ? "sign-up" : "sign-ups"}
          {range.preset !== "all" && <span className="text-black/50"> · signed up {range.label}</span>}
          {narrowed && (
            <>
              {" "}
              <Link href="/admin/subscribers" className="text-[11px] text-black/50 underline underline-offset-4 hover:text-black">clear</Link>
            </>
          )}
        </p>
      </div>

      {subs.length === 0 ? (
        <Muted>{narrowed ? "No sign-ups match. Try a longer period, or clear the filters." : "No sign-ups yet. The form at the bottom of the shop adds people here."}</Muted>
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
      <ShowMore path="/admin/subscribers" params={address} shown={subs.length} total={matching.length} noun={["sign-up", "sign-ups"]} />
    </>
  );
}
