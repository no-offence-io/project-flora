import { z } from "zod";

/** What the browser remembers about this visit, sent along with the order. Plain strings, all optional. */
export const visitSchema = z.strictObject({
  source: z.string().trim().max(60).optional(),
  medium: z.string().trim().max(60).optional(),
  campaign: z.string().trim().max(80).optional(),
  referrer: z.string().trim().max(120).optional(),
  landing: z.string().trim().max(120).optional(),
  views: z.number().int().min(0).max(10000).optional(),
});
export type Visit = z.infer<typeof visitSchema>;

export const VISIT_KEY = "flora-visit";

/** How the dashboard shows where an order came from. */
export type Origin = { label: string; device?: string; views?: number; landing?: string; referrer?: string; campaign?: string };

const NAMES: Record<string, string> = {
  ig: "Instagram", instagram: "Instagram", fb: "Facebook", facebook: "Facebook", tiktok: "TikTok", pinterest: "Pinterest",
  google: "Google", bing: "Bing", newsletter: "Newsletter", email: "Email", snapchat: "Snapchat", linktree: "Linktree",
};
const pretty = (s: string) => NAMES[s.toLowerCase()] ?? s.charAt(0).toUpperCase() + s.slice(1);

/**
 * "Source: Instagram", "Organic: Google", "Referral: vogue.no", "Direct" — the same buckets her old
 * shop used. A tagged link (utm_source, which Instagram adds to the link in bio) wins over the referrer.
 */
export function originLabel(v: Visit | undefined): string {
  if (v?.source) return `Source: ${pretty(v.source)}`;
  const host = v?.referrer?.replace(/^www\./, "").toLowerCase();
  if (!host) return "Direct";
  if (/(^|\.)google\./.test(host)) return "Organic: Google";
  if (/(^|\.)(bing\.com|duckduckgo\.com|yahoo\.|ecosia\.org)/.test(host)) return `Organic: ${pretty(host.split(".")[0])}`;
  if (/(^|\.)instagram\.com$/.test(host)) return "Social: Instagram";
  if (/(^|\.)(facebook\.com|fb\.com)$/.test(host)) return "Social: Facebook";
  if (/(^|\.)tiktok\.com$/.test(host)) return "Social: TikTok";
  if (/(^|\.)pinterest\./.test(host)) return "Social: Pinterest";
  return `Referral: ${host}`;
}

/** Phone, tablet or computer, from the browser's own description of itself. */
export function deviceFrom(userAgent: string | null): string {
  const ua = userAgent ?? "";
  if (/iPad|Tablet|PlayBook|Silk|(Android(?!.*Mobile))/i.test(ua)) return "Tablet";
  if (/Mobi|iPhone|iPod|Android/i.test(ua)) return "Mobile";
  return ua ? "Desktop" : "Unknown";
}
