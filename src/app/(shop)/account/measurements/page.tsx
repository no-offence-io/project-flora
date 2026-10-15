import { redirect } from "next/navigation";
import { auth, authConfigured } from "@/auth";

export const metadata = { title: "My measurements – Flöra" };

const FIELD = "w-full border border-black/20 bg-transparent p-[12px] font-gotham text-paragraph text-black outline-none placeholder:text-black focus:border-black/60";

const MEASUREMENTS = [
  { id: "waist", label: "B - Waist (cm)" },
  { id: "highHips", label: "G - High hips (cm)" },
  { id: "hips", label: "Hips (cm)" },
  { id: "bust", label: "Bust (cm)" },
  { id: "height", label: "Height (cm)" },
];

/** The checkout form's fields, used for the measurements that fill in at checkout. Not saved anywhere yet. */
export default async function MeasurementsPage() {
  if (!authConfigured || !(await auth())?.user) redirect("/account/login");
  return (
    <div className="flex flex-col gap-[24px] md:max-w-[521px]">
      <h1 className="m-0 font-americana text-big-header-mobile capitalize text-black md:text-big-header-desktop">My measurements</h1>
      <p className="m-0 font-gotham text-paragraph text-black/70">Measure over light clothing, tape snug but not tight. We use these to suggest a size and fill them in at checkout.</p>
      <form className="flex flex-col gap-[24px]">
        <div className="grid gap-[24px] md:grid-cols-2">
          {MEASUREMENTS.map((m) => (
            <label key={m.id} htmlFor={m.id} className="block min-w-0">
              <span className="sr-only">{m.label}</span>
              <input id={m.id} name={m.id} inputMode="decimal" placeholder={m.label} className={`${FIELD} truncate`} />
            </label>
          ))}
        </div>
        <label htmlFor="size-note" className="block">
          <span className="sr-only">Note</span>
          <textarea id="size-note" name="note" placeholder="Anything else about fit (optional)" rows={3} className={`${FIELD} resize-none`} />
        </label>
        <button type="button" className="flex w-full items-center justify-center bg-black p-[12px] font-gotham text-paragraph text-white hover:opacity-80 transition-opacity">
          Save measurements
        </button>
        <p className="m-0 font-gotham text-paragraph text-black/50">Preview: saving isn&apos;t connected yet.</p>
      </form>
    </div>
  );
}
