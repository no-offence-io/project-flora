"use client";

import Chevron from "./chevron";
import PhonePrefixSelect from "./phone-prefix-select";
import Link from "next/link";
import { useT } from "@/components/i18n-provider";
import type { CheckoutAccount } from "./checkout-client";
import { COUNTRY_CODES } from "@/data/country-codes";
import RolloverText from "./rollover-text";
import type { Key } from "@/lib/i18n";

/** Countries with a translated name in the dictionary; any other is shown as written in Settings. */
const TRANSLATED = new Set(["Norway", "Sweden", "Denmark", "Finland", "Germany", "United Kingdom"]);

const FIELD = "w-full border border-black/20 bg-transparent p-[12px] font-gotham text-paragraph text-black outline-none placeholder:text-black focus:border-black/60";

function Field({
  id,
  label,
  type = "text",
  autoComplete,
  required = true,
  defaultValue,
  className = "",
}: {
  id: string;
  label: string;
  type?: string;
  autoComplete?: string;
  required?: boolean;
  defaultValue?: string;
  className?: string;
}) {
  return (
    <label htmlFor={id} className={`block min-w-0 ${className}`}>
      <span className="sr-only">{label}</span>
      <input id={id} name={id} type={type} placeholder={label} autoComplete={autoComplete} required={required} defaultValue={defaultValue} className={`${FIELD} truncate`} />
    </label>
  );
}

/**
 * Billing details form from the Figma checkout page. Field labels sit inside the boxes as placeholders,
 * with visually hidden labels for assistive tech. Pairs sit side by side; the note fills the remaining height.
 */
export default function CheckoutForm({ id = "checkout-form", countries, account, className = "" }: { id?: string; countries: string[]; account?: CheckoutAccount | null; className?: string }) {
  const t = useT();
  const a = account ?? undefined;
  const prefixIso = a?.phonePrefix ? COUNTRY_CODES.find((c) => c.dial === a.phonePrefix)?.iso : undefined;
  const countryLabel = (c: string) => (TRANSLATED.has(c) ? t(`country.${c}` as Key) : c);
  return (
    <form id={id} noValidate={false} onSubmit={(e) => e.preventDefault()} className={`flex w-full flex-col gap-[24px] ${className}`}>
      {/* Guest is the default; signing in only fills things in and saves cards. */}
      {a ? (
        <p className="m-0 flex flex-wrap items-center justify-between gap-[12px] border-[0.25px] border-black/25 p-[12px] font-gotham text-paragraph text-black">
          <span>
            {t("account.signedInAs")} <span className="text-black/50">{a.email}</span>
          </span>
          <Link href="/account" className="underline">
            <RolloverText text={t("account.myPage")} />
          </Link>
        </p>
      ) : (
        <div className="flex flex-col gap-[12px] border-[0.25px] border-black/25 p-[12px] font-gotham text-paragraph text-black md:flex-row md:items-center md:justify-between">
          <span>{t("checkout.guest")}</span>
          <Link href="/account/login?next=/checkout" className="text-black underline">
            <RolloverText text={t("checkout.signIn")} />
          </Link>
        </div>
      )}
      {a ? <input type="hidden" name="email" value={a.email} /> : <Field id="email" label={t("form.email")} type="email" autoComplete="email" />}
      <div className="flex gap-[24px]">
        <Field id="first-name" label={t("form.firstName")} autoComplete="given-name" defaultValue={a?.firstName} className="flex-1" />
        <Field id="last-name" label={t("form.lastName")} autoComplete="family-name" defaultValue={a?.lastName} className="flex-1" />
      </div>

      <label htmlFor="country" className="relative block">
        <span className="sr-only">{t("form.country")}</span>
        <select id="country" name="country" defaultValue={a?.country && countries.includes(a.country) ? a.country : ""} required autoComplete="country-name" className={`${FIELD} appearance-none pr-[36px]`}>
          <option value="" disabled>
            {t("form.country")}
          </option>
          {/* Values stay English: the shipping zones in Settings match them by name. */}
          {countries.map((c) => (
            <option key={c} value={c}>
              {countryLabel(c)}
            </option>
          ))}
        </select>
        <Chevron className="pointer-events-none absolute top-1/2 right-[12px] -translate-y-1/2" />
      </label>

      <div className="flex gap-[24px]">
        <Field id="street" label={t("form.street")} autoComplete="address-line1" defaultValue={a?.street} className="flex-1" />
        <Field id="apartment" label={t("form.apartment")} autoComplete="address-line2" required={false} defaultValue={a?.apartment} className="flex-1" />
      </div>
      <Field id="postcode" label={t("form.postcode")} autoComplete="postal-code" defaultValue={a?.postcode} />
      <Field id="city" label={t("form.city")} autoComplete="address-level2" defaultValue={a?.city} />

      <div className="flex gap-[24px]">
        <PhonePrefixSelect defaultIso={prefixIso ?? "NO"} />
        <Field id="phone" label={t("form.phone")} type="tel" autoComplete="tel-national" defaultValue={a?.phone} className="flex-1" />
      </div>

      <label htmlFor="note" className="block h-[187px] md:min-h-0 md:flex-1">
        <span className="sr-only">{t("form.note")}</span>
        <textarea id="note" name="note" placeholder={t("form.note")} className={`${FIELD} h-full resize-none`} />
      </label>

      {!a && (
        <label className="flex items-start gap-[8px] font-gotham text-paragraph text-black">
          <input type="checkbox" name="register" className="mt-[3px] h-[14px] w-[14px] shrink-0 accent-black" />
          <span>
            {t("checkout.register")} <span className="text-black/50">{t("checkout.registerHint")}</span>
          </span>
        </label>
      )}
    </form>
  );
}
