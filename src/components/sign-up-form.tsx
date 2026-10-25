"use client";

import { useActionState } from "react";
import RolloverText from "./rollover-text";
import { useT } from "@/components/i18n-provider";
import { subscribe, type SignUpState } from "@/lib/newsletter-actions";

/**
 * The email field and button of the sign-up banner, in the Figma desktop pill or the stacked mobile
 * form. Posts to the `subscribe` server action; a success swaps the form for a thank-you line.
 */
export default function SignUpForm({ layout, buttonLabel }: { layout: "desktop" | "mobile"; buttonLabel?: string }) {
  const [state, action, pending] = useActionState<SignUpState, FormData>(subscribe, { status: "idle" });
  const t = useT();
  const id = `signup-email-${layout}`;

  if (state.status === "ok") {
    return <p className={`m-0 text-center font-gotham text-paragraph ${layout === "desktop" ? "w-[512px]" : "w-full"}`}>{t("signup.thanks")}</p>;
  }
  const message = state.status === "invalid" ? t("signup.invalid") : state.status === "failed" ? t("signup.failed") : null;
  const label = buttonLabel ?? t("signup.button");

  if (layout === "desktop") {
    return (
      <form action={action} className="flex w-[512px] flex-col gap-[8px]">
        <label htmlFor={id} className="sr-only">
          E-mail
        </label>
        <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
        <div className="flex items-center justify-between rounded-full border border-white py-[6px] pr-[6px] pl-[12px]">
          <input
            id={id}
            name="email"
            type="email"
            required
            placeholder={t("signup.placeholder")}
            autoComplete="email"
            className="min-w-0 flex-1 bg-transparent font-gotham text-paragraph text-white outline-none placeholder:text-white"
          />
          <button type="submit" disabled={pending} className="shrink-0 rounded-full bg-black px-[12px] py-[6px] font-gotham text-paragraph whitespace-nowrap disabled:opacity-50">
            <RolloverText text={label} />
          </button>
        </div>
        {message && (
          <p className="m-0 text-center font-gotham text-[11px] leading-normal" role="alert">
            {message}
          </p>
        )}
      </form>
    );
  }
  return (
    <form action={action} className="relative flex w-full flex-col gap-[8px]">
      <label htmlFor={id} className="sr-only">
        E-mail
      </label>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      <input
        id={id}
        name="email"
        type="email"
        required
        placeholder={t("signup.placeholder")}
        autoComplete="email"
        className="h-[39px] w-full rounded-full border border-white bg-white pl-[12px] pr-[6px] font-gotham text-paragraph text-black outline-none placeholder:text-[#939393]"
      />
      <button type="submit" disabled={pending} className="flex h-[39px] w-full items-center justify-center rounded-full bg-black px-[12px] font-gotham text-paragraph text-white disabled:opacity-50">
        <RolloverText text={label} />
      </button>
      {message && (
        <p className="m-0 text-center font-gotham text-[11px] leading-normal" role="alert">
          {message}
        </p>
      )}
    </form>
  );
}
