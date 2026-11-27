import "server-only";
import { getWriteClient } from "@/sanity/lib/write";
import { DEFAULT_NOTIFY_ON, isEmail, SCENARIO_KEYS, type NotifyScenario } from "./email-shared";

/*
 * Who emails come from and who gets told what, from Settings & brand → Emails. Kept in a private
 * document of its own (the addresses are people's own), not on the public settings document.
 *
 * Until something has been saved there, the starting values apply: EMAIL_FROM for the sender, and
 * for who is told about orders and errors EMAIL_NOTIFY or, failing that, everyone allowed into the
 * dashboard (ADMIN_EMAILS). So a new order never goes unannounced just because nobody has opened
 * Settings yet. Once saved, what was saved is used exactly, an empty list included.
 */
export type EmailSettings = {
  fromName: string;
  /** Must be at the site's own domain, the one verified in Resend; null = Resend's test sender. */
  fromAddress: string | null;
  replyTo: string | null;
  notifyTo: string[];
  notifyOn: NotifyScenario[];
};

export const EMAIL_SETTINGS_ID = "private.emailSettings";

export const siteDomain = () => new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://www.prosjectflora.com").hostname.replace(/^www\./, "");

function parseFrom(value: string | undefined): { name: string | null; address: string | null } {
  const m = (value ?? "").trim().match(/^(?:"?([^"<]*)"?\s*)?<?([^<>\s]+@[^<>\s]+)>?$/);
  return m ? { name: m[1]?.trim() || null, address: m[2].toLowerCase() } : { name: null, address: null };
}
const list = (s: string) => s.split(/[,\s]+/).map((x) => x.trim().toLowerCase()).filter(isEmail);

export async function getEmailSettings(): Promise<EmailSettings> {
  let doc: Record<string, unknown> | null = null;
  try {
    // The second place is where these settings lived before they had a document of their own.
    doc = await getWriteClient().fetch<Record<string, unknown> | null>(`coalesce(*[_id == $id][0], *[_id == "siteSettings"][0].email)`, { id: EMAIL_SETTINGS_ID });
  } catch (err) {
    console.error("[email] settings unreadable, using the defaults", err);
  }
  const d = doc ?? {};
  const str = (k: string) => (typeof d[k] === "string" && (d[k] as string).trim() ? (d[k] as string).trim() : null);
  const env = parseFrom(process.env.EMAIL_FROM);
  const notifyTo = list(doc ? (str("notifyTo") ?? "") : (process.env.EMAIL_NOTIFY || process.env.ADMIN_EMAILS || ""));
  const notifyOn = Array.isArray(d.notifyOn) ? (d.notifyOn as unknown[]).filter((k): k is NotifyScenario => SCENARIO_KEYS.includes(k as NotifyScenario)) : DEFAULT_NOTIFY_ON;
  return {
    fromName: str("fromName") ?? env.name ?? "Flöra",
    fromAddress: str("fromAddress")?.toLowerCase() ?? env.address,
    replyTo: str("replyTo")?.toLowerCase() ?? notifyTo[0] ?? null,
    notifyTo,
    notifyOn,
  };
}

/** The From header. Only an address at the verified domain can be used; otherwise Resend's test sender. */
export function fromHeader(s: EmailSettings): string {
  const ok = s.fromAddress && s.fromAddress.endsWith(`@${siteDomain()}`);
  return ok ? `${s.fromName.replace(/[<>"]/g, "")} <${s.fromAddress}>` : "Flöra <onboarding@resend.dev>";
}

/** The addresses to tell about this scenario, if Ida asked to hear about it. */
export const notifyAddresses = (s: EmailSettings, scenario: NotifyScenario): string[] => (s.notifyOn.includes(scenario) ? s.notifyTo : []);
