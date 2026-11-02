"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

/**
 * What a button shows while it works. The label, spinner and tick share one grid cell, so the
 * button keeps its size as they fade in and out, and globals.css stops a second press while pending.
 */
export function Busy({ state = "idle", children, done }: { state?: "idle" | "pending" | "done"; children: ReactNode; done?: ReactNode }) {
  return (
    <span className="busy" data-state={state}>
      <span className="busy-label">{children}</span>
      <span aria-hidden className="busy-spinner" />
      <span className="busy-done">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
          <path d="M2 7.5 5.5 11 12 3.5" stroke="currentColor" strokeWidth="1.2" />
        </svg>
        {done}
      </span>
    </span>
  );
}

/** For a submit button inside a form: spins for as long as the form's action runs. */
export function FormBusy({ children }: { children: ReactNode }) {
  const { pending } = useFormStatus();
  return <Busy state={pending ? "pending" : "idle"}>{children}</Busy>;
}
