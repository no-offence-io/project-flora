"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import type {
  PaymentRequest,
  PaymentRequestPaymentMethodEvent,
  StripeElementsOptions,
} from "@stripe/stripe-js";
import { useCart } from "./cart-context";
import CheckoutForm from "./checkout-form";
import OrderSummary from "./order-summary";
import { COUNTRY_CODES, getCountryCode } from "@/data/country-codes";
import type { Customer, IntentResponse } from "@/lib/checkout-schema";
import { getStripePromise } from "@/lib/stripe-client";

type Quote = Pick<
  IntentResponse,
  "clientSecret" | "paymentIntentId" | "totals"
> & {
  /** The cart this quote priced; totals for any other cart are stale and shown as pending. */
  cartKey: string;
};

const cartKeyOf = (items: { id: string; quantity: number }[]) =>
  JSON.stringify(items.map((i) => [i.id, i.quantity]));
type IntentResult = { ok: true; quote: Quote } | { ok: false; message: string };

/** Square corners and the site's black, so the Stripe-hosted fields sit with the rest of the form. */
const APPEARANCE: StripeElementsOptions["appearance"] = {
  theme: "stripe",
  variables: {
    colorPrimary: "#000000",
    colorText: "#000000",
    borderRadius: "0px",
    fontSizeBase: "13.35px",
  },
};

