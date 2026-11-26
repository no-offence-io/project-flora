import { Bars } from "@/components/admin/charts";
import LiveVisitors from "@/components/admin/live-visitors";
import RangePicker from "@/components/admin/range-picker";
import { Card, Heading, Muted, Subheading, TextLink } from "@/components/admin/ui";
import { analyticsConfigured, getVisits, liveOrReason, serviceAccountEmail, type Visits } from "@/lib/admin/analytics";
import { addDays, dayKey, daysBetween, parseRange, presetRange, previousRange } from "@/lib/admin/reports";
import { adminClient } from "@/lib/admin/sanity";
import { requireAdmin } from "@/lib/admin/session";

const n = new Intl.NumberFormat("nb-NO");
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

/**
 * Visitors through the period: one bar per day, quiet days included (Analytics only sends the days
 * that had someone), or one per month once the period is longer than three months.
 */
function VisitorsChart({ daily, range }: { daily: Visits["daily"]; range: { from: string; to: string } }) {
  const perDay = new Map(daily.map((d) => [`${d.date.slice(0, 4)}-${d.date.slice(4, 6)}-${d.date.slice(6, 8)}`, d.users]));
  const byMonth = daysBetween(range.from, range.to) > 92;
  const labels: string[] = [];
  const values: number[] = [];
  if (byMonth) {
    // Visitors per day added up over a month: someone who came on three days counts three times, as the heading says.
    const months = new Map<string, number>();
    for (let d = range.from; d <= range.to; d = addDays(d, 1)) months.set(d.slice(0, 7), (months.get(d.slice(0, 7)) ?? 0) + (perDay.get(d) ?? 0));
    for (const [key, users] of months) {
      labels.push(new Date(`${key}-01T12:00:00Z`).toLocaleDateString("en-GB", { month: "short", year: "2-digit", timeZone: "UTC" }));
      values.push(users);
    }
  } else {
    for (let d = range.from; d <= range.to; d = addDays(d, 1)) {
      labels.push(new Date(`${d}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }));
      values.push(perDay.get(d) ?? 0);
    }
  }
  return <Bars label={byMonth ? "Daily visitors, added up per month" : "Visitors per day"} unit="count" height={160} labelRoom={8} labels={labels} series={[{ name: "Visitors", tone: "ink", values }]} emptyText="No visits recorded in this period." />;
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

export default async function VisitsPage({ searchParams }: { searchParams: Promise<{ days?: string; range?: string; from?: string; to?: string }> }) {
  await requireAdmin();
  const params = await searchParams;
  const today = dayKey(new Date());
  // Any day or period, as on Reports. Old links with ?days=7 / 30 / 90 still mean what they did.
  const legacy = params.days === "7" ? "7d" : params.days === "30" ? "30d" : null;
  const range = !params.range && !params.from && legacy ? presetRange(legacy, today) : parseRange(params, today, "30d");
  const before = previousRange(range);
  const settings = await adminClient().fetch<{ gaMeasurementId?: string; gaPropertyId?: string } | null>(`*[_id == "siteSettings"][0]{ gaMeasurementId, gaPropertyId }`);
  const propertyId = settings?.gaPropertyId?.trim();

  // The period's figures and the live panel's first answer, asked for together; either may fail without taking the other down.
  const ready = analyticsConfigured() && Boolean(propertyId);
  const [live, report] = await Promise.all([
    ready ? liveOrReason() : Promise.resolve(null),
    ready
      ? getVisits(propertyId!, range, before).then(
          (visits): { visits: Visits | null; error: string | null } => ({ visits, error: null }),
          (err): { visits: Visits | null; error: string | null } => ({ visits: null, error: err instanceof Error ? err.message : String(err) }),
        )
      : Promise.resolve({ visits: null, error: null }),
  ]);
  const { visits, error } = report;

  return (
    <>
      <div className="flex flex-col gap-[12px]">
        <Heading>Visits</Heading>
        <Muted>From Google Analytics. Only visitors who said yes to cookies are counted, so treat these as the shape of things, not an exact headcount.</Muted>
      </div>

      {live && <LiveVisitors initial={live} />}
      {ready && <RangePicker path="/admin/visits" range={range} today={today} />}

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
            <Subheading>{daysBetween(range.from, range.to) > 92 ? "Daily visitors, per month" : "Visitors per day"}</Subheading>
            <div className="h-px w-full bg-black/25" />
            <VisitorsChart daily={visits.daily} range={range} />
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
