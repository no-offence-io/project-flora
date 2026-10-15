"use client";

import Chevron from "./chevron";
import PhonePrefixSelect from "./phone-prefix-select";
import { useT } from "@/components/i18n-provider";

const FIELD = "w-full border border-black/20 bg-transparent p-[12px] font-gotham text-paragraph text-black outline-none placeholder:text-black focus:border-black/60";

function Field({
  id,
  label,
  type = "text",
  autoComplete,
  required = true,
  className = "",
}: {
  id: string;
  label: string;
  type?: string;
  autoComplete?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <label htmlFor={id} className={`block min-w-0 ${className}`}>
      <span className="sr-only">{label}</span>
      <input id={id} name={id} type={type} placeholder={label} autoComplete={autoComplete} required={required} className={`${FIELD} truncate`} />
    </label>
  );
}

/**
 * Billing details form from the Figma checkout page. Field labels sit inside the boxes as placeholders,
 * with visually hidden labels for assistive tech. Pairs sit side by side; the note fills the remaining height.
 */
export default function CheckoutForm({ id = "checkout-form", className = "" }: { id?: string; className?: string }) {
  const t = useT();
  return (
    <form id={id} noValidate={false} onSubmit={(e) => e.preventDefault()} className={`flex w-full flex-col gap-[24px] ${className}`}>
      <Field id="email" label={t("form.email")} type="email" autoComplete="email" />
      <div className="flex gap-[24px]">
        <Field id="first-name" label={t("form.firstName")} autoComplete="given-name" className="flex-1" />
        <Field id="last-name" label={t("form.lastName")} autoComplete="family-name" className="flex-1" />
      </div>

      <label htmlFor="country" className="relative block">
        <span className="sr-only">{t("form.country")}</span>
        <select id="country" name="country" defaultValue="" required autoComplete="country-name" className={`${FIELD} appearance-none pr-[36px]`}>
          <option value="" disabled>
            {t("form.country")}
          </option>
          {/* Values stay English: the checkout API matches them to ISO codes by name. */}
          {(["Norway", "Sweden", "Denmark", "Finland", "Germany", "United Kingdom"] as const).map((c) => (
            <option key={c} value={c}>
              {t(`country.${c}` as const)}
            </option>
          ))}
        </select>
        <Chevron className="pointer-events-none absolute top-1/2 right-[12px] -translate-y-1/2" />
      </label>

      <div className="flex gap-[24px]">
        <Field id="street" label={t("form.street")} autoComplete="address-line1" className="flex-1" />
        <Field id="apartment" label={t("form.apartment")} autoComplete="address-line2" required={false} className="flex-1" />
      </div>
      <Field id="postcode" label={t("form.postcode")} autoComplete="postal-code" />
      <Field id="city" label={t("form.city")} autoComplete="address-level2" />

      <div className="flex gap-[24px]">
        <PhonePrefixSelect />
        <Field id="phone" label={t("form.phone")} type="tel" autoComplete="tel-national" className="flex-1" />
      </div>

      <label htmlFor="note" className="block h-[187px] md:min-h-0 md:flex-1">
        <span className="sr-only">{t("form.note")}</span>
        <textarea id="note" name="note" placeholder={t("form.note")} className={`${FIELD} h-full resize-none`} />
      </label>
    </form>
  );
}
