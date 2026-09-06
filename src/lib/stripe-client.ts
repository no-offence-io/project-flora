import { loadStripe, type Stripe } from "@stripe/stripe-js";

let promise: Promise<Stripe | null> | null = null;

/** Browser-side Stripe.js, loaded once. Only the publishable key is ever exposed to the client. */
export function getStripePromise(): Promise<Stripe | null> | null {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!key) return null;
  promise ??= loadStripe(key);
  return promise;
}
