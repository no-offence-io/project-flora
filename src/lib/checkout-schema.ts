import { z } from "zod";
import type { Totals } from "./money";

/**
 * What the browser is allowed to tell the checkout API. Every object is strict: a request carrying
 * a `price`, `amount`, `total` or any other unexpected key is rejected outright, not ignored. The
 * only things the client may state about a line are which product and how many.
 */
export const measurementSchema = z.strictObject({
  label: z.string().trim().min(1).max(40),
  /** Centimetres, as typed; whole or half numbers. */
  value: z.string().trim().regex(/^\d{1,3}([.,]\d)?$/),
});

export const cartLineSchema = z.strictObject({
  id: z.string().min(1).max(100),
  quantity: z.number().int().min(1).max(10),
  size: z.string().trim().min(1).max(20).optional(),
  measurements: z.array(measurementSchema).max(12).optional(),
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
  phonePrefix: z.string().regex(/^\+\d{1,5}$/),
  phone: z.string().trim().min(4).max(30),
  note: z.string().trim().max(1000).optional(),
  /** Guest ticked "save my details": an account is made for this email after payment. */
  register: z.boolean().optional(),
});

export const intentRequestSchema = z.strictObject({
  items: z.array(cartLineSchema).min(1).max(20),
  /** The shipping country, sent as soon as it is chosen so the shipping line can follow it. */
  country: z.string().trim().min(1).max(100).optional(),
  /** A discount code as typed; the server decides what, if anything, it is worth. */
  discountCode: z.string().trim().max(40).optional(),
  /** Absent while the cart is being quoted; present when the customer confirms. */
  customer: customerSchema.optional(),
  /** Reuse an existing PaymentIntent rather than creating a fresh one on every cart change. */
  paymentIntentId: z.string().regex(/^pi_[A-Za-z0-9]+$/).optional(),
});

export type IntentRequest = z.infer<typeof intentRequestSchema>;
export type Customer = z.infer<typeof customerSchema>;

export type QuotedLine = { id: string; name: string; quantity: number; unitPriceOre: number; size?: string; measurements?: { label: string; value: string }[] };

export type IntentResponse = {
  clientSecret: string;
  paymentIntentId: string;
  totals: Totals;
  lines: QuotedLine[];
  /** Why the code the customer typed was not applied, if it wasn't. */
  discountError?: string;
  /** For a signed-in customer: lets Stripe's form show and save their cards. Created per intent. */
  customerSessionClientSecret?: string;
};
