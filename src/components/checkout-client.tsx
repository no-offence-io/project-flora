"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import type { StripeElementsOptions } from "@stripe/stripe-js";
import { useCart } from "./cart-context";
import CheckoutForm from "./checkout-form";
import OrderSummary from "./order-summary";
import { getCountryCode } from "@/data/country-codes";
import type { Customer, IntentResponse } from "@/lib/checkout-schema";
import { getStripePromise } from "@/lib/stripe-client";

type Quote = Pick<IntentResponse, "clientSecret" | "paymentIntentId" | "totals"> & {
  /** The cart this quote priced; totals for any other cart are stale and shown as pending. */
  cartKey: string;
};

const cartKeyOf = (items: { id: string; quantity: number }[]) => JSON.stringify(items.map((i) => [i.id, i.quantity]));
type IntentResult = { ok: true; quote: Quote } | { ok: false; message: string };

/** Square corners and the site's black, so the Stripe-hosted fields sit with the rest of the form. */
const APPEARANCE: StripeElementsOptions["appearance"] = {
  theme: "stripe",
  variables: { colorPrimary: "#000000", colorText: "#000000", borderRadius: "0px", fontSizeBase: "13.35px" },
};

/** Field names in the billing form → the customer shape the API validates. */
function readCustomer(form: HTMLFormElement): Customer {
  const data = new FormData(form);
  const text = (name: string) => String(data.get(name) ?? "").trim();
  const optional = (name: string) => text(name) || undefined;
  return {
    email: text("email"),
    firstName: text("first-name"),
    lastName: text("last-name"),
    country: text("country"),
    street: text("street"),
    apartment: optional("apartment"),
    postcode: text("postcode"),
    city: text("city"),
    // The select submits an ISO country code (its value drives the flag and label); the API wants
    // the dial code that goes with it.
    phonePrefix: getCountryCode(text("phone-prefix"))?.dial ?? "+47",
    phone: text("phone"),
    note: optional("note"),
  };
}

/**
 * The checkout's interactive half. It asks the server to quote the cart (and create or update the
 * PaymentIntent), shows the server's totals, and mounts Stripe's Payment Element against that
 * intent. Every amount on screen and every amount charged comes from the same server quote.
 */
export default function CheckoutClient({ formId }: { formId: string }) {
  const { items } = useCart();
  const stripePromise = useMemo(() => getStripePromise(), []);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const intentIdRef = useRef<string | null>(null);

  const requestIntent = useCallback(
    async (customer?: Customer): Promise<IntentResult> => {
      const res = await fetch("/api/checkout/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((item) => ({ id: item.id, quantity: item.quantity })),
          ...(customer ? { customer } : {}),
          ...(intentIdRef.current ? { paymentIntentId: intentIdRef.current } : {}),
        }),
      });
      const body = (await res.json().catch(() => ({}))) as Partial<IntentResponse> & { error?: string; issues?: { message: string }[] };
      if (!res.ok || !body.clientSecret || !body.paymentIntentId || !body.totals) {
        return { ok: false, message: body.issues?.[0]?.message ?? body.error ?? "Could not start payment." };
      }
      intentIdRef.current = body.paymentIntentId;
      const next: Quote = { clientSecret: body.clientSecret, paymentIntentId: body.paymentIntentId, totals: body.totals, cartKey: cartKeyOf(items) };
      setQuote(next);
      setQuoteError(null);
      return { ok: true, quote: next };
    },
    [items],
  );

  // Re-quote whenever the cart changes, lightly debounced so a quantity spinner doesn't fire per click.
  // An emptied cart keeps its PaymentIntent id: if items come back, the same intent is updated
  // rather than a new one minted, and the Payment Element the customer may have started filling stays.
  useEffect(() => {
    if (items.length === 0) return;
    const timer = window.setTimeout(() => {
      requestIntent().then((result) => {
        if (!result.ok) setQuoteError(result.message);
      });
    }, 400);
    return () => window.clearTimeout(timer);
  }, [items, requestIntent]);

  if (items.length === 0) {
    return (
      <p className="font-gotham text-paragraph text-black/70">
        Your cart is empty.{" "}
        <Link href="/shop" className="text-black underline">
          Back to the shop
        </Link>
        .
      </p>
    );
  }

  const options: StripeElementsOptions | null = quote ? { clientSecret: quote.clientSecret, appearance: APPEARANCE } : null;
  // Only show totals that were priced for exactly this cart; while a re-quote is in flight the
  // numbers read as pending instead of quietly showing the previous cart's amounts.
  const totals = quote && quote.cartKey === cartKeyOf(items) ? quote.totals : null;

  return (
    <div className="flex flex-col gap-[60px] md:flex-row md:items-stretch md:gap-[42px]">
      <CheckoutForm id={formId} className="md:min-w-0 md:flex-1" />
      <OrderSummary totals={totals}>
        {!stripePromise ? (
          <p className="m-0 text-black/50">Payments are not configured: NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is missing.</p>
        ) : quote && options ? (
          // Keyed on the client secret: a brand-new PaymentIntent gets a fresh Elements instance,
          // while updates to the same intent keep the one the customer is already typing into.
          <Elements key={quote.clientSecret} stripe={stripePromise} options={options}>
            <PaymentSection formId={formId} paymentIntentId={quote.paymentIntentId} requestIntent={requestIntent} />
          </Elements>
        ) : (
          <p className="m-0 text-black/50" role="status">
            {quoteError ?? "Preparing payment…"}
          </p>
        )}
      </OrderSummary>
    </div>
  );
}

