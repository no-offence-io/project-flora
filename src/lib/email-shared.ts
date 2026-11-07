/** What Ida can be emailed about, chosen under Settings & brand → Emails. */
export const NOTIFY_SCENARIOS = [
  { key: "orders", label: "New orders", hint: "A copy of every order confirmation." },
  { key: "payments", label: "Failed payments", hint: "A customer tried to pay and the card was refused." },
  { key: "refunds", label: "Refunds", hint: "A payment was refunded, in Stripe or from the dashboard." },
  { key: "problems", label: "Problems", hint: "Something the shop couldn't do by itself: an email that failed, an order that couldn't be recorded, a piece sold twice." },
  { key: "newsletters", label: "Newsletter reports", hint: "How many subscribers a newsletter reached." },
] as const;
export type NotifyScenario = (typeof NOTIFY_SCENARIOS)[number]["key"];
export const SCENARIO_KEYS = NOTIFY_SCENARIOS.map((s) => s.key) as NotifyScenario[];
export const DEFAULT_NOTIFY_ON: NotifyScenario[] = ["orders", "payments", "refunds", "problems"];
export const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
