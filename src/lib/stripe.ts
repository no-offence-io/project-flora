import "server-only";
import Stripe from "stripe";

let client: Stripe | null = null;

/** Thrown when the Stripe environment is inconsistent, as opposed to a Stripe API failure. */
export class StripeConfigError extends Error {}

/**
 * Refuses to take a payment in a configuration that can't work, or that can take money without
 * recording an order. Checked on every intent rather than at boot, because the deployment's
 * environment is what decides this and it can change under a running app.
 *
 * Two states matter:
 *
 *  - **Mode mismatch.** Stripe.js in the browser is keyed to one environment and this server to
 *    another, so the browser can't confirm the PaymentIntent this server created. Left unchecked it
 *    surfaces to the customer as an error at the moment of paying.
 *  - **Live with no webhook secret.** The webhook is the only thing that records an order, and it
 *    rejects every delivery whose signature it can't verify. Taking live payments in that state
 *    charges real customers and leaves no trace of what they bought — so we refuse to start one.
 */
export function assertStripeEnvironment(): void {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    throw new StripeConfigError("STRIPE_SECRET_KEY is not set. Copy .env.example to .env.local and add your keys.");
  }

  const publishable = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  const secretIsLive = secret.startsWith("sk_live_");
  const publishableIsLive = publishable?.startsWith("pk_live_") ?? secretIsLive;

  if (publishable && secretIsLive !== publishableIsLive) {
    throw new StripeConfigError(
      `Stripe key mismatch: the secret key is ${secretIsLive ? "live" : "test"} but the publishable key is ` +
        `${publishableIsLive ? "live" : "test"}. Both must be from the same mode.`,
    );
  }

  if (secretIsLive && !process.env.STRIPE_WEBHOOK_SECRET) {
    throw new StripeConfigError(
      "Refusing to take live payments: STRIPE_WEBHOOK_SECRET is not set, so the webhook cannot verify " +
        "Stripe's signature and no order would be recorded for a real payment.",
    );
  }
}

/** Server-side Stripe client. The secret key is read lazily so a missing key fails a request, not the build. */
export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new StripeConfigError("STRIPE_SECRET_KEY is not set. Copy .env.example to .env.local and add your keys.");
  client ??= new Stripe(key);
  return client;
}
