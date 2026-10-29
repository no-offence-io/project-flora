import Link from "next/link";
import { Card, Heading, Muted, Subheading, TextLink } from "@/components/admin/ui";
import { analyticsConfigured, getActiveNow, getVisits, serviceAccountEmail, type Visits } from "@/lib/admin/analytics";
import { adminClient } from "@/lib/admin/sanity";

const PERIODS = [7, 30, 90] as const;
type Period = (typeof PERIODS)[number];

const n = new Intl.NumberFormat("nb-NO");
const day = (yyyymmdd: string) => new Date(`${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`).toLocaleDateString("nb-NO", { day: "numeric", month: "short" });
const minutes = (seconds: number, sessions: number) => (sessions ? `${Math.floor(seconds / sessions / 60)}:${String(Math.round((seconds / sessions) % 60)).padStart(2, "0")}` : "0:00");

/** "+12 %" against the previous period, or nothing when there was no previous period to compare with. */
function Change({ now, before }: { now: number; before: number }) {
  if (!before) return null;
  const pct = Math.round(((now - before) / before) * 100);
  return <span className="text-[11px] text-black/50">{pct >= 0 ? "+" : ""}{pct} % vs. before</span>;
}

function Stat({ label, value, change }: { label: string; value: string; change?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-[6px] border-[0.5px] border-black/25 p-[12px] md:p-[24px]">
      <span className="text-[11px] text-black/50">{label}</span>
      <span className="font-americana text-[24px] leading-none md:text-[32px]">{value}</span>
      {change}
    </div>
  );
}

/** Visitors per day as plain bars: the shape of the period at a glance, labelled at both ends. */
function DailyChart({ daily }: { daily: Visits["daily"] }) {
  if (!daily.length) return <Muted className="text-[11px]">No visits recorded in this period yet.</Muted>;
  const max = Math.max(1, ...daily.map((d) => d.users));
  const W = 600, H = 140, gap = daily.length > 40 ? 1 : 3;
  const bw = (W - gap * (daily.length - 1)) / daily.length;
  return (
    <div className="flex flex-col gap-[6px]">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-[140px] w-full" role="img" aria-label="Visitors per day">
        {daily.map((d, i) => {
          const h = Math.max(1, (d.users / max) * (H - 2));
          return <rect key={d.date} x={i * (bw + gap)} y={H - h} width={bw} height={h} fill="currentColor"><title>{`${day(d.date)}: ${d.users} visitors`}</title></rect>;
        })}
      </svg>
      <div className="flex justify-between text-[11px] text-black/50">
        <span>{day(daily[0].date)}</span>
        <span>peak {max}</span>
        <span>{day(daily[daily.length - 1].date)}</span>
      </div>
    </div>
  );
}

function Ranked({ rows, unit }: { rows: { label: string; value: number; sub?: string }[]; unit: string }) {
  if (!rows.length) return <Muted className="text-[11px]">Nothing yet.</Muted>;
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="m-0 flex list-none flex-col gap-[10px] p-0">
      {rows.map((r) => (
        <li key={r.label + (r.sub ?? "")} className="flex flex-col gap-[4px]">
          <div className="flex items-baseline justify-between gap-[12px]">
            <span className="min-w-0 truncate">{r.label}{r.sub && <span className="text-[11px] text-black/50"> {r.sub}</span>}</span>
            <span className="shrink-0 text-[11px] text-black/50">{n.format(r.value)} {unit}</span>
          </div>
          <div className="h-[3px] w-full bg-black/10"><div className="h-full bg-black" style={{ width: `${(r.value / max) * 100}%` }} /></div>
        </li>
      ))}
    </ul>
  );
}

