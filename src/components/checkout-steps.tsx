import { getT } from "@/lib/i18n-server";

const STEPS = [
  { key: "steps.cart", id: "Shopping cart" },
  { key: "steps.details", id: "Checkout Details" },
  { key: "steps.complete", id: "Order Complete" },
] as const;
export type CheckoutStep = (typeof STEPS)[number]["id"];

/** "Shopping cart – Checkout Details – Order Complete" line; the current step is black, the rest 50% black. */
export default async function CheckoutSteps({ current, className = "" }: { current: CheckoutStep; className?: string }) {
  const t = await getT();
  return (
    <p className={`font-gotham text-paragraph text-black ${className}`}>
      {STEPS.map((step, index) => (
        <span key={step.id}>
          <span className={step.id === current ? "text-black" : "text-black/50"} aria-current={step.id === current ? "step" : undefined}>
            {t(step.key)}
          </span>
          {index < STEPS.length - 1 && " – "}
        </span>
      ))}
    </p>
  );
}
