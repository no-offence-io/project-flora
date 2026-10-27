import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AccountSignIn from "@/components/account-sign-in";
import { Heading } from "@/components/account-ui";
import { getCustomer, safeNext } from "@/lib/customer";
import { getT } from "@/lib/i18n-server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("meta.account"), robots: { index: false } };
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; expired?: string; signedout?: string }> }) {
  const [{ next, expired, signedout }, t, customer] = await Promise.all([searchParams, getT(), getCustomer()]);
  const target = safeNext(next);
  if (customer) redirect(target);
  return (
    <div className="flex flex-col gap-[24px] md:max-w-[521px]">
      <Heading>{t("account.loginTitle")}</Heading>
      <p className="m-0 font-gotham text-paragraph text-black/70">{t("account.loginIntro")}</p>
      {expired && <p className="m-0 font-gotham text-paragraph text-[#b00020]" role="alert">{t("account.expired")}</p>}
      {signedout && <p className="m-0 font-gotham text-paragraph text-black/50">{t("account.signedOut")}</p>}
      <AccountSignIn next={target} />
      <p className="m-0 font-gotham text-paragraph text-black/50">{t("account.why")}</p>
    </div>
  );
}
