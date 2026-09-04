/** Shopping bag outline with an item count inside, from the Figma "Icon Container" (23.2×28). */
export default function CartIcon({ count = 0, className = "" }: { count?: number; className?: string }) {
  return (
    <svg
      width={23.2}
      height={28}
      viewBox="0 0 23.2 28"
      fill="none"
      aria-hidden
      className={className}
    >
      <path
        d="M15.2 5C15.2 4.47471 15.0965 3.95457 14.8955 3.46927C14.6945 2.98396 14.3998 2.54301 14.0284 2.17157C13.657 1.80014 13.216 1.5055 12.7307 1.30448C12.2454 1.10346 11.7253 1 11.2 1C10.6747 1 10.1545 1.10346 9.66924 1.30448C9.18394 1.5055 8.74298 1.80014 8.37155 2.17157C8.00011 2.54301 7.70548 2.98396 7.50446 3.46927C7.30344 3.95457 7.19998 4.47471 7.19998 5"
        stroke="currentColor"
        strokeWidth={2}
      />
      <rect x={1} y={5.8} width={21.2} height={21.2} stroke="currentColor" strokeWidth={2} />
      <text
        x={11.6}
        y={20.6}
        textAnchor="middle"
        fill="currentColor"
        fontSize={13}
        className="font-americana"
      >
        {count}
      </text>
    </svg>
  );
}
