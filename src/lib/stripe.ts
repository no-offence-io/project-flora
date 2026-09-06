import "server-only";
import Stripe from "stripe";

let client: Stripe | null = null;

/** Server-side Stripe client. The secret key is read lazily so a missing key fails a request, not the build. */
export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set. Copy .env.example to .env.local and add your test keys.");
  client ??= new Stripe(key);
  return client;
}
