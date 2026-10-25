"use server";

import { createHash } from "node:crypto";
import { z } from "zod";
import { getLanguage } from "./language";
import { sendNewsletterWelcome } from "./notify";
import { getWriteClient } from "@/sanity/lib/write";

export type SignUpState = { status: "idle" | "ok" | "invalid" | "failed" };

/**
 * The banner's sign-up. One `subscriber` document per address (the id is a hash of it, so signing
 * up twice is a no-op), the welcome email on the first time only. A hidden "website" field catches
 * bots: anything in it gets a cheerful OK and nothing is stored.
 */
export async function subscribe(_prev: SignUpState, formData: FormData): Promise<SignUpState> {
  if (String(formData.get("website") ?? "")) return { status: "ok" };
  const parsed = z.email().safeParse(String(formData.get("email") ?? "").trim().toLowerCase());
  if (!parsed.success) return { status: "invalid" };
  const email = parsed.data;
  const language = await getLanguage();
  const id = `subscriber-${createHash("sha256").update(email).digest("hex").slice(0, 32)}`;

  try {
    const client = getWriteClient();
    const existing = await client.getDocument(id);
    if (existing) {
      if (existing.unsubscribedAt) await client.patch(id).unset(["unsubscribedAt"]).commit();
      return { status: "ok" };
    }
    await client.create({ _id: id, _type: "subscriber", email, language, signedUpAt: new Date().toISOString() });
    sendNewsletterWelcome(email, language).catch(async (err) => {
      console.error("[newsletter] welcome email failed", err);
      const { notice } = await import("./notices");
      await notice({ kind: "warning", source: "email", title: `Welcome email to ${email} failed`, detail: err instanceof Error ? err.message : String(err), href: "/admin/subscribers" });
    });
    return { status: "ok" };
  } catch (err) {
    console.error("[newsletter] sign-up failed", err);
    return { status: "failed" };
  }
}
