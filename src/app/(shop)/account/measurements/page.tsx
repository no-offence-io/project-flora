import { redirect } from "next/navigation";
import { BUTTON, FIELD, Heading } from "@/components/account-ui";
import RolloverText from "@/components/rollover-text";
import { getSizingSettings } from "@/lib/catalog";
import { getCustomer } from "@/lib/customer";
import { saveMeasurements } from "@/lib/customer-actions";
import { getT } from "@/lib/i18n-server";

export default async function MeasurementsPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const [customer, t, sizing, { saved }] = await Promise.all([getCustomer(), getT(), getSizingSettings(), searchParams]);
  if (!customer) redirect("/account/login?next=/account/measurements");
  const value = (label: string) => customer.measurements?.find((m) => m.label === label)?.value ?? "";
  return (
    <div className="flex flex-col gap-[24px] md:max-w-[521px]">
      <Heading>{t("account.measurements")}</Heading>
      <p className="m-0 font-gotham text-paragraph text-black/70">{t("account.measurementsIntro")}</p>
      {saved && <p className="m-0 font-gotham text-paragraph text-black/50">{t("account.saved")}</p>}
      <form action={saveMeasurements} className="flex flex-col gap-[24px]">
        <div className="grid grid-cols-2 gap-[12px]">
          {sizing.fields.map((f) => (
            <label key={f.label} className="flex min-w-0 flex-col gap-[6px] font-gotham text-[11px] leading-normal text-black">
              {f.label}
              <input type="hidden" name="label" value={f.label} />
              <span className="relative block">
                <input name="value" inputMode="decimal" defaultValue={value(f.label)} placeholder="0" className={`${FIELD} pr-[36px]`} />
                <span className="pointer-events-none absolute top-1/2 right-[12px] -translate-y-1/2 text-paragraph text-black/50">cm</span>
              </span>
              {f.hint && <span className="text-black/50">{f.hint}</span>}
            </label>
          ))}
        </div>
        <button type="submit" className={BUTTON}><RolloverText text={t("account.save")} /></button>
      </form>
    </div>
  );
}
