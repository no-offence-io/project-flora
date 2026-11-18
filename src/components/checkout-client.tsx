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
import RolloverText from "./rollover-text";
import { readVisit } from "@/components/visit-tracker";
import { Busy } from "./busy";

type Quote = Pick<
  IntentResponse,
  "clientSecret" | "paymentIntentId" | "totals" | "customerSessionClientSecret"
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
 * The same in dark mode. Stripe draws its fields in frames the page's inversion leaves alone, so
 * they are asked for Stripe's own dark style instead: black fields, white text, white focus.
 */
const DARK_APPEARANCE: StripeElementsOptions["appearance"] = {
  theme: "night",
  variables: {
    colorPrimary: "#ffffff",
    colorText: "#ffffff",
    colorBackground: "#000000",
    colorTextPlaceholder: "rgba(255,255,255,0.5)",
    borderRadius: "0px",
    fontSizeBase: "13.35px",
  },
  rules: {
    ".Input": { border: "1px solid rgba(255,255,255,0.2)", boxShadow: "none" },
    ".Input:focus": { border: "1px solid rgba(255,255,255,0.6)", boxShadow: "none" },
    ".Tab": { border: "1px solid rgba(255,255,255,0.2)", boxShadow: "none", backgroundColor: "#000000" },
    ".Tab--selected": { border: "1px solid #ffffff", boxShadow: "none" },
  },
};

const withRadius = (a: StripeElementsOptions["appearance"]) => ({ ...a, variables: { ...a?.variables, borderRadius: "8px" } });

/**
 * Whether the shop is showing dark right now: a pinned "Dark", or "Auto" on a device in dark mode
 * (see the theme classes on <html> and globals.css). Follows changes to either while on the page.
 */
function useDarkShop(): boolean {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const html = document.documentElement;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const read = () => setDark(html.classList.contains("theme-dark") || (html.classList.contains("theme-auto") && mql.matches));
    read();
    const observer = new MutationObserver(read);
    observer.observe(html, { attributes: true, attributeFilter: ["class"] });
    mql.addEventListener("change", read);
    return () => {
      observer.disconnect();
      mql.removeEventListener("change", read);
    };
  }, []);
  return dark;
}

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
    ...(data.get("register") === "on" ? { register: true } : {}),
  };
}

/**
 * The checkout's interactive half. It asks the server to quote the cart (and create or update the
 * PaymentIntent), shows the server's totals, and mounts Stripe's buttons and card fields against
 * that intent. Every amount on screen and every amount charged comes from the same server quote.
 */
export type CheckoutAccount = { email: string; firstName?: string; lastName?: string; phonePrefix?: string; phone?: string; street?: string; apartment?: string; postcode?: string; city?: string; country?: string };

