import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BUTTON, Heading } from "@/components/account-ui";
import RolloverText from "@/components/rollover-text";
import { readSignInToken, safeNext } from "@/lib/customer";
import { confirmSignIn } from "@/lib/customer-actions";
import { getT } from "@/lib/i18n-server";

export const metadata: Metadata = { robots: { index: false }, referrer: "no-referrer" };

/**
 * Where the email link lands. Opening it does nothing by itself — signing in takes the button
 * (a POST). Mail scanners that open links can't use the link up, and a link someone else made
 * can't quietly sign a visitor into the wrong account.
 */
export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ token?: string; next?: string }> }) {
  const [{ token, next }, t] = await Promise.all([searchParams, getT()]);
  const email = await readSignInToken(token);
  if (!email) redirect("/account/login?expired=1");
  return (
    <div className="flex flex-col gap-[24px] md:max-w-[521px]">
      <Heading>{t("account.verifyTitle")}</Heading>
      <p className="m-0 font-gotham text-paragraph text-black/70">{t("account.verifyText", { email })}</p>
      <form action={confirmSignIn}>
        <input type="hidden" name="token" value={token} />
        <input type="hidden" name="next" value={safeNext(next)} />
        <button type="submit" className={BUTTON}>
          <RolloverText text={t("account.verifyButton")} />
        </button>
      </form>
    </div>
  );
}
