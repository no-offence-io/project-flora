"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { allowSignInEmail, customerIdFor, endSession, getCustomer, makeSignInToken, normalizeEmail, readSignInToken, safeNext, sessionEmail, startSession, upsertCustomer } from "./customer";
import { getLanguage } from "./language";
import { sendSignInLink } from "./notify";
import { getWriteClient } from "@/sanity/lib/write";
import { allow } from "./rate-limit";

export type SignInState = { status: "idle" | "sent" | "invalid" | "failed"; email?: string };

const base = () => (process.env.NEXT_PUBLIC_SITE_URL || "https://www.prosjectflora.com").replace(/\/$/, "");

/**
 * Sign in and register are the same step: we email a link; the first click creates the account.
 * The answer is "sent" whether or not an account exists, so the form can't be used to find out
 * who shops here. A hidden "website" field drops bots.
 */
export async function requestSignIn(_prev: SignInState, formData: FormData): Promise<SignInState> {
  if (String(formData.get("website") ?? "")) return { status: "sent" };
  const parsed = z.email().safeParse(normalizeEmail(String(formData.get("email") ?? "")));
  if (!parsed.success) return { status: "invalid" };
  const next = safeNext(String(formData.get("next") ?? ""));
  // Same answer whether or not we sent, so nobody learns anything by retrying. Two limits: per
  // visitor, so one script can't send to a thousand addresses, and per address, so nobody's inbox is flooded.
  if (!(await allow("signin")) || !(await allowSignInEmail(parsed.data))) return { status: "sent", email: parsed.data };
  const url = `${base()}/account/verify?token=${encodeURIComponent(makeSignInToken(parsed.data))}&next=${encodeURIComponent(next)}`;
  try {
    await sendSignInLink(parsed.data, await getLanguage(), url);
  } catch (err) {
    console.error("[account] sign-in email failed", err);
    const { notice } = await import("./notices");
    await notice({ kind: "error", source: "accounts", title: "A customer's sign-in email could not be sent", detail: err instanceof Error ? err.message : String(err) });
    return { status: "failed" };
  }
  return { status: "sent", email: parsed.data };
}

export async function signOutCustomer() {
  await endSession();
  redirect("/");
}

const details = z.object({
  firstName: z.string().trim().max(100),
  lastName: z.string().trim().max(100),
  phonePrefix: z.string().trim().max(6),
  phone: z.string().trim().max(30),
  street: z.string().trim().max(200),
  apartment: z.string().trim().max(200),
  postcode: z.string().trim().max(20),
  city: z.string().trim().max(100),
  country: z.string().trim().max(100),
});

export async function saveDetails(formData: FormData) {
  const email = await sessionEmail();
  if (!email) redirect("/account/login");
  const { getCountryCode } = await import("@/data/country-codes");
  const values = Object.fromEntries(["firstName", "lastName", "phone", "street", "apartment", "postcode", "city", "country"].map((k) => [k, String(formData.get(k) ?? "")]));
  const parsed = details.safeParse({ ...values, phonePrefix: getCountryCode(String(formData.get("phonePrefixIso") ?? ""))?.dial ?? "" });
  if (!parsed.success) redirect("/account/details?error=1");
  await upsertCustomer(email);
  await getWriteClient().patch(customerIdFor(email)).set(parsed.data).commit();
  revalidatePath("/account", "layout");
  redirect("/account/details?saved=1");
}

export async function saveMeasurements(formData: FormData) {
  const email = await sessionEmail();
  if (!email) redirect("/account/login");
  const labels = formData.getAll("label").map(String);
  const values = formData.getAll("value").map((v) => String(v).trim().replace(",", "."));
  const measurements = labels
    .map((label, i) => ({ _key: `m${i}`, _type: "measurement", label: label.slice(0, 40), value: values[i] ?? "" }))
    .filter((m) => /^\d{1,3}(\.\d)?$/.test(m.value));
  await upsertCustomer(email);
  await getWriteClient().patch(customerIdFor(email)).set({ measurements }).commit();
  revalidatePath("/account", "layout");
  redirect("/account/measurements?saved=1");
}

/** The profile goes; the orders stay (they are bookkeeping records), still findable by email. */
export async function deleteAccount(formData: FormData) {
  const customer = await getCustomer();
  if (!customer) redirect("/account/login");
  if (formData.get("sure") !== "on") redirect("/account?confirm=delete");
  if (customer.stripeCustomerId) {
    const { getStripe } = await import("./stripe");
    await getStripe().customers.del(customer.stripeCustomerId).catch((err) => console.error("[account] could not delete Stripe customer", err));
  }
  await getWriteClient().delete(customer._id);
  await endSession();
  redirect("/?account=deleted");
}

/** The "Sign in" button on the page the email link opens. A POST, so link scanners can't use it up. */
export async function confirmSignIn(formData: FormData) {
  const email = await readSignInToken(String(formData.get("token") ?? ""));
  const next = safeNext(String(formData.get("next") ?? ""));
  if (!email) redirect("/account/login?expired=1");
  await upsertCustomer(email, { language: await getLanguage() });
  const client = getWriteClient();
  const doc = await client.patch(customerIdFor(email)).setIfMissing({ sessionVersion: 0 }).set({ lastSignInAt: new Date().toISOString() }).commit<{ sessionVersion?: number }>();
  await startSession(email, doc.sessionVersion ?? 0);
  redirect(next);
}

/** Ends every session on every device, this one included. */
export async function signOutEverywhere() {
  const customer = await getCustomer();
  if (customer) await getWriteClient().patch(customer._id).setIfMissing({ sessionVersion: 0 }).inc({ sessionVersion: 1 }).commit();
  await endSession();
  redirect("/account/login?signedout=1");
}

/** Saved cards live at Stripe. Removing one detaches it from this customer's Stripe record — after checking it is theirs. */
export async function removeCard(formData: FormData) {
  const customer = await getCustomer();
  if (!customer?.stripeCustomerId) redirect("/account/login");
  const id = String(formData.get("id") ?? "");
  if (!/^pm_[A-Za-z0-9]+$/.test(id)) redirect("/account/cards");
  const { getStripe } = await import("./stripe");
  const pm = await getStripe().paymentMethods.retrieve(id).catch(() => null);
  if (pm && pm.customer === customer.stripeCustomerId) await getStripe().paymentMethods.detach(id);
  revalidatePath("/account/cards");
  redirect("/account/cards?removed=1");
}
