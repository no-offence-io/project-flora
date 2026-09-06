import { z } from "zod";
import type { Totals } from "./money";

/**
 * What the browser is allowed to tell the checkout API. Every object is strict: a request carrying
 * a `price`, `amount`, `total` or any other unexpected key is rejected outright, not ignored. The
 * only things the client may state about a line are which product and how many.
 */
export const cartLineSchema = z.strictObject({
  id: z.string().min(1).max(100),
  quantity: z.number().int().min(1).max(10),
});

export const customerSchema = z.strictObject({
  email: z.email(),
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  country: z.string().trim().min(1).max(100),
  street: z.string().trim().min(1).max(200),
  apartment: z.string().trim().max(200).optional(),
  postcode: z.string().trim().min(1).max(20),
  city: z.string().trim().min(1).max(100),
  phonePrefix: z.string().regex(/^\+\d{1,4}$/),
  phone: z.string().trim().min(4).max(30),
  note: z.string().trim().max(1000).optional(),
});

export const intentRequestSchema = z.strictObject({
  items: z.array(cartLineSchema).min(1).max(50),
  /** Absent while the cart is being quoted; present when the customer confirms. */
  customer: customerSchema.optional(),
  /** Reuse an existing PaymentIntent rather than creating a fresh one on every cart change. */
  paymentIntentId: z.string().regex(/^pi_[A-Za-z0-9]+$/).optional(),
});

export type IntentRequest = z.infer<typeof intentRequestSchema>;
export type Customer = z.infer<typeof customerSchema>;

export type QuotedLine = { id: string; name: string; quantity: number; unitPriceOre: number };

export type IntentResponse = {
  clientSecret: string;
  paymentIntentId: string;
  totals: Totals;
  lines: QuotedLine[];
};
