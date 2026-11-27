import { clearRead, markAllRead, markRead } from "./actions";
import { Card, Heading, Muted, Row, Subheading, Tag, TextLink } from "@/components/admin/ui";
import { healthChecks, listNotices } from "@/lib/notices";
import { requireAdmin } from "@/lib/admin/session";
import { getEmailSettings } from "@/lib/email-settings";

const tone = (kind: string) => (kind === "error" ? "border-[#b00020] text-[#b00020]" : kind === "warning" ? "border-black text-black" : "border-black/50 text-black/50");
const when = (iso: string) => new Date(iso).toLocaleString("nb-NO", { dateStyle: "short", timeStyle: "short" });

/**
 * Two lists. "Right now" is computed on every visit — missing keys, test mode, waiting orders,
 * stock — so it is always true and never needs clearing. "Events" are things that happened and
 * were written down by the site: failed emails, webhook errors, sends; those are read and cleared.
 */
export default async function NotificationsPage() {
  await requireAdmin();
  const [checks, notices, mail] = await Promise.all([healthChecks(), listNotices(), getEmailSettings()]);
  const notifyTo = mail.notifyTo;
  const unread = notices.filter((n) => !n.readAt);
  return (
    <>
      <div className="flex flex-col gap-[12px]">
        <Heading>Notifications</Heading>
        <Muted>
          {checks.length === 0 ? "Everything is connected and nothing is waiting." : `${checks.length} thing${checks.length === 1 ? "" : "s"} to look at right now`}
          {unread.length ? ` · ${unread.length} unread event${unread.length === 1 ? "" : "s"}` : ""}.
        </Muted>
      </div>

      <section className="flex flex-col gap-[12px]">
        <Subheading>Right now</Subheading>
        <div className="h-px w-full bg-black/25" />
        {checks.length === 0 ? (
          <Muted>All clear.</Muted>
        ) : (
          <div className="flex flex-col gap-[12px]">
            {checks.map((c) => (
              <Row key={c.title} href={c.href} className="items-start">
                <span className={`mt-[2px] shrink-0 border-[0.5px] px-[4px] py-[1px] text-[11px] ${tone(c.kind)}`}>{c.kind}</span>
                <span className="flex min-w-0 flex-1 flex-col gap-[5px]">
                  <span>{c.title}</span>
                  <span className="text-[11px] leading-normal text-black/50">{c.detail}</span>
                </span>
              </Row>
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-[12px]">
        <div className="flex items-center justify-between gap-[12px]">
          <Subheading>Events</Subheading>
          <div className="flex gap-[12px] font-gotham text-[11px]">
            {unread.length > 0 && (
              <form action={markAllRead}>
                <button type="submit" className="text-black underline hover:opacity-70 transition-opacity">Mark all read</button>
              </form>
            )}
            {notices.some((n) => n.readAt) && (
              <form action={clearRead}>
                <button type="submit" className="text-black/50 underline hover:text-black transition-colors">Clear read</button>
              </form>
            )}
          </div>
        </div>
        <div className="h-px w-full bg-black/25" />
        {notices.length === 0 ? (
          <Muted>Nothing has happened yet. Failed emails, payment webhook problems and newsletter sends show up here.</Muted>
        ) : (
          <div className="flex flex-col gap-[12px]">
            {notices.map((n) => (
              <Row key={n._id} className={`items-start ${n.readAt ? "opacity-60" : ""}`}>
                <span className={`mt-[2px] shrink-0 border-[0.5px] px-[4px] py-[1px] text-[11px] ${tone(n.kind)}`}>{n.kind}</span>
                <span className="flex min-w-0 flex-1 flex-col gap-[5px]">
                  <span>
                    {n.title} {n.href && <TextLink href={n.href} className="text-[11px]">open</TextLink>}
                  </span>
                  {n.detail && <span className="text-[11px] leading-normal text-black/50">{n.detail}</span>}
                  <span className="text-[11px] leading-normal text-black/50">
                    {when(n.createdAt)}
                    {n.source ? ` · ${n.source}` : ""}
                  </span>
                </span>
                {n.readAt ? (
                  <Tag tone="muted">read</Tag>
                ) : (
                  <form action={markRead}>
                    <input type="hidden" name="id" value={n._id} />
                    <button type="submit" className="font-gotham text-[11px] text-black underline hover:opacity-70 transition-opacity">Mark read</button>
                  </form>
                )}
              </Row>
            ))}
          </div>
        )}
      </section>

      <Card className="md:max-w-[640px]">
        <Muted>
          {notifyTo.length ? <>What you chose to hear about is also emailed to {notifyTo.join(", ")} as it happens, so nothing waits for a login here.</> : <>Nothing is emailed: no address is set.</>} Change it under <TextLink href="/admin/settings">Settings</TextLink>.
        </Muted>
      </Card>
    </>
  );
}
