import "server-only";
import type { Customer } from "./checkout-schema";
import type { CartQuote } from "./orders";
import { quoteToMetadata } from "./order-metadata";
import { deviceFrom, originLabel, type Visit } from "./visit-shared";

/**
 * Everything the order record will need later, as flat strings: the quoted lines and prices, the
 * customer as typed, and where the visit came from. The same shape rides on a Stripe PaymentIntent
 * and sits in a Vipps payment document, so one order recorder serves both.
 */
export function checkoutMetadata(input: { quote: CartQuote; lang: string; country?: string; customer?: Customer; visit?: Visit; userAgent: string | null; account?: { _id: string } | null }): Record<string, string> {
  const { customer, visit, account } = input;
  const metadata = quoteToMetadata(input.quote, { lang: input.lang, country: input.country });
  if (account) metadata.account = account._id;
  if (!customer) return metadata;
  metadata.customer_street = customer.street.slice(0, 200);
  if (customer.apartment) metadata.customer_apartment = customer.apartment.slice(0, 200);
  metadata.customer_postcode = customer.postcode;
  metadata.customer_city = customer.city;
  metadata.customer_country = customer.country;
  metadata.customer_first = customer.firstName;
  metadata.customer_last = customer.lastName;
  metadata.customer_prefix = customer.phonePrefix;
  metadata.customer_phone_only = customer.phone;
  if (customer.register && !account) metadata.register = "1";
  metadata.customer_email = customer.email;
  metadata.customer_name = `${customer.firstName} ${customer.lastName}`;
  metadata.customer_phone = `${customer.phonePrefix} ${customer.phone}`;
  metadata.customer_address = [customer.street, customer.apartment, `${customer.postcode} ${customer.city}`, customer.country]
    .filter(Boolean)
    .join(", ")
    .slice(0, 500);
  if (customer.note) metadata.customer_note = customer.note.slice(0, 500);
  // Where they came from, for the dashboard. The label is decided here, not by the browser.
  metadata.visit = JSON.stringify({
    l: originLabel(visit),
    d: deviceFrom(input.userAgent),
    ...(visit?.views ? { v: visit.views } : {}),
    ...(visit?.landing ? { p: visit.landing } : {}),
    ...(visit?.referrer ? { r: visit.referrer } : {}),
    ...(visit?.campaign ? { c: visit.campaign } : {}),
  }).slice(0, 500);
  return metadata;
}
