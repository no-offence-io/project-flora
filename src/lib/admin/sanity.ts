import "server-only";
import { getWriteClient } from "@/sanity/lib/write";

/**
 * The admin reads and writes through the server-only token, never the CDN: an editor must see
 * exactly what is stored, the moment it is stored.
 */
export const adminClient = () => getWriteClient();

export const nok = new Intl.NumberFormat("nb-NO", { style: "currency", currency: "NOK", maximumFractionDigits: 0 });
export const kr = (ore: number | undefined | null) => nok.format((ore ?? 0) / 100);

/** "1290" or "1 290,50" typed by a person → integer øre. */
export function kronerToOre(input: FormDataEntryValue | null): number | undefined {
  const s = String(input ?? "").replace(/\s/g, "").replace(",", ".").trim();
  if (!s) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n * 100) : undefined;
}

export function oreToKroner(ore: number | undefined | null): string {
  return ore === undefined || ore === null ? "" : String(ore / 100).replace(".", ",");
}
