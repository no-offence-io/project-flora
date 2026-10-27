import type { ReactNode } from "react";

/* The shop's own pieces, for the account pages: the order-summary card and its hairline. */
export const FIELD = "w-full border border-black/20 bg-transparent p-[12px] font-gotham text-paragraph text-black outline-none placeholder:text-black/50 focus:border-black/60";
export const BUTTON = "flex w-full items-center justify-center bg-black p-[12px] font-gotham text-paragraph text-white disabled:opacity-50";

export function Heading({ children }: { children: ReactNode }) {
  return <h1 className="m-0 font-americana text-big-header-mobile capitalize text-black md:text-big-header-desktop">{children}</h1>;
}

export function Panel({ title, action, children, className = "" }: { title: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`flex flex-col gap-[12px] font-gotham text-paragraph text-black md:border-[0.5px] md:border-black/25 md:p-[24px] ${className}`}>
      <h2 className="m-0 flex items-center justify-between gap-[12px] font-gotham text-paragraph">
        {title}
        {action}
      </h2>
      <div className="h-px w-full bg-black/25" />
      {children}
    </section>
  );
}

export function Status({ children }: { children: ReactNode }) {
  return <span className="border-[0.5px] border-black px-[4px] py-[1px] text-paragraph">{children}</span>;
}
