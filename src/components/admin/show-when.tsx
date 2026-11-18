"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/*
 * Shows its children only while a field of the surrounding form has one of the given values: the
 * sizes list only for sized products, the stock number only when stock is counted. The server
 * decides the first state from the saved values, so nothing jumps when the page loads.
 *
 * With `disable`, hidden fields are also switched off, so a required field that doesn't apply can't
 * block saving (a disabled field is not sent either, which the save action expects).
 */
export default function ShowWhen({ field, values, initial, disable = false, children }: { field: string; values: string[]; initial: boolean; disable?: boolean; children: ReactNode }) {
  const box = useRef<HTMLFieldSetElement>(null);
  const [show, setShow] = useState(initial);
  useEffect(() => {
    const form = box.current?.form ?? box.current?.closest("form");
    if (!form) return;
    const read = () => {
      const control = form.elements.namedItem(field) as RadioNodeList | HTMLSelectElement | HTMLInputElement | null;
      if (!control) return;
      const value = control instanceof HTMLInputElement && control.type === "checkbox" ? (control.checked ? "on" : "off") : control.value;
      setShow(values.includes(value));
    };
    read();
    form.addEventListener("change", read);
    return () => form.removeEventListener("change", read);
  }, [field, values]);
  return (
    <fieldset ref={box} disabled={disable && !show} hidden={!show} className="m-0 min-w-0 border-0 p-0">
      {children}
    </fieldset>
  );
}