export default async function VisitsPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const { days: rawDays } = await searchParams;
  const days: Period = PERIODS.includes(Number(rawDays) as Period) ? (Number(rawDays) as Period) : 30;
  const settings = await adminClient().fetch<{ gaMeasurementId?: string; gaPropertyId?: string } | null>(`*[_id == "siteSettings"][0]{ gaMeasurementId, gaPropertyId }`);
  const propertyId = settings?.gaPropertyId?.trim();

  let visits: Visits | null = null;
  let activeNow: number | null = null;
  let error: string | null = null;
  if (analyticsConfigured() && propertyId) {
    try {
      [visits, activeNow] = await Promise.all([getVisits(propertyId, days), getActiveNow(propertyId).catch(() => null)]);
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    }
  }

  return (
    <>
      <div className="flex flex-col gap-[12px]">
        <div className="flex flex-wrap items-end justify-between gap-[12px]">
          <Heading>Visits</Heading>
          <nav aria-label="Period" className="flex gap-[18px] font-gotham text-paragraph">
            {PERIODS.map((p) => (
              <Link key={p} href={`/admin/visits?days=${p}`} className={p === days ? "text-black underline underline-offset-4" : "text-black/50 hover:text-black transition-colors"}>
                {p} days
              </Link>
            ))}
          </nav>
        </div>
        <Muted>From Google Analytics. Only visitors who said yes to cookies are counted, so treat these as the shape of things, not an exact headcount.</Muted>
        {activeNow !== null && (
          <p className="m-0 flex items-center gap-[8px] font-gotham text-paragraph text-black">
            <span aria-hidden className={`inline-block h-[8px] w-[8px] rounded-full ${activeNow > 0 ? "bg-[#2c8a3e]" : "bg-black/25"}`} />
            {activeNow > 0 ? `${n.format(activeNow)} on the site right now` : "Nobody on the site right now"}
            <span className="text-[11px] text-black/50">· last 30 minutes, live; the figures below take Google a few hours</span>
          </p>
        )}
      </div>

      {!settings?.gaMeasurementId ? (
        <Card>
          <Subheading>Analytics is off</Subheading>
          <Muted>Add the Google Analytics measurement ID under <TextLink href="/admin/settings">Settings &amp; brand</TextLink> and the shop starts counting.</Muted>
        </Card>
      ) : !propertyId ? (
        <Card>
          <Subheading>Which property to read?</Subheading>
          <Muted>Add the Analytics property ID (nine digits, Administrator → Områdedetaljer) under <TextLink href="/admin/settings">Settings &amp; brand</TextLink>.</Muted>
        </Card>
      ) : !analyticsConfigured() ? (
        <Card>
          <Subheading>The dashboard can&apos;t read Analytics yet</Subheading>
          <Muted>The shop is counting, but reading the numbers here needs the service-account key: in Vercel, add <code>GA_SERVICE_ACCOUNT_B64</code> (the key file, base64) and redeploy. <TextLink href="/admin/setup">Setup</TextLink> has the steps.</Muted>
        </Card>
      ) : error ? (
        <Card>
          <Subheading>Google Analytics said no</Subheading>
          <p className="m-0 text-[#b00020]">{error}</p>
          {serviceAccountEmail() && <Muted className="text-[11px]">Reading as {serviceAccountEmail()} — it needs the Viewer role on property {propertyId}.</Muted>}
        </Card>
      ) : visits ? (
        <>
          <dl className="m-0 grid grid-cols-2 gap-[12px] font-gotham text-paragraph text-black md:grid-cols-4 md:gap-[24px]">
            <Stat label="Visitors" value={n.format(visits.totals.users)} change={<Change now={visits.totals.users} before={visits.previous.users} />} />
            <Stat label="Visits" value={n.format(visits.totals.sessions)} change={<Change now={visits.totals.sessions} before={visits.previous.sessions} />} />
            <Stat label="Page views" value={n.format(visits.totals.views)} change={<Change now={visits.totals.views} before={visits.previous.views} />} />
            <Stat label="Time per visit" value={minutes(visits.totals.seconds, visits.totals.sessions)} change={<span className="text-[11px] text-black/50">minutes</span>} />
          </dl>

          <Card>
            <Subheading>Visitors per day</Subheading>
            <div className="h-px w-full bg-black/25" />
            <DailyChart daily={visits.daily} />
          </Card>

          <div className="grid gap-[42px] md:grid-cols-2">
            <Card>
              <Subheading>Where they came from</Subheading>
              <div className="h-px w-full bg-black/25" />
              <Ranked rows={visits.sources.map((s) => ({ label: s.name, value: s.sessions }))} unit="visits" />
            </Card>
            <Card>
              <Subheading>Most viewed products</Subheading>
              <div className="h-px w-full bg-black/25" />
              <Ranked rows={visits.products.map((p) => ({ label: p.title || p.path, value: p.views }))} unit="views" />
            </Card>
            <Card>
              <Subheading>Most viewed pages</Subheading>
              <div className="h-px w-full bg-black/25" />
              <Ranked rows={visits.pages.map((p) => ({ label: p.title || p.path, sub: p.path, value: p.views }))} unit="views" />
            </Card>
            <div className="flex flex-col gap-[42px]">
              <Card>
                <Subheading>Devices</Subheading>
                <div className="h-px w-full bg-black/25" />
                <Ranked rows={visits.devices.map((d) => ({ label: d.name, value: d.users }))} unit="visitors" />
              </Card>
              <Card>
                <Subheading>Countries</Subheading>
                <div className="h-px w-full bg-black/25" />
                <Ranked rows={visits.countries.map((c) => ({ label: c.name, value: c.users }))} unit="visitors" />
              </Card>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}
