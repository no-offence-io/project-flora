"use server";

import { z } from "zod";
import { client } from "@/sanity/lib/client";
import { count, overLimit } from "./rate-limit";

export type OrderView = {
  orderNumber: string;
  status: string;
  orderedAt: string;
  trackingNumber?: string;
  trackingUrl?: string;
  items: { name: string; quantity: number; size?: string; colour?: string; measurements: { label: string; value: string }[] }[];
  totalOre: number;
};
export type LookupState = { status: "idle" } | { status: "notFound" } | { status: "found"; order: OrderView };

/**
 * "Find my order": the number from the confirmation plus the email it was placed with. Both must
 * match, so a number alone (they are derived from Stripe ids and could be guessed) reveals nothing.
 * Orders are private documents, so this reads with the server's token, and only the fields listed
 * leave the server.
 */
export async function lookupOrder(_prev: LookupState, formData: FormData): Promise<LookupState> {
  const parsed = z
    .object({ number: z.string().trim().toUpperCase().regex(/^FL-[A-Z0-9]{6,10}$/), email: z.email() })
    .safeParse({ number: formData.get("number"), email: String(formData.get("email") ?? "").trim().toLowerCase() });
  if (!parsed.success) return { status: "notFound" };
  // A number and an address can be guessed at together; after a run of misses the visitor waits.
  if (await overLimit("lookup")) return { status: "notFound" };
  const { number, email } = parsed.data;
  const o = await client.withConfig({ useCdn: false }).fetch<Omit<OrderView, "trackingUrl"> | null>(
    `*[_type == "order" && orderNumber == $number && lower(customer.email) == $email][0]{
      orderNumber, status, orderedAt, trackingNumber, totalOre,
      "items": items[]{ name, quantity, size, colour, "measurements": coalesce(measurements[]{ label, value }, []) }
    }`,
    { number, email },
  );
  if (!o) {
    await count("lookup");
    return { status: "notFound" };
  }
  const { trackingUrlFor } = await import("./notify");
  return { status: "found", order: { ...o, items: o.items ?? [], trackingUrl: o.trackingNumber ? trackingUrlFor(o.trackingNumber) : undefined } };
}
