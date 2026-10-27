import { redirect } from "next/navigation";
import { BUTTON, FIELD, Heading } from "@/components/account-ui";
import PhonePrefixSelect from "@/components/phone-prefix-select";
import RolloverText from "@/components/rollover-text";
import { getShipsTo } from "@/lib/catalog";
import { getCustomer } from "@/lib/customer";
import { saveDetails } from "@/lib/customer-actions";
import { COUNTRY_CODES } from "@/data/country-codes";
import { getT } from "@/lib/i18n-server";
import type { Key } from "@/lib/i18n";

const TRANSLATED = new Set(["Norway", "Sweden", "Denmark", "Finland", "Germany", "United Kingdom"]);

export default async function DetailsPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const [customer, t, countries, { saved }] = await Promise.all([getCustomer(), getT(), getShipsTo(), searchParams]);
  if (!customer) redirect("/account/login?next=/account/details");
  const c = customer;
  const iso = c.phonePrefix ? COUNTRY_CODES.find((x) => x.dial === c.phonePrefix)?.iso : undefined;
  const field = (name: string, label: string, value?: string, auto?: string, required = false) => (
    <label className="block min-w-0 flex-1">
      <span className="sr-only">{label}</span>
      <input name={name} placeholder={label} defaultValue={value ?? ""} autoComplete={auto} required={required} className={`${FIELD} truncate`} />
    </label>
  );
  return (
    <div className="flex flex-col gap-[24px] md:max-w-[640px]">
      <Heading>{t("account.details")}</Heading>
      {saved && <p className="m-0 font-gotham text-paragraph text-black/50">{t("account.saved")}</p>}
      <form action={saveDetails} className="flex flex-col gap-[24px]">
        <div className="flex gap-[24px]">
          {field("firstName", t("form.firstName"), c.firstName, "given-name")}
          {field("lastName", t("form.lastName"), c.lastName, "family-name")}
        </div>
        <label className="block">
          <span className="sr-only">{t("form.country")}</span>
          <select name="country" defaultValue={c.country ?? ""} className={`${FIELD} appearance-none`}>
            <option value="">{t("form.country")}</option>
            {countries.map((x) => (
              <option key={x} value={x}>{TRANSLATED.has(x) ? t(`country.${x}` as Key) : x}</option>
            ))}
          </select>
        </label>
        <div className="flex gap-[24px]">
          {field("street", t("form.street"), c.street, "address-line1")}
          {field("apartment", t("form.apartment"), c.apartment, "address-line2")}
        </div>
        {field("postcode", t("form.postcode"), c.postcode, "postal-code")}
        {field("city", t("form.city"), c.city, "address-level2")}
        <div className="flex gap-[24px]">
          <PhonePrefixSelect name="phonePrefixIso" defaultIso={iso ?? "NO"} />
          {field("phone", t("form.phone"), c.phone, "tel-national")}
        </div>
        <button type="submit" className={BUTTON}><RolloverText text={t("account.save")} /></button>
      </form>
    </div>
  );
}
