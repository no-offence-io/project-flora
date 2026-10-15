import type { CSSProperties } from "react";

/**
 * The hover treatment for text links: every letter sits on top of an identical copy, and when the
 * link is hovered each letter rolls up one line so its copy takes its place, staggered left to
 * right. On mouse-out they roll back down in the same order, letter by letter, so a quick in-and-out
 * never snaps. Pure CSS (`.rollover` in globals.css), triggered by the nearest `a` or `button`
 * being hovered, so any link can simply wrap its label in this. Screen readers get the plain text.
 */
export default function RolloverText({
  text,
  capitalize = false,
  className = "",
}: {
  text: string;
  /** Do the parent's `capitalize` here: per-letter boxes would otherwise each count as a word start. */
  capitalize?: boolean;
  className?: string;
}) {
  const label = capitalize ? text.replace(/(^|\s)\S/g, (c) => c.toUpperCase()) : text;
  return (
    <span className={`rollover${className ? ` ${className}` : ""}`} style={capitalize ? { textTransform: "none" } : undefined}>
      <span className="sr-only">{label}</span>
      <span aria-hidden>
        {Array.from(label).map((letter, i) => (
          <span key={i} className="rollover__l" style={{ "--i": i } as CSSProperties}>
            <span className="rollover__c">
              <span>{letter}</span>
              <span>{letter}</span>
            </span>
          </span>
        ))}
      </span>
    </span>
  );
}
