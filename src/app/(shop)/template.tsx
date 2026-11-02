import type { ReactNode } from "react";

/** Remounts on every page, so each arrival fades in, section after section. */
export default function Template({ children }: { children: ReactNode }) {
  return <div className="page-in flex w-full flex-1 flex-col">{children}</div>;
}
