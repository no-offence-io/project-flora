"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useCart } from "./cart-context";
import { formatNok, orderReference } from "@/lib/money";
import { getStripePromise } from "@/lib/stripe-client";
import { useT } from "@/components/i18n-provider";

type View =
  | { kind: "loading" }
  | { kind: "none" }
  | { kind: "succeeded"; reference: string; amountOre: number }
  | { kind: "processing"; reference: string }
  | { kind: "failed" };

/**
 * Reads the payment's status from Stripe with the publishable key and shows it. Display only: the
 * order itself is created by the webhook, never here, so nothing on this page can be forged into
 * an order by editing the URL.
 */
export default function OrderCompleteStatus() {
  const params = useSearchParams();
  const clientSecret = params.get("payment_intent_client_secret");
  const { clear } = useCart();
  const t = useT();
  const configured = Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
  const [view, setView] = useState<View>({ kind: clientSecret && configured ? "loading" : "none" });

  useEffect(() => {
    if (!clientSecret) return;
    const stripePromise = getStripePromise();
    if (!stripePromise) return;
    let cancelled = false;
    stripePromise
      .then((stripe) => stripe?.retrievePaymentIntent(clientSecret))
      .then((result) => {
        if (cancelled || !result?.paymentIntent) {
          if (!cancelled) setView({ kind: "none" });
          return;
        }
        const intent = result.paymentIntent;
        switch (intent.status) {
          case "succeeded":
            setView({ kind: "succeeded", reference: orderReference(intent.id), amountOre: intent.amount });
            clear();
            break;
          case "processing":
            setView({ kind: "processing", reference: orderReference(intent.id) });
            break;
          default:
            setView({ kind: "failed" });
        }
      })
      .catch(() => {
        if (!cancelled) setView({ kind: "none" });
      });
    return () => {
      cancelled = true;
    };
  }, [clientSecret, clear]);

  const back = (
    <Link href="/checkout" className="text-black underline">
      {t("complete.back")}
    </Link>
  );

  return (
    <div className="flex max-w-[521px] flex-col gap-[24px] font-gotham text-paragraph text-black">
      {view.kind === "loading" && (
        <p className="m-0 text-black/70" role="status">
          {t("complete.checking")}
        </p>
      )}
      {view.kind === "none" && (
        <p className="m-0 text-black/70">
          {t("complete.none")} {back}
        </p>
      )}
      {view.kind === "succeeded" && (
        <>
          <h1 className="m-0 font-americana text-big-header-mobile capitalize md:text-big-header-desktop">{t("complete.thanks")}</h1>
          <p className="m-0 text-black/70">
            {t("complete.success", { amount: formatNok(view.amountOre) })} <strong className="text-black">{view.reference}</strong>. {t("complete.receipt")}
          </p>
          <Link href="/shop" className="text-black underline">
            {t("complete.continue")}
          </Link>
        </>
      )}
      {view.kind === "processing" && (
        <>
          <h1 className="m-0 font-americana text-big-header-mobile capitalize md:text-big-header-desktop">{t("complete.almost")}</h1>
          <p className="m-0 text-black/70">
            {t("complete.processing")} <strong className="text-black">{view.reference}</strong>. {t("complete.processing2")}
          </p>
        </>
      )}
      {view.kind === "failed" && (
        <>
          <h1 className="m-0 font-americana text-big-header-mobile capitalize md:text-big-header-desktop">{t("complete.notCompleted")}</h1>
          <p className="m-0 text-black/70">
            {t("complete.nothingCharged")} {back}
          </p>
        </>
      )}
    </div>
  );
}