/** The billing form's country select carries names; Stripe wants ISO codes. */
const countryIso = (name: string) =>
  COUNTRY_CODES.find((c) => c.name === name)?.iso ?? "NO";

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
 * PaymentIntent), shows the server's totals, and mounts Stripe's card fields against that intent.
 * Every amount on screen and every amount charged comes from the same server quote.
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
          items: items.map((item) => ({
            id: item.id,
            quantity: item.quantity,
          })),
          ...(withCustomer ? { customer: withCustomer } : {}),
          ...(intentIdRef.current
            ? { paymentIntentId: intentIdRef.current }
            : {}),
        }),
      });
      const body = (await res
        .json()
        .catch(() => ({}))) as Partial<IntentResponse> & {
        error?: string;
        issues?: { message: string }[];
      };
      if (
        !res.ok ||
        !body.clientSecret ||
        !body.paymentIntentId ||
        !body.totals
      ) {
        return {
          ok: false,
          message:
            body.issues?.[0]?.message ??
            body.error ??
            "Could not start payment.",
        };
      }
      intentIdRef.current = body.paymentIntentId;
      const next: Quote = {
        clientSecret: body.clientSecret,
        paymentIntentId: body.paymentIntentId,
        totals: body.totals,
        cartKey: cartKeyOf(items),
      };
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
    const snapshot = () =>
      setCustomer(form.checkValidity() ? readCustomer(form) : null);
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
  // rather than a new one minted, and the card fields the customer may have started filling stay.
  useEffect(() => {
    if (!hasItems || confirming) return;
    const timer = window.setTimeout(() => {
      requestIntent(customer).then((result) => {
        if (!result.ok) setQuoteError(result.message);
      });
    }, 400);
    return () => window.clearTimeout(timer);
  }, [hasItems, confirming, customer, requestIntent]);

  // Elements runs in "deferred" mode, described by amount and currency rather than bound to the
  // intent's client secret. That is what allows `paymentMethodTypes: ["card"]`: the Stripe-hosted
  // fields then show the card and nothing else, while the wallets and Klarna get their own buttons
  // above, drawn by us to match the rest of the page. The intent itself still accepts them all.
  const totalOre = quote?.totals.totalOre ?? 0;
  const options = useMemo<StripeElementsOptions>(
    () => ({
      mode: "payment",
      amount: totalOre,
      currency: "nok",
      paymentMethodTypes: ["card"],
      appearance: APPEARANCE,
    }),
    [totalOre],
  );

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

  // Only show totals that were priced for exactly this cart; while a re-quote is in flight the
  // numbers read as pending instead of quietly showing the previous cart's amounts.
  const totals =
    quote && quote.cartKey === cartKeyOf(items) ? quote.totals : null;

  return (
    <div className="flex flex-col gap-[60px] md:flex-row md:items-stretch md:gap-[42px]">
      <CheckoutForm id={formId} className="md:min-w-0 md:flex-1" />
      <OrderSummary totals={totals}>
        {!stripePromise ? (
          <p className="m-0 text-black/50">
            Payments are not configured: NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is
            missing.
          </p>
        ) : quote ? (
          <Elements stripe={stripePromise} options={options}>
            <PaymentSection
              formId={formId}
              clientSecret={quote.clientSecret}
              totalOre={quote.totals.totalOre}
              confirming={confirming}
              onConfirmingChange={setConfirming}
            />
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

const returnUrl = () =>
  `${process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin}/order-complete`;

function PaymentSection({
  formId,
  clientSecret,
  totalOre,
  confirming,
  onConfirmingChange,
}: {
  formId: string;
  clientSecret: string;
  totalOre: number;
  confirming: boolean;
  onConfirmingChange: (value: boolean) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  /** What the browser says it can pay with; `null` until asked. Only true entries get a button. */
  const [wallets, setWallets] = useState<{
    applePay: boolean;
    googlePay: boolean;
  } | null>(null);
  const paymentRequestRef = useRef<PaymentRequest | null>(null);
  // The wallet handler is registered once, when the Payment Request is created, but must always
  // see the current intent, router and callbacks. A ref refreshed on every render does that.
  const walletHandlerRef = useRef<
    (event: PaymentRequestPaymentMethodEvent) => Promise<void>
  >(async () => {});

  // Keep the Stripe-hosted fields' idea of the amount in step with the server's latest quote.
  useEffect(() => {
    elements?.update({ amount: totalOre });
  }, [elements, totalOre]);

  // One Payment Request per page, asked once which wallets this browser can use. Apple Pay and
  // Google Pay both hand back an ordinary card payment method, which is why the intent needs
  // nothing beyond "card" for them.
  useEffect(() => {
    if (!stripe || paymentRequestRef.current) return;
    const request = stripe.paymentRequest({
      country: "NO",
      currency: "nok",
      total: { label: "Flöra", amount: totalOre },
    });
    paymentRequestRef.current = request;
    request
      .canMakePayment()
      .then((result) =>
        setWallets({
          applePay: Boolean(result?.applePay),
          googlePay: Boolean(result?.googlePay),
        }),
      );
    request.on(
      "paymentmethod",
      (event) => void walletHandlerRef.current(event),
    );
    // Deliberately not torn down: the request is bound to this Stripe instance for the page's life.
    // Later amount changes go through `update` below, so re-running on `totalOre` is a no-op here.
  }, [stripe, totalOre]);

  useEffect(() => {
    paymentRequestRef.current?.update({
      total: { label: "Flöra", amount: totalOre },
    });
  }, [totalOre]);

  // Refreshed after every render so the handler always closes over the current intent and router.
  useEffect(() => {
    walletHandlerRef.current = async (
      event: PaymentRequestPaymentMethodEvent,
    ) => {
      const stripeInstance = stripe;
      if (!stripeInstance) {
        event.complete("fail");
        return;
      }
      const secret = clientSecret;
      onConfirmingChange(true);
      setMessage(null);
      // First without handling next actions, so the wallet sheet can be closed before any 3DS step.
      const first = await stripeInstance.confirmCardPayment(
        secret,
        { payment_method: event.paymentMethod.id },
        { handleActions: false },
      );
      if (first.error) {
        event.complete("fail");
        setMessage(first.error.message ?? "Payment failed. Please try again.");
        onConfirmingChange(false);
        return;
      }
      event.complete("success");
      let intent = first.paymentIntent;
      if (intent.status === "requires_action") {
        const second = await stripeInstance.confirmCardPayment(secret);
        if (second.error) {
          setMessage(
            second.error.message ?? "Payment failed. Please try again.",
          );
          onConfirmingChange(false);
          return;
        }
        intent = second.paymentIntent;
      }
      // Same landing and query as Stripe's own redirects, so the success page needs no special case.
      router.push(
        `/order-complete?payment_intent=${encodeURIComponent(intent.id)}&payment_intent_client_secret=${encodeURIComponent(secret)}&redirect_status=${encodeURIComponent(intent.status)}`,
      );
    };
  });

  const validForm = () => {
    const form = document.getElementById(formId);
    return form instanceof HTMLFormElement && form.reportValidity()
      ? form
      : null;
  };

  // Must stay synchronous up to `show()`: the wallet sheet only opens from within the tap itself.
  const payWithWallet = () => {
    if (!stripe || confirming || !validForm()) return;
    setMessage(null);
    paymentRequestRef.current?.show();
  };

  const payWithKlarna = async () => {
    const form = validForm();
    if (!stripe || confirming || !form) return;
    const customer = readCustomer(form);
    onConfirmingChange(true);
    setMessage(null);
    try {
      // Klarna is a redirect: the customer approves on Klarna's page and comes back to return_url.
      const { error } = await stripe.confirmKlarnaPayment(clientSecret, {
        payment_method: {
          billing_details: {
            name: `${customer.firstName} ${customer.lastName}`,
            email: customer.email,
            address: { country: countryIso(customer.country) },
          },
        },
        return_url: returnUrl(),
      });
      if (error)
        setMessage(error.message ?? "Payment failed. Please try again.");
    } finally {
      onConfirmingChange(false);
    }
  };

  const payWithCard = async () => {
    if (!stripe || !elements || confirming || !validForm()) return;
    onConfirmingChange(true);
    setMessage(null);
    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        setMessage(submitError.message ?? "Please check your card details.");
        return;
      }
      const { error } = await stripe.confirmPayment({
        elements,
        clientSecret,
        confirmParams: { return_url: returnUrl() },
      });
      // Only reached on failure — success redirects to return_url. Declines arrive here as card_error.
      if (error)
        setMessage(error.message ?? "Payment failed. Please try again.");
    } finally {
      onConfirmingChange(false);
    }
  };

  const debug =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("debug") === "wallets";

  return (
    <div className="flex flex-col gap-[12px]">
      {/* Bordered buttons in the site's own style, matching the tabs Stripe draws for its fields.
          Each wallet appears only where the browser reports it can actually be used. */}
      <div className="flex gap-[12px]">
        {wallets?.applePay && (
          <MethodButton
            onClick={payWithWallet}
            disabled={confirming}
            label="Apple Pay"
          >
            <Image
              src="/checkout/apple-pay.svg"
              alt=""
              width={28}
              height={20}
              className="h-[20px] w-auto"
            />
          </MethodButton>
        )}
        {wallets?.googlePay && (
          <MethodButton
            onClick={payWithWallet}
            disabled={confirming}
            label="Google Pay"
          >
            <Image
              src="/checkout/google-pay.svg"
              alt=""
              width={28}
              height={20}
              className="h-[20px] w-auto"
            />
          </MethodButton>
        )}
        <MethodButton
          onClick={payWithKlarna}
          disabled={confirming}
          label="Klarna"
        >
          <span className="inline-block rounded-[3px] bg-[#ffb3c7] px-[5px] py-[2px] text-[10px] font-bold leading-none text-black">
            Klarna.
          </span>
        </MethodButton>
      </div>

      <div className="flex items-center gap-[12px] text-black/50">
        <span className="h-px flex-1 bg-black/25" />
        Or pay with card
        <span className="h-px flex-1 bg-black/25" />
      </div>

      {/* Card only, so Stripe draws the fields without a tab strip of its own. */}
      <PaymentElement options={{ layout: "tabs" }} />

      {debug && (
        <pre className="m-0 whitespace-pre-wrap break-all border border-black/25 p-[12px] text-[11px] leading-normal">
          wallets: {wallets ? JSON.stringify(wallets) : "checking…"}
          {"\n"}ua: {navigator.userAgent}
        </pre>
      )}

      {message && (
        <p className="m-0 text-[#b00020]" role="alert">
          {message}
        </p>
      )}

      <button
        type="button"
        onClick={payWithCard}
        disabled={!stripe || !elements || confirming}
        className="flex w-full items-center justify-center bg-black p-[12px] font-gotham text-paragraph text-white hover:opacity-80 transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
      >
        {confirming ? "Confirming…" : "Confirm order"}
      </button>

      <p className="m-0 text-black/50">
        Your personal data will be used to process your order, support your
        experience throughout this website, and for other purposes described in
        our{" "}
        <Link href="/privacy" className="text-black underline">
          privacy policy
        </Link>
        .
      </p>
    </div>
  );
}

/** One bordered payment option: mark on top, name beneath, in the style of Stripe's own tabs. */
function MethodButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex min-w-0 flex-1 flex-col items-start gap-[6px] border border-black/20 bg-white p-[12px] text-left font-gotham text-paragraph text-black transition-colors hover:border-black disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span className="flex h-[20px] items-center">{children}</span>
      <span className="truncate">{label}</span>
    </button>
  );
}
