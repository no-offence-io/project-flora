import Link from "next/link";
import type { ReactNode } from "react";
import { FormBusy } from "@/components/busy";
import Chevron from "@/components/chevron";
import { isStatus, STATUS_LABEL, STATUS_TONE } from "@/lib/order-status";

/*
 * Admin primitives. Every class string here is lifted from the shop's own components — the checkout
 * form's field, the cart's bordered row, the "Confirm order" button, the checkout-steps line — so the
 * dashboard reads as the same product, not a different one bolted on.
 */

/** The checkout form's input style, verbatim. */
export const FIELD =
  "w-full border border-black/20 bg-transparent p-[12px] font-gotham text-paragraph text-black outline-none placeholder:text-black/50 focus:border-black/60";

export function Heading({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <h1 className={`m-0 font-americana text-big-header-mobile capitalize text-black md:text-big-header-desktop ${className}`}>{children}</h1>;
}

export function Subheading({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <h2 className={`m-0 font-gotham text-paragraph text-black ${className}`}>{children}</h2>;
}

export function Muted({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`m-0 font-gotham text-paragraph text-black/50 ${className}`}>{children}</p>;
}

/** The order-summary card: hairline border and 24px padding on desktop, flush on mobile. */
export function Card({ children, className = "", id }: { children: ReactNode; className?: string; id?: string }) {
  return <section id={id} className={`flex flex-col gap-[12px] bg-white font-gotham text-paragraph text-black md:border-[0.5px] md:border-black/25 md:p-[24px] ${className}`}>{children}</section>;
}

/** The cart's bordered row. */
export function Row({ children, href, className = "" }: { children: ReactNode; href?: string; className?: string }) {
  const classes = `flex items-center gap-[12px] border-[0.25px] border-black/25 p-[12px] font-gotham text-paragraph text-black ${href ? "hover:bg-[#fafbfc] transition-colors" : ""} ${className}`;
  return href ? (
    <Link href={href} className={classes}>
      {children}
    </Link>
  ) : (
    <div className={classes}>{children}</div>
  );
}

/** "Confirm order" button, verbatim. */
export function Button({ children, type = "submit", className = "", ...rest }: { children: ReactNode; type?: "submit" | "button"; className?: string; name?: string; value?: string; formAction?: (formData: FormData) => void | Promise<void>; onClick?: () => void; disabled?: boolean }) {
  return (
    <button
      type={type}
      className={`flex w-full items-center justify-center bg-black p-[12px] font-gotham text-paragraph text-white hover:opacity-80 transition-opacity disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...rest}
    >
      {type === "submit" ? <FormBusy>{children}</FormBusy> : children}
    </button>
  );
}

export function TextLink({ href, children, className = "" }: { href: string; children: ReactNode; className?: string }) {
  return (
    <Link href={href} className={`font-gotham text-paragraph text-black underline hover:opacity-70 transition-opacity ${className}`}>
      {children}
    </Link>
  );
}

/** A labelled field. The label sits above in 11px like the cart's measurement rows, not inside. */
export function Labelled({ label, children, hint, className = "" }: { label: string; children: ReactNode; hint?: string; className?: string }) {
  return (
    <label className={`flex min-w-0 flex-col gap-[6px] ${className}`}>
      <span className="font-gotham text-[11px] leading-normal text-black">{label}</span>
      {children}
      {hint && <span className="font-gotham text-[11px] leading-normal text-black/50">{hint}</span>}
    </label>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${FIELD} truncate ${props.className ?? ""}`} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={4} {...props} className={`${FIELD} resize-y ${props.className ?? ""}`} />;
}

/** The checkout's country select: native select with the Figma chevron over it. */
export function Select({ children, className = "", ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className={`relative block ${className}`}>
      <select {...props} className={`${FIELD} appearance-none pr-[36px]`}>
        {children}
      </select>
      <Chevron className="pointer-events-none absolute top-1/2 right-[12px] -translate-y-1/2" />
    </span>
  );
}

export function Checkbox({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex items-center gap-[8px] font-gotham text-paragraph text-black">
      <input type="checkbox" {...props} className="h-[14px] w-[14px] accent-black" />
      {label}
    </label>
  );
}

/**
 * One text in two languages, side by side on desktop. English is the fallback the site shows when
 * Norwegian is empty, so it's the one marked required when the field is.
 */
export function Bilingual({
  name,
  label,
  en,
  no,
  multiline = false,
  required = false,
  rows,
}: {
  name: string;
  label: string;
  en: string;
  no: string;
  multiline?: boolean;
  required?: boolean;
  rows?: number;
}) {
  const Control = multiline ? Textarea : Input;
  return (
    <div className="flex flex-col gap-[6px]">
      <span className="font-gotham text-[11px] leading-normal text-black">{label}</span>
      <div className="flex flex-col gap-[12px] md:flex-row md:gap-[24px]">
        <Labelled label="English" className="flex-1">
          <Control name={`${name}.en`} defaultValue={en} required={required} rows={rows} />
        </Labelled>
        <Labelled label="Norsk" className="flex-1">
          <Control name={`${name}.no`} defaultValue={no} rows={rows} placeholder="Leave empty to show English" />
        </Labelled>
      </div>
    </div>
  );
}

/** The little bordered tag from the order summary ("1 Items"), used for statuses. */
export function Tag({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "muted" }) {
  return <span className={`border-[0.5px] px-[4px] py-[1px] font-gotham text-paragraph ${tone === "muted" ? "border-black/50 text-black/50" : "border-black text-black"}`}>{children}</span>;
}

/** An order's status as a soft coloured pill: green to make, blue completed, and so on. */
export function StatusPill({ status }: { status?: string }) {
  const s = isStatus(status) ? status : "paid";
  return <span className={`inline-block whitespace-nowrap px-[8px] py-[3px] font-gotham text-[11px] leading-normal ${STATUS_TONE[s]}`}>{STATUS_LABEL[s]}</span>;
}
