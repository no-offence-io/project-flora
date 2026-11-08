import type { ReactNode } from "react";

/**
 * Content that unfolds and folds away smoothly. The height comes from a grid row going from 0fr
 * to 1fr, so nothing has to be measured, and the content fades with it. Closed, it is also inert,
 * so hidden fields and links can't be reached from the keyboard.
 */
export default function Collapse({ open, children, className = "" }: { open: boolean; children: ReactNode; className?: string }) {
  return (
    <div
      inert={!open}
      className={`grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"} ${className}`}
    >
      <div className={`min-h-0 overflow-hidden transition-opacity duration-300 motion-reduce:transition-none ${open ? "opacity-100" : "opacity-0"}`}>{children}</div>
    </div>
  );
}
