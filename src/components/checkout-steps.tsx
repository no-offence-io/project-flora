const STEPS = ["Shopping cart", "Checkout Details", "Order Complete"] as const;
export type CheckoutStep = (typeof STEPS)[number];

/** "Shopping cart – Checkout Details – Order Complete" line; the current step is black, the rest 50% black. */
export default function CheckoutSteps({ current, className = "" }: { current: CheckoutStep; className?: string }) {
  return (
    <p className={`font-gotham text-paragraph text-black ${className}`}>
      {STEPS.map((step, index) => (
        <span key={step}>
          <span className={step === current ? "text-black" : "text-black/50"} aria-current={step === current ? "step" : undefined}>
            {step}
          </span>
          {index < STEPS.length - 1 && " – "}
        </span>
      ))}
    </p>
  );
}
