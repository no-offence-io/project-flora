"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Elements, ExpressCheckoutElement, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import type {
  StripeElementsOptions,
  StripeExpressCheckoutElementClickEvent,
  StripeExpressCheckoutElementConfirmEvent,
  StripeExpressCheckoutElementOptions,
} from "@stripe/stripe-js";
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

/**
 * Wallet buttons shown above the card form.
 *
 * `applePay: "always"` is the part that matters: on a browser that can't run Apple Pay natively
 * (Chrome, Edge, Firefox, Opera on desktop) the button still appears and falls back to Apple's
 * scan-to-pay code, which the customer scans with their iPhone to approve. Where Apple Pay works
 * natively the same button opens the usual sheet, so there is no branching to do here. Android
 * Chrome is the exception Apple doesn't cover, and it gets Google Pay instead.
 */
const EXPRESS_OPTIONS: StripeExpressCheckoutElementOptions = {
  paymentMethods: { applePay: "always", googlePay: "always" },
  buttonHeight: 44,
  layout: { maxColumns: 2, maxRows: 1 },
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
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [confirming, setConfirming] = useState(false);
  const intentIdRef = useRef<string | null>(null);

  const requestIntent = useCallback(
    async (withCustomer?: Customer | null): Promise<IntentResult> => {
      const res = await fetch("/api/checkout/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((item) => ({ id: item.id, quantity: item.quantity })),
          ...(withCustomer ? { customer: withCustomer } : {}),
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

  // Keep the billing details on the PaymentIntent up to date as the form is filled in, rather than
  // sending them when the customer confirms. Apple Pay only opens while the tap that triggered it is
  // still the active user gesture, so there must be nothing left to send at that moment. Leaving a
  // field syncs immediately; typing is debounced.
  const hasItems = items.length > 0;
  useEffect(() => {
    const form = document.getElementById(formId);
    if (!hasItems || !(form instanceof HTMLFormElement)) return;

    let timer = 0;
    const snapshot = () => setCustomer(form.checkValidity() ? readCustomer(form) : null);
    const onInput = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(snapshot, 300);
    };
    const onCommit = () => {
      window.clearTimeout(timer);
      snapshot();
    };

    form.addEventListener("input", onInput);
    form.addEventListener("change", onCommit);
    form.addEventListener("focusout", onCommit);
    return () => {
      window.clearTimeout(timer);
      form.removeEventListener("input", onInput);
      form.removeEventListener("change", onCommit);
      form.removeEventListener("focusout", onCommit);
    };
  }, [formId, hasItems]);

  // Re-quote whenever the cart or the billing details change, lightly debounced so a quantity
  // spinner doesn't fire per click. Paused during confirmation: Stripe rejects updates to a
  // PaymentIntent that is already being confirmed.
  // An emptied cart keeps its PaymentIntent id: if items come back, the same intent is updated
  // rather than a new one minted, and the Payment Element the customer may have started filling stays.
  useEffect(() => {
    if (!hasItems || confirming) return;
    const timer = window.setTimeout(() => {
      requestIntent(customer).then((result) => {
        if (!result.ok) setQuoteError(result.message);
      });
    }, 400);
    return () => window.clearTimeout(timer);
  }, [hasItems, confirming, customer, requestIntent]);

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
            <PaymentSection formId={formId} totalOre={quote.totals.totalOre} confirming={confirming} onConfirmingChange={setConfirming} />
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
function WalletsDebug({ expressMethods }: { expressMethods?: Record<string, { available: boolean } | undefined> }) {
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
      express: {expressMethods ? JSON.stringify(expressMethods) : "not reported yet"}
      {"\n"}
      wallets: {result ?? "checking…"}
    </pre>
  );
}

function PaymentSection({
  formId,
  totalOre,
  confirming,
  onConfirmingChange,
}: {
  formId: string;
  totalOre: number;
  confirming: boolean;
  onConfirmingChange: (value: boolean) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [message, setMessage] = useState<string | null>(null);
  // `undefined` until the element reports in. Availability is only ever used to decide whether to
  // draw the divider, never to hide the element itself: hiding it on a stale or missing report would
  // take away the only wallet UI on the page, since the card form's own wallets are turned off.
  const [walletMethods, setWalletMethods] = useState<Record<string, { available: boolean } | undefined> | undefined>(undefined);
  const walletsAvailable = Boolean(walletMethods && Object.values(walletMethods).some((m) => m?.available));

  // The Payment Element caches the amount it mounted with. Refresh it whenever the server re-quotes,
  // so the wallet sheet shows the right total without any work left to do at confirmation time.
  useEffect(() => {
    if (!elements) return;
    elements.fetchUpdates().catch(() => {});
  }, [elements, totalOre]);

  const returnUrl = () => `${process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin}/order-complete`;

  // The wallet sheet is about to open, so the billing details have to be complete by now: they are
  // what the order gets addressed to, and the wallet doesn't collect them on our behalf. Resolving
  // opens the sheet; rejecting cancels it. Both must happen synchronously, within a second of the tap.
  const onExpressClick = ({ resolve, reject }: StripeExpressCheckoutElementClickEvent) => {
    const form = document.getElementById(formId);
    if (!(form instanceof HTMLFormElement) || !form.reportValidity()) {
      reject();
      return;
    }
    resolve();
  };

  // Reached once the customer has approved the payment in the wallet, so the sheet is already open
  // and awaiting here is fine, unlike in the card path.
  const onExpressConfirm = async (event: StripeExpressCheckoutElementConfirmEvent) => {
    if (!stripe || !elements) return;
    onConfirmingChange(true);
    setMessage(null);
    try {
      const { error } = await stripe.confirmPayment({ elements, confirmParams: { return_url: returnUrl() } });
      if (error) {
        // Tells the wallet to show its own failure state rather than leaving the sheet hanging.
        event.paymentFailed({ reason: "fail" });
        setMessage(error.message ?? "Payment failed. Please try again.");
      }
    } finally {
      onConfirmingChange(false);
    }
  };

  const confirm = () => {
    if (!stripe || !elements || confirming) return;
    const form = document.getElementById(formId);
    if (!(form instanceof HTMLFormElement) || !form.reportValidity()) return;

    onConfirmingChange(true);
    setMessage(null);

    // Nothing may be awaited before this call. Safari opens the Apple Pay sheet only while the tap
    // that started it is still the current user gesture, and a network round trip in between
    // forfeits that, which surfaces as "cannot display Apple Pay". The amount and the customer's
    // details are already on the PaymentIntent by now, kept current as the form was filled in.
    stripe
      .confirmPayment({ elements, confirmParams: { return_url: returnUrl() } })
      // Only reached on failure — success redirects to return_url. Declines arrive here as card_error.
      .then(({ error }) => {
        if (error) setMessage(error.message ?? "Payment failed. Please try again.");
      })
      .catch((err: unknown) => setMessage(err instanceof Error ? err.message : "Payment failed. Please try again."))
      .finally(() => onConfirmingChange(false));
  };

  return (
    <div className="flex flex-col gap-[12px]">
      {/* Always mounted: it renders nothing when no wallet is available, and it is what reports
          availability in the first place. */}
      <ExpressCheckoutElement
        options={EXPRESS_OPTIONS}
        onClick={onExpressClick}
        onConfirm={onExpressConfirm}
        onAvailablePaymentMethodsChange={({ paymentMethods }) => setWalletMethods(paymentMethods)}
      />

      {walletsAvailable && (
        <div className="flex items-center gap-[12px] text-black/50">
          <span className="h-px flex-1 bg-black/25" />
          Or pay with card
          <span className="h-px flex-1 bg-black/25" />
        </div>
      )}

      {/* Wallets live in the row above, so the tabs here don't offer them a second time. */}
      <PaymentElement options={{ layout: "tabs", wallets: { applePay: "never", googlePay: "never" } }} />
      <WalletsDebug expressMethods={walletMethods} />

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
