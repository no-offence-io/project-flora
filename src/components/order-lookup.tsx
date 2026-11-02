"use client";

import { useActionState } from "react";
import { Busy } from "./busy";
import RolloverText from "./rollover-text";
import { useT } from "@/components/i18n-provider";
import type { Key } from "@/lib/i18n";
import { formatNok } from "@/lib/money";
import { lookupOrder, type LookupState } from "@/lib/order-lookup-actions";

const FIELD = "w-full border border-black/20 bg-transparent p-[12px] font-gotham text-paragraph text-black outline-none placeholder:text-black focus:border-black/60";

/** The checkout form's fields, then the order rendered like the order summary card. */
export default function OrderLookup() {
  const [state, action, pending] = useActionState<LookupState, FormData>(lookupOrder, { status: "idle" });
  const t = useT();
  const statusLabel = (s: string) => (["paid", "shipped", "delivered", "returned", "refunded", "cancelled"].includes(s) ? t(`status.${s}` as Key) : s);

  return (
    <div className="flex flex-col gap-[42px] font-gotham text-paragraph text-black md:flex-row md:items-start">
      <form action={action} className="flex w-full flex-col gap-[24px] md:max-w-[520px]">
        <label htmlFor="order-number" className="block">
          <span className="sr-only">{t("order.number")}</span>
          <input id="order-number" name="number" required placeholder={t("order.number")} defaultValue="FL-" autoComplete="off" className={`${FIELD} uppercase`} />
        </label>
        <label htmlFor="order-email" className="block">
          <span className="sr-only">{t("order.email")}</span>
          <input id="order-email" name="email" type="email" required placeholder={t("order.email")} autoComplete="email" className={FIELD} />
        </label>
        <button type="submit" disabled={pending} className="flex w-full items-center justify-center bg-black p-[12px] font-gotham text-paragraph text-white disabled:opacity-50">
          <Busy state={pending ? "pending" : "idle"}><RolloverText text={t("order.find")} /></Busy>
        </button>
        {state.status === "notFound" && (
          <p className="m-0 text-black/70" role="alert">
            {t("order.notFound")}
          </p>
        )}
      </form>

      {state.status === "found" && (
        <aside className="flex w-full flex-col gap-[12px] bg-white md:w-[520px] md:shrink-0 md:border-[0.5px] md:border-black/25 md:p-[24px]">
          <h2 className="m-0 flex items-start gap-[6px] font-gotham text-paragraph">
            {state.order.orderNumber}
            <span className="border-[0.5px] border-black px-[4px] py-[1px]">{statusLabel(state.order.status)}</span>
          </h2>
          <div className="h-px w-full bg-black/25" />
          <ul className="m-0 flex list-none flex-col gap-[5px] p-0 text-[11px] leading-normal">
            <li>
              {t("order.orderedAt")}: <span className="text-black/50">{new Date(state.order.orderedAt).toLocaleDateString("nb-NO")}</span>
            </li>
            {state.order.trackingNumber && (
              <li>
                {t("order.tracking")}: <span className="text-black/50">{state.order.trackingNumber}</span>
                {state.order.trackingUrl && (
                  <>
                    {" · "}
                    <a href={state.order.trackingUrl} target="_blank" rel="noreferrer" className="text-black underline">
                      {t("order.track")}
                    </a>
                  </>
                )}
              </li>
            )}
          </ul>
          <ul className="m-0 flex list-none flex-col gap-[12px] p-0">
            {state.order.items.map((it, i) => (
              <li key={i} className="flex flex-col gap-[5px] border-[0.25px] border-black/25 p-[12px]">
                <span>
                  {it.name}
                  {it.size ? ` - ${it.size}` : ""} x {it.quantity}
                </span>
                {it.measurements.length > 0 && (
                  <span className="flex flex-col gap-[5px] text-[11px] leading-normal">
                    {it.measurements.map((m) => (
                      <span key={m.label}>
                        {m.label}: <span className="text-black/50">{m.value} cm</span>
                      </span>
                    ))}
                  </span>
                )}
              </li>
            ))}
          </ul>
          <dl className="m-0 flex justify-between bg-[#fafbfc] p-[24px]">
            <dt>{t("summary.total")}</dt>
            <dd className="m-0">{formatNok(state.order.totalOre)}</dd>
          </dl>
        </aside>
      )}
    </div>
  );
}