/**
 * Hidden diagnostic: with `?debug=wallets` in the URL, asks the browser itself whether Apple Pay and
 * Google Pay can be used on this page and prints the answer. This is the same check the Payment
 * Element runs before deciding to show a wallet tab, so "false" here means the device or browser
 * is the reason a wallet is missing, not the Stripe account or the domain registration.
 */
function WalletsDebug() {
  const stripe = useStripe();
  const [result, setResult] = useState<string | null>(null);
  const enabled = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("debug") === "wallets";

  useEffect(() => {
    if (!enabled || !stripe) return;
    const request = stripe.paymentRequest({
      country: "NO",
      currency: "nok",
      total: { label: "Wallet check", amount: 100 },
    });
    request
      .canMakePayment()
      .then((can) => setResult(JSON.stringify({ applePay: can?.applePay ?? false, googlePay: can?.googlePay ?? false, link: can?.link ?? false, userAgent: navigator.userAgent })))
      .catch((err: unknown) => setResult(`error: ${err instanceof Error ? err.message : String(err)}`));
  }, [enabled, stripe]);

  if (!enabled) return null;
  return (
    <pre className="m-0 whitespace-pre-wrap break-all border border-black/25 p-[12px] text-[11px] leading-normal">
      wallets: {result ?? "checking…"}
    </pre>
  );
}

function PaymentSection({
  formId,
  paymentIntentId,
  requestIntent,
}: {
  formId: string;
  paymentIntentId: string;
  requestIntent: (customer: Customer) => Promise<IntentResult>;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const confirm = async () => {
    if (!stripe || !elements) return;
    const form = document.getElementById(formId);
    if (!(form instanceof HTMLFormElement) || !form.reportValidity()) return;

    setConfirming(true);
    setMessage(null);
    try {
      // Re-quote with the billing details right before charging: the server re-derives the amount
      // one last time and stamps the customer onto the intent for the order record.
      const result = await requestIntent(readCustomer(form));
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      if (result.quote.paymentIntentId !== paymentIntentId) {
        setMessage("Your cart was updated. Please review the total and confirm again.");
        return;
      }
      // The Payment Element caches the intent it mounted with; pull the updated amount before confirming.
      const { error: updateError } = await elements.fetchUpdates();
      if (updateError) {
        setMessage(updateError.message ?? "Could not refresh the payment. Please try again.");
        return;
      }

      const origin = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: `${origin}/order-complete` },
      });
      // Only reached on failure — success redirects to return_url. Declines arrive here as card_error.
      if (error) setMessage(error.message ?? "Payment failed. Please try again.");
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="flex flex-col gap-[12px]">
      <PaymentElement options={{ layout: "tabs" }} />
      <WalletsDebug />

      {message && (
        <p className="m-0 text-[#b00020]" role="alert">
          {message}
        </p>
      )}

      <button
        type="button"
        onClick={confirm}
        disabled={!stripe || !elements || confirming}
        className="flex w-full items-center justify-center bg-black p-[12px] font-gotham text-paragraph text-white hover:opacity-80 transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
      >
        {confirming ? "Confirming…" : "Confirm order"}
      </button>

      <p className="m-0 text-black/50">
        Your personal data will be used to process your order, support your experience throughout this website, and for other purposes
        described in our{" "}
        <Link href="/privacy" className="text-black underline">
          privacy policy
        </Link>
        .
      </p>
    </div>
  );
}
