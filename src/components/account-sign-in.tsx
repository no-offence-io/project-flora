"use client";

import { useActionState } from "react";
import RolloverText from "./rollover-text";
import { BUTTON, FIELD } from "./account-ui";
import { useT } from "@/components/i18n-provider";
import { requestSignIn, type SignInState } from "@/lib/customer-actions";

export default function AccountSignIn({ next }: { next: string }) {
  const [state, action, pending] = useActionState<SignInState, FormData>(requestSignIn, { status: "idle" });
  const t = useT();
  if (state.status === "sent") return <p className="m-0 font-gotham text-paragraph text-black" role="status">{t("account.sent", { email: state.email ?? "" })}</p>;
  return (
    <form action={action} className="flex flex-col gap-[24px]">
      <input type="hidden" name="next" value={next} />
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      <label htmlFor="account-email" className="block">
        <span className="sr-only">{t("form.email")}</span>
        <input id="account-email" name="email" type="email" required autoComplete="email" placeholder={t("form.email")} className={FIELD} />
      </label>
      <button type="submit" disabled={pending} className={BUTTON}>
        <RolloverText text={t("account.sendLink")} />
      </button>
      {(state.status === "invalid" || state.status === "failed") && (
        <p className="m-0 font-gotham text-paragraph text-[#b00020]" role="alert">{t(state.status === "invalid" ? "account.invalid" : "account.failed")}</p>
      )}
    </form>
  );
}
