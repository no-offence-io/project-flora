"use client";

import { useState } from "react";
import TreasureCard from "@/components/treasure-card";
import { Button, Card, Muted, Subheading } from "@/components/admin/ui";
import { DEPTH_RANGE, type SheetBack, type TreasureVariant, type VintageCardSetting } from "@/lib/vintage-card-shared";

const LOOKS: { value: TreasureVariant; label: string; hint: string }[] = [
  { value: "card", label: "Card", hint: "A printed card with the photo on the front and the mark on the back." },
  { value: "glass", label: "Glass", hint: "The photo as a print floating in a clear block, the mark etched on its back." },
];
const BACKS: { value: SheetBack; label: string; hint: string }[] = [
  { value: "paper", label: "Paper", hint: "The vintage section's paper tone." },
  { value: "dark", label: "Dark", hint: "Near black." },
];

/** A choice as a row of radio buttons, the same size as the form's other fields. */
function Choice<T extends string>({ label, name, options, value, onChange }: { label: string; name: string; options: { value: T; label: string; hint?: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <fieldset className="m-0 flex flex-col gap-[6px] border-0 p-0">
      <legend className="mb-[6px] font-gotham text-[11px] leading-normal text-black">{label}</legend>
      <div className="flex flex-wrap gap-[12px]">
        {options.map((o) => (
          <label key={o.value} className="flex cursor-pointer items-center gap-[8px] border border-black/20 px-[12px] py-[10px] font-gotham text-paragraph text-black has-[:checked]:border-black">
            <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} className="h-[14px] w-[14px] accent-black" />
            {o.label}
          </label>
        ))}
      </div>
      {options.find((o) => o.value === value)?.hint && <Muted>{options.find((o) => o.value === value)?.hint}</Muted>}
    </fieldset>
  );
}

export default function VintageCardForm({ initial, sample, action }: { initial: VintageCardSetting; sample: { src: string; alt: string } | null; action: (formData: FormData) => void | Promise<void> }) {
  const [s, setS] = useState(initial);
  return (
    <form action={action} className="flex max-w-[1100px] flex-col gap-[42px]">
      <div className="grid gap-[24px] md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card>
          <div className="flex flex-col gap-[24px]">
            <Choice label="Look" name="variant" options={LOOKS} value={s.variant} onChange={(variant) => setS({ ...s, variant })} />
            {s.variant === "glass" && <Choice label="Back of the print" name="sheetBack" options={BACKS} value={s.sheetBack} onChange={(sheetBack) => setS({ ...s, sheetBack })} />}
            {s.variant !== "glass" && <input type="hidden" name="sheetBack" value={s.sheetBack} />}
            <label className="flex flex-col gap-[6px]">
              <span className="font-gotham text-[11px] leading-normal text-black">Colour of the mark</span>
              <span className="flex items-center gap-[12px]">
                <input type="color" name="markColor" value={s.markColor} onChange={(e) => setS({ ...s, markColor: e.target.value })} className="h-[40px] w-[64px] cursor-pointer border border-black/20 bg-white p-[2px]" />
                <span className="font-mono text-[12px] text-black/70">{s.markColor}</span>
              </span>
              <Muted>{s.variant === "glass" ? "The Ö etched into the back of the glass." : "The Ö on the back of the card."}</Muted>
            </label>
            <label className="flex flex-col gap-[6px]">
              <span className="font-gotham text-[11px] leading-normal text-black">Depth · {s.depth.toFixed(2)}</span>
              <input type="range" name="depth" min={DEPTH_RANGE.min} max={DEPTH_RANGE.max} step={0.01} value={s.depth} onChange={(e) => setS({ ...s, depth: Number(e.target.value) })} className="w-full accent-black" />
              <Muted>{s.variant === "glass" ? "How thick the glass block is." : "How thick the card is."}</Muted>
            </label>
          </div>
        </Card>
        <Card>
          <div className="flex flex-col gap-[12px]">
            <Subheading>Preview</Subheading>
            {sample ? (
              <div className="relative h-[420px] w-full overflow-hidden bg-white">
                <TreasureCard src={sample.src} alt={sample.alt} setting={s} />
              </div>
            ) : (
              <Muted>Add a product with a photo to see the preview.</Muted>
            )}
          </div>
        </Card>
      </div>
      <Button className="md:max-w-[320px]">Save</Button>
    </form>
  );
}
