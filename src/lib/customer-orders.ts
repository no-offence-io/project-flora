import "server-only";
import { getWriteClient } from "@/sanity/lib/write";

export type CustomerOrder = {
  _id: string;
  orderNumber: string;
  status: string;
  orderedAt: string;
  trackingNumber?: string;
  totalOre: number;
  subtotalOre?: number;
  shippingOre?: number;
  discountOre?: number;
  vatIncludedOre?: number;
  items: { name: string; quantity: number; unitPriceOre: number; size?: string; colour?: string; image?: string; measurements: { label: string; value: string }[] }[];
  address?: string;
};

const FIELDS = `_id, orderNumber, status, orderedAt, trackingNumber, totalOre, subtotalOre, shippingOre, discountOre, vatIncludedOre, "address": customer.address,
  "items": items[]{ name, quantity, unitPriceOre, size, colour, "image": product->images[0].asset->url, "measurements": coalesce(measurements[]{ label, value }, []) }`;

/** Only ever called with the signed-in session's email — never an email from a request. */
export async function ordersFor(email: string): Promise<CustomerOrder[]> {
  return getWriteClient().fetch<CustomerOrder[]>(`*[_type == "order" && demo != true && lower(customer.email) == $email] | order(orderedAt desc)[0...100]{ ${FIELDS} }`, { email: email.toLowerCase() });
}

export async function orderFor(email: string, orderNumber: string): Promise<CustomerOrder | null> {
  return getWriteClient().fetch<CustomerOrder | null>(`*[_type == "order" && demo != true && lower(customer.email) == $email && orderNumber == $orderNumber][0]{ ${FIELDS} }`, { email: email.toLowerCase(), orderNumber });
}
