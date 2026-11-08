/** 11.3×6 chevron at 50% black from Figma, pointing down when closed and up when open. */
export default function Chevron({ open = false, className = "" }: { open?: boolean; className?: string }) {
  return (
    <svg
      width={12}
      height={6.707}
      viewBox="0 0 12 6.70711"
      fill="none"
      aria-hidden
      className={`shrink-0 transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none ${open ? "rotate-180" : ""} ${className}`}
    >
      <path d="M0.353553 0.353554L6.35355 6.35355M5.64645 6.35355L11.6464 0.353553" stroke="black" strokeOpacity={0.5} />
    </svg>
  );
}
