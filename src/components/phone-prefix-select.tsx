"use client";

import { useState } from "react";
import "flag-icons/css/flag-icons.min.css";
import Chevron from "./chevron";
import { COUNTRY_CODES, getCountryCode } from "@/data/country-codes";

/**
 * Country-code picker from the Figma phone field: SVG flag (flag-icons), dialling code and chevron in a bordered box.
 * A native select sits invisibly on top so the picker, keyboard and screen readers all work.
 * Option labels start with the country name so typing "nor" jumps to Norway.
 */
export default function PhonePrefixSelect({ name = "phone-prefix", defaultIso = "NO" }: { name?: string; defaultIso?: string }) {
  const [iso, setIso] = useState(defaultIso);
  const selected = getCountryCode(iso) ?? COUNTRY_CODES[0];

  return (
    <div className="relative flex shrink-0 items-center gap-[10px] border border-black/20 p-[12px] font-gotham text-paragraph text-black">
      {/* SVG flag from flag-icons, sized to the 22×16 Figma box */}
      <span aria-hidden className={`fi fi-${selected.iso.toLowerCase()} !h-[16px] !w-[22px] shrink-0 bg-cover`} />
      <span aria-hidden className="pr-[22px]">
        {selected.dial}
      </span>
      <Chevron className="pointer-events-none absolute top-1/2 right-[12px] -translate-y-1/2" />

      <label className="absolute inset-0">
        <span className="sr-only">Country code</span>
        <select
          name={name}
          value={iso}
          onChange={(event) => setIso(event.target.value)}
          className="h-full w-full cursor-pointer opacity-0"
        >
          {COUNTRY_CODES.map((country) => (
            <option key={country.iso} value={country.iso}>
              {country.name} ({country.dial})
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
