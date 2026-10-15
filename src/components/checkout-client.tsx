"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Elements,
  ExpressCheckoutElement,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
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
import { useT } from "@/components/i18n-provider";

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
type StripePromise = NonNullable<ReturnType<typeof getStripePromise>>;

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

/**
 * Same as APPEARANCE, but with a corner radius. Only the express row's Stripe-drawn buttons
 * (Apple Pay, Google Pay, Klarna) use this — a button's corner radius comes from the appearance
 * of the Elements group it lives in, and this group must stay separate from the one behind the
 * actual card tabs below, which keep the site's square corners.
 */
const EXPRESS_APPEARANCE: StripeElementsOptions["appearance"] = {
  ...APPEARANCE,
  variables: { ...APPEARANCE.variables, borderRadius: "8px" },
};

/**
 * The three express buttons are Stripe-drawn, so each carries its brand's own styling exactly as
 * Apple, Google and Klarna require. They sit side by side because each lives in its own Stripe
 * Elements group inside its own column of our row: a single group lays all three out itself and
 * stacks them once they don't fit the 520px column. `applePay: "always"` also gets Apple Pay onto
 * desktop Chrome, Edge and Firefox via Apple's scan-to-pay code.
 */
const ONE_BUTTON: StripeExpressCheckoutElementOptions["layout"] = {
  maxColumns: 1,
  overflow: "never",
};
const NONE = {
  applePay: "never",
  googlePay: "never",
  klarna: "never",
  link: "never",
  paypal: "never",
  amazonPay: "never",
} as const;

const APPLE_PAY_BUTTON: StripeExpressCheckoutElementOptions = {
  paymentMethods: { ...NONE, applePay: "always" },
  buttonTheme: { applePay: "black" },
  buttonType: { applePay: "plain" },
  buttonHeight: 44,
  layout: ONE_BUTTON,
};
const GOOGLE_PAY_BUTTON: StripeExpressCheckoutElementOptions = {
  paymentMethods: { ...NONE, googlePay: "always" },
  buttonTheme: { googlePay: "black" },
  buttonType: { googlePay: "plain" },
  buttonHeight: 44,
  layout: ONE_BUTTON,
};
const KLARNA_BUTTON: StripeExpressCheckoutElementOptions = {
  paymentMethods: { ...NONE, klarna: "auto" },
  buttonHeight: 44,
  layout: ONE_BUTTON,
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
 * PaymentIntent), shows the server's totals, and mounts Stripe's buttons and card fields against
 * that intent. Every amount on screen and every amount charged comes from the same server quote.
 */
export default function CheckoutClient({ formId }: { formId: string }) {
  const { items } = useCart();
  const t = useT();
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
            t("pay.couldNotStart"),
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
    [items, t],
  );

  // Keep the billing details on the PaymentIntent up to date as the form is filled in, rather than
  // sending them when the customer confirms. A wallet sheet only opens while the tap that triggered
  // it is still the active user gesture, so there must be nothing left to send at that moment.
  // Leaving a field syncs immediately; typing is debounced.
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

  // Elements groups run in "deferred" mode, described by amount and currency rather than bound to
  // the intent's client secret.
  //
  // They must NOT declare `paymentMethodTypes`. Doing so puts Elements in manual mode, and Stripe
  // then refuses to confirm against a PaymentIntent created with `automatic_payment_methods` —
  // which is how this server creates every intent. The error only appears at the moment a customer
  // pays: "Payment details were collected through Stripe Elements using payment_method_types and
  // cannot be confirmed…". `excludedPaymentMethodTypes` keeps the groups on automatic methods while
  // still shaping what each one renders.
  const totalOre = quote?.totals.totalOre ?? 0;
  const cardGroup = useMemo<StripeElementsOptions>(
    () => ({
      mode: "payment",
      amount: totalOre,
      currency: "nok",
      // Klarna has its own button in the row above; without this it also returns as a tab here.
      excludedPaymentMethodTypes: ["klarna"],
      appearance: APPEARANCE,
    }),
    [totalOre],
  );
  // A second group for Apple Pay and Google Pay: same money and methods as cardGroup, but rounded,
  // since those two buttons must not share an Elements instance with the square card tabs below.
  const expressCardGroup = useMemo<StripeElementsOptions>(
    () => ({
      mode: "payment",
      amount: totalOre,
      currency: "nok",
      excludedPaymentMethodTypes: ["klarna"],
      appearance: EXPRESS_APPEARANCE,
    }),
    [totalOre],
  );
  // Klarna's own group excludes nothing; its button is already restricted to Klarna by KLARNA_BUTTON.
  const klarnaGroup = useMemo<StripeElementsOptions>(
    () => ({
      mode: "payment",
      amount: totalOre,
      currency: "nok",
      appearance: EXPRESS_APPEARANCE,
    }),
    [totalOre],
  );

  if (items.length === 0) {
    return (
      <p className="font-gotham text-paragraph text-black/70">
        {t("cart.empty")}{" "}
        <Link href="/shop" className="text-black underline">
          {t("pay.backToShop")}
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
          <Elements stripe={stripePromise} options={cardGroup}>
            <PaymentSection
              formId={formId}
              clientSecret={quote.clientSecret}
              totalOre={quote.totals.totalOre}
              confirming={confirming}
              onConfirmingChange={setConfirming}
              stripePromise={stripePromise}
              expressCardGroup={expressCardGroup}
              klarnaGroup={klarnaGroup}
            />
          </Elements>
        ) : (
          <p className="m-0 text-black/50" role="status">
            {quoteError ?? t("pay.preparing")}
          </p>
        )}
      </OrderSummary>
    </div>
  );
}