export default function CheckoutClient({ formId, countries, account, vipps }: { formId: string; countries: string[]; account: CheckoutAccount | null; /** Whether the server can take Vipps payments; the button is left out otherwise. */ vipps: boolean }) {
  const { items } = useCart();
  const t = useT();
  const stripePromise = useMemo(() => getStripePromise(), []);
  const dark = useDarkShop();
  const appearance = dark ? DARK_APPEARANCE : APPEARANCE;
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [confirming, setConfirming] = useState(false);
  // The shipping country, sent ahead of the rest of the form so the shipping line follows it.
  const [country, setCountry] = useState<string | null>(null);
  const [discountCode, setDiscountCode] = useState("");
  const [discountError, setDiscountError] = useState<string | null>(null);
  const intentIdRef = useRef<string | null>(null);

  /** Vipps: the same cart and customer the card flow sends, answered with the address to open. */
  const startVipps = useCallback(
    async (form: HTMLFormElement): Promise<string> => {
      const res = await fetch("/api/checkout/vipps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((item) => ({
            id: item.id,
            quantity: item.quantity,
            ...(item.size ? { size: item.size } : {}),
            ...(item.colour ? { colour: item.colour } : {}),
            ...(item.measurements.length ? { measurements: item.measurements } : {}),
          })),
          customer: readCustomer(form),
          ...(readVisit() ? { visit: readVisit() } : {}),
          ...(discountCode ? { discountCode } : {}),
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { redirectUrl?: string; error?: string; code?: string };
      if (!res.ok || !body.redirectUrl) throw new Error(body.code === "vipps" ? t("pay.vippsFailed") : body.error || t("pay.vippsFailed"));
      return body.redirectUrl;
    },
    [items, discountCode, t],
  );

  const requestIntent = useCallback(
    async (withCustomer?: Customer | null): Promise<IntentResult> => {
      const res = await fetch("/api/checkout/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((item) => ({
            id: item.id,
            quantity: item.quantity,
            ...(item.size ? { size: item.size } : {}),
            ...(item.colour ? { colour: item.colour } : {}),
            ...(item.measurements.length ? { measurements: item.measurements } : {}),
          })),
          ...(withCustomer ? { customer: withCustomer, ...(readVisit() ? { visit: readVisit() } : {}) } : {}),
          ...(!withCustomer && country ? { country } : {}),
          ...(discountCode ? { discountCode } : {}),
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
      setDiscountError(body.discountError ?? null);
      const next: Quote = {
        clientSecret: body.clientSecret,
        paymentIntentId: body.paymentIntentId,
        totals: body.totals,
        customerSessionClientSecret: body.customerSessionClientSecret,
        cartKey: cartKeyOf(items),
      };
      setQuote(next);
      setQuoteError(null);
      return { ok: true, quote: next };
    },
    [items, t, country, discountCode],
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
    const snapshot = () => {
      setCustomer(form.checkValidity() ? readCustomer(form) : null);
      setCountry(String(new FormData(form).get("country") ?? "") || null);
    };
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
  // Fixed at the first quote: Stripe takes it when the card fields are created, not afterwards.
  const [customerSession, setCustomerSession] = useState<string | undefined>(undefined);
  if (quote?.customerSessionClientSecret && !customerSession) setCustomerSession(quote.customerSessionClientSecret);
  const cardGroup = useMemo<StripeElementsOptions>(
    () => ({
      mode: "payment",
      amount: totalOre,
      currency: "nok",
      // Klarna has its own button in the row above; without this it also returns as a tab here.
      excludedPaymentMethodTypes: ["klarna"],
      // Signed-in customers: Stripe's form shows their saved cards and offers to save this one.
      ...(customerSession ? { customerSessionClientSecret: customerSession } : {}),
      appearance,
    }),
    [totalOre, appearance, customerSession],
  );
  // A second group for Apple Pay and Google Pay: same money and methods as cardGroup, but rounded,
  // since those two buttons must not share an Elements instance with the square card tabs below.
  const expressCardGroup = useMemo<StripeElementsOptions>(
    () => ({
      mode: "payment",
      amount: totalOre,
      currency: "nok",
      excludedPaymentMethodTypes: ["klarna"],
      appearance: withRadius(appearance),
    }),
    [totalOre, appearance],
  );
  // Klarna's own group excludes nothing; its button is already restricted to Klarna by KLARNA_BUTTON.
  const klarnaGroup = useMemo<StripeElementsOptions>(
    () => ({
      mode: "payment",
      amount: totalOre,
      currency: "nok",
      appearance: withRadius(appearance),
    }),
    [totalOre, appearance],
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
      <CheckoutForm id={formId} countries={countries} account={account} className="md:min-w-0 md:flex-1" />
      <OrderSummary
        totals={totals}
        discount={
          <DiscountField
            applied={totals?.discountCode ?? null}
            error={discountError}
            disabled={confirming}
            onApply={(code) => {
              setDiscountError(null);
              setDiscountCode(code);
            }}
            onRemove={() => {
              setDiscountError(null);
              setDiscountCode("");
            }}
          />
        }
      >
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
              onVipps={vipps ? startVipps : null}
            />
          </Elements>
        ) : (
          quoteError ? (
            <p className="m-0 text-black/50" role="status">
              {quoteError}
            </p>
          ) : (
            <div role="status" aria-label={t("pay.preparing")} className="loader-tile relative h-[160px]" data-loader="b" />
          )
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
  onVipps,
}: {
  formId: string;
  clientSecret: string;
  totalOre: number;
  confirming: boolean;
  onConfirmingChange: (value: boolean) => void;
  stripePromise: StripePromise;
  expressCardGroup: StripeElementsOptions;
  klarnaGroup: StripeElementsOptions;
  /** Starts a Vipps payment and resolves with the address to open; null when Vipps isn't available here. */
  onVipps: ((form: HTMLFormElement) => Promise<string>) | null;
}) {
  const stripe = useStripe();
  const t = useT();
  const elements = useElements();
  // This section only ever mounts in the browser (after the quote arrives), so the address can be
  // read up front: Vipps hands a customer who cancelled in the app back here with ?vipps=cancelled.
  const [message, setMessage] = useState<string | null>(() =>
    typeof window !== "undefined" && new URLSearchParams(window.location.search).get("vipps") === "cancelled" ? t("pay.vippsCancelled") : null,
  );
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

  // Drop the marker from the address so a reload doesn't repeat the message.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("vipps") !== "cancelled") return;
    params.delete("vipps");
    window.history.replaceState(null, "", `${window.location.pathname}${params.size ? `?${params}` : ""}`);
  }, []);

  const payWithVipps = async () => {
    const form = validForm();
    if (!form || confirming || !onVipps) return;
    onConfirmingChange(true);
    setMessage(t("pay.vippsOpening"));
    try {
      // The page leaves for Vipps here; `confirming` stays on so nothing else can be started meanwhile.
      window.location.assign(await onVipps(form));
    } catch (err) {
      setMessage(err instanceof Error && err.message ? err.message : t("pay.vippsFailed"));
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
        {/* Vipps is not on the Stripe account, so this one talks to Vipps directly: the form is
            checked, the server quotes the cart and starts the payment, and the customer is sent to
            Vipps to approve it. Drawn in Vipps' own orange, as their guidelines ask. */}
        {onVipps && (
          <button
            type="button"
            onClick={payWithVipps}
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
        )}
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
        className="flex w-full items-center justify-center bg-black p-[12px] font-gotham text-paragraph text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Busy state={confirming ? "pending" : "idle"}><RolloverText text={t("pay.confirm")} /></Busy>
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

/**
 * Discount code, as a row of the order summary. The browser only ever sends the code; the server
 * answers with the new totals (and the reason if it refused), so nothing here computes money.
 */
function DiscountField({
  applied,
  error,
  disabled,
  onApply,
  onRemove,
}: {
  applied: string | null;
  error: string | null;
  disabled: boolean;
  onApply: (code: string) => void;
  onRemove: () => void;
}) {
  const t = useT();
  const [draft, setDraft] = useState("");

  if (applied) {
    return (
      <p className="m-0 flex items-center justify-between gap-[12px] border-[0.25px] border-black/25 p-[12px] font-gotham text-paragraph text-black">
        <span>
          {t("discount.label")}: <strong className="font-normal uppercase">{applied}</strong>
        </span>
        <button type="button" onClick={onRemove} disabled={disabled} className="text-black/50 underline hover:text-black transition-colors">
          {t("discount.remove")}
        </button>
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-[6px]">
      <div className="flex gap-[12px]">
        <label className="min-w-0 flex-1">
          <span className="sr-only">{t("discount.label")}</span>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (draft.trim()) onApply(draft.trim());
              }
            }}
            placeholder={t("discount.placeholder")}
            autoComplete="off"
            className="w-full border border-black/20 bg-transparent p-[12px] font-gotham text-paragraph text-black uppercase outline-none placeholder:normal-case placeholder:text-black/50 focus:border-black/60"
          />
        </label>
        <button
          type="button"
          disabled={disabled || !draft.trim()}
          onClick={() => onApply(draft.trim())}
          className="shrink-0 border border-black px-[24px] font-gotham text-paragraph text-black disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RolloverText text={t("discount.apply")} />
        </button>
      </div>
      {error && (
        <p className="m-0 font-gotham text-[11px] leading-normal text-[#b00020]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
