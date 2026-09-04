import Chevron from "./chevron";
import PhonePrefixSelect from "./phone-prefix-select";

const FIELD = "w-full border border-black/20 bg-transparent p-[12px] font-gotham text-paragraph text-black outline-none placeholder:text-black focus:border-black/60";

function Field({ id, label, type = "text", autoComplete, className = "" }: { id: string; label: string; type?: string; autoComplete?: string; className?: string }) {
  return (
    <label htmlFor={id} className={`block min-w-0 ${className}`}>
      <span className="sr-only">{label}</span>
      <input id={id} name={id} type={type} placeholder={label} autoComplete={autoComplete} className={`${FIELD} truncate`} />
    </label>
  );
}

/**
 * Billing details form from the Figma checkout page. Field labels sit inside the boxes as placeholders,
 * with visually hidden labels for assistive tech. Pairs sit side by side; the note fills the remaining height.
 */
export default function CheckoutForm({ id = "checkout-form", className = "" }: { id?: string; className?: string }) {
  return (
    <form id={id} action="#" method="post" className={`flex w-full flex-col gap-[24px] ${className}`}>
      <Field id="email" label="E-mail" type="email" autoComplete="email" />
      <div className="flex gap-[24px]">
        <Field id="first-name" label="First name" autoComplete="given-name" className="flex-1" />
        <Field id="last-name" label="Last name" autoComplete="family-name" className="flex-1" />
      </div>

      <label htmlFor="country" className="relative block">
        <span className="sr-only">Country</span>
        <select id="country" name="country" defaultValue="" autoComplete="country-name" className={`${FIELD} appearance-none pr-[36px]`}>
          <option value="" disabled>
            Country
          </option>
          <option>Norway</option>
          <option>Sweden</option>
          <option>Denmark</option>
          <option>Finland</option>
          <option>Germany</option>
          <option>United Kingdom</option>
        </select>
        <Chevron className="pointer-events-none absolute top-1/2 right-[12px] -translate-y-1/2" />
      </label>

      <div className="flex gap-[24px]">
        <Field id="street" label="Street address" autoComplete="address-line1" className="flex-1" />
        <Field id="apartment" label="Apartment, suite, unit, etc." autoComplete="address-line2" className="flex-1" />
      </div>
      <Field id="postcode" label="Postcode/ ZIP" autoComplete="postal-code" />
      <Field id="city" label="Town/ city" autoComplete="address-level2" />

      <div className="flex gap-[24px]">
        <PhonePrefixSelect />
        <Field id="phone" label="Phone" type="tel" autoComplete="tel-national" className="flex-1" />
      </div>

      <label htmlFor="note" className="block h-[187px] md:min-h-0 md:flex-1">
        <span className="sr-only">Note</span>
        <textarea id="note" name="note" placeholder="Note" className={`${FIELD} h-full resize-none`} />
      </label>
    </form>
  );
}