/** One column of the express row: half the width on phones, an equal share on desktop. */
const COLUMN = "min-w-0 basis-[calc(50%-6px)] md:flex-1 md:basis-0";

/**
 * Where Stripe sends the customer after payment. Deliberately the origin they are actually on,
 * rather than a configured one: the site answers on several hostnames (the production domain, its
 * www form, and Vercel's preview URLs), and a fixed value would bounce a customer paying on one to
 * another — losing their cart, which lives in that origin's storage.
 */
const returnUrl = () => `${window.location.origin}/order-complete`;

type Availability = {
  apple: boolean | null;
  google: boolean | null;
  klarna: boolean | null;
};

function PaymentSection({
  formId,
  clientSecret,
  totalOre,
  confirming,
  onConfirmingChange,
  stripePromise,
  expressCardGroup,
  klarnaGroup,
}: {
  formId: string;
  clientSecret: string;
  totalOre: number;
  confirming: boolean;
  onConfirmingChange: (value: boolean) => void;
  stripePromise: StripePromise;
  expressCardGroup: StripeElementsOptions;
  klarnaGroup: StripeElementsOptions;
}) {
  const stripe = useStripe();
  const t = useT();
  const elements = useElements();
  const [message, setMessage] = useState<string | null>(null);
  /** Per column, whether Stripe found that button usable here; `null` until it reports. */
  const [available, setAvailable] = useState<Availability>({
    apple: null,
    google: null,
    klarna: null,
  });

  // Keep the Stripe-hosted card fields' idea of the amount in step with the server's latest quote.
  useEffect(() => {
    elements?.update({ amount: totalOre });
  }, [elements, totalOre]);

  const validForm = useCallback(() => {
    const form = document.getElementById(formId);
    return form instanceof HTMLFormElement && form.reportValidity()
      ? form
      : null;
  }, [formId]);

  const payWithCard = async () => {
    if (!stripe || !elements || confirming || !validForm()) return;
    onConfirmingChange(true);
    setMessage(null);
    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        setMessage(submitError.message ?? t("pay.checkCard"));
        return;
      }
      const { error } = await stripe.confirmPayment({
        elements,
        clientSecret,
        confirmParams: { return_url: returnUrl() },
      });
      // Only reached on failure — success redirects to return_url. Declines arrive here as card_error.
      if (error)
        setMessage(error.message ?? t("pay.failed"));
    } finally {
      onConfirmingChange(false);
    }
  };

  const debug =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("debug") === "wallets";
  const report = (key: keyof Availability) => (value: boolean) =>
    setAvailable((prev) =>
      prev[key] === value ? prev : { ...prev, [key]: value },
    );
  const shared = {
    clientSecret,
    totalOre,
    confirming,
    onConfirmingChange,
    onMessage: setMessage,
    validForm,
    stripePromise,
  };

  return (
    <div className="flex flex-col gap-[12px]">
      {/* One row, equal columns, each column its own Stripe element drawing one branded button.
          A column is dropped only once Stripe reports that button can't be used in this browser. */}
      <div className="flex flex-wrap gap-[12px]">
        {available.apple !== false && (
          <ExpressColumn
            {...shared}
            group={expressCardGroup}
            button={APPLE_PAY_BUTTON}
            name="Apple Pay"
            onAvailability={report("apple")}
          />
        )}
        {available.google !== false && (
          <ExpressColumn
            {...shared}
            group={expressCardGroup}
            button={GOOGLE_PAY_BUTTON}
            name="Google Pay"
            onAvailability={report("google")}
          />
        )}
        {available.klarna !== false && (
          <ExpressColumn
            {...shared}
            group={klarnaGroup}
            button={KLARNA_BUTTON}
            name="Klarna"
            onAvailability={report("klarna")}
          />
        )}
        {/* Placeholder until Vipps is set up (it isn't on the Stripe account, so it will be a direct
            Vipps integration later). Drawn in Vipps' own orange so the row reads as it will. */}
        <button
          type="button"
          onClick={() =>
            setMessage(
              t("pay.vippsSoon"),
            )
          }
          disabled={confirming}
          aria-label="Vipps"
          className={`${COLUMN} flex h-[44px] items-center justify-center rounded-[8px] bg-[#ff5b24] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50`}
        >
          <Image
            src="/checkout/vipps-white.svg"
            alt=""
            width={35}
            height={25}
            className="h-[36px] w-auto"
          />
        </button>
      </div>

      <div className="flex items-center gap-[12px] text-black/50">
        <span className="h-px flex-1 bg-black/25" />
        {t("pay.orCard")}
        <span className="h-px flex-1 bg-black/25" />
      </div>

      {/* Card only, and no wallets, so Stripe draws the fields without a tab strip of its own. */}
      <PaymentElement
        options={{
          layout: "tabs",
          wallets: { applePay: "never", googlePay: "never" },
        }}
      />

      {debug && (
        <pre className="m-0 whitespace-pre-wrap break-all border border-black/25 p-[12px] text-[11px] leading-normal">
          columns: {JSON.stringify(available)}
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
        {confirming ? t("pay.confirming") : t("pay.confirm")}
      </button>

      <p className="m-0 text-black/50">
        {t("pay.privacy")}{" "}
        <Link href="/privacy" className="text-black underline">
          {t("pay.privacyLink")}
        </Link>
        .
      </p>
    </div>
  );
}

type ExpressColumnProps = {
  name: string;
  group: StripeElementsOptions;
  button: StripeExpressCheckoutElementOptions;
  clientSecret: string;
  totalOre: number;
  confirming: boolean;
  onConfirmingChange: (value: boolean) => void;
  onMessage: (message: string | null) => void;
  onAvailability: (available: boolean) => void;
  validForm: () => HTMLFormElement | null;
  stripePromise: StripePromise;
};

/** One column of the row: its own Elements group, hosting exactly one branded button. */
function ExpressColumn({ stripePromise, group, ...rest }: ExpressColumnProps) {
  return (
    <div className={COLUMN}>
      <Elements stripe={stripePromise} options={group}>
        <ExpressButton {...rest} />
      </Elements>
    </div>
  );
}

function ExpressButton({
  name,
  button,
  clientSecret,
  totalOre,
  confirming,
  onConfirmingChange,
  onMessage,
  onAvailability,
  validForm,
}: Omit<ExpressColumnProps, "stripePromise" | "group">) {
  const stripe = useStripe();
  const t = useT();
  const elements = useElements();

  useEffect(() => {
    elements?.update({ amount: totalOre });
  }, [elements, totalOre]);

  // The sheet opens on resolve, which has to happen synchronously within a second of the tap, so
  // the only work here is checking the billing form the order will be addressed to.
  const onClick = ({
    resolve,
    reject,
  }: StripeExpressCheckoutElementClickEvent) => {
    if (confirming || !validForm()) {
      reject();
      return;
    }
    onMessage(null);
    resolve();
  };

  // Reached once the customer has approved in the sheet (or, for Klarna, is about to be sent to
  // Klarna), so awaiting here is fine.
  const onConfirm = async (event: StripeExpressCheckoutElementConfirmEvent) => {
    if (!stripe || !elements) return;
    onConfirmingChange(true);
    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        event.paymentFailed({ reason: "fail" });
        onMessage(submitError.message ?? t("pay.failed"));
        return;
      }
      const { error } = await stripe.confirmPayment({
        elements,
        clientSecret,
        confirmParams: { return_url: returnUrl() },
      });
      if (error) {
        event.paymentFailed({ reason: "fail" });
        onMessage(error.message ?? t("pay.failed"));
      }
    } finally {
      onConfirmingChange(false);
    }
  };

  return (
    <ExpressCheckoutElement
      options={button}
      onClick={onClick}
      onConfirm={onConfirm}
      onAvailablePaymentMethodsChange={({ paymentMethods }) =>
        onAvailability(
          Boolean(
            paymentMethods &&
            Object.values(paymentMethods).some((m) => m?.available),
          ),
        )
      }
      onLoadError={({ error }) => {
        console.error(`[${name} button] failed to load`, error);
        onAvailability(false);
      }}
    />
  );
}
