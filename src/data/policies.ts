import type { DropdownListItem } from "@/components/dropdown-list";

export type PolicyPage = {
  slug: string;
  title: string;
  intro: string;
  items: DropdownListItem[];
};

/** Footer policy pages. Copy is placeholder until the real text is written. */
export const POLICY_PAGES: PolicyPage[] = [
  {
    slug: "terms",
    title: "Terms",
    intro: "The terms that apply when you shop with Flöra. They cover how orders are placed, paid for and fulfilled, and what you can expect from us.",
    items: [
      { title: "Orders", content: "An order is confirmed once you receive our confirmation e-mail. We may cancel orders that cannot be fulfilled and will refund you in full." },
      { title: "Prices & payment", content: "All prices are shown including VAT. Payment is taken when the order is placed through the methods shown at checkout." },
      { title: "Pre-orders", content: "Pre-ordered garments ship on the date shown on the product page. We will let you know if that date changes." },
      { title: "Contact", content: "Questions about these terms can be sent to hello@projectflora.net." },
    ],
  },
  {
    slug: "refunds-and-exchange",
    title: "Refunds & Exchange",
    intro: "We want every piece to feel right. If it doesn't, you can return or exchange it within 14 days of delivery.",
    items: [
      { title: "How to return", content: "Start a return by e-mailing us with your order number. We will send a return label and instructions." },
      { title: "Condition of items", content: "Garments must be unworn, unwashed and returned with all tags attached." },
      { title: "Refunds", content: "Refunds are issued to the original payment method within 10 working days of receiving the return." },
      { title: "Exchanges", content: "Exchanges for another size or colour are free within Norway. Tell us what you would like when you start the return." },
    ],
  },
  {
    slug: "privacy",
    title: "Privacy",
    intro: "How we handle your personal data when you visit the site, sign up for updates or place an order.",
    items: [
      { title: "What we collect", content: "Your name, contact details, delivery address and order history, plus anonymous usage data from the site." },
      { title: "How we use it", content: "To process orders, provide support, and, if you have opted in, to send you news about new garments." },
      { title: "Sharing", content: "Data is shared only with the services we need to run the shop, such as payment and delivery providers." },
      { title: "Your rights", content: "You can ask to see, correct or delete your data at any time by contacting us." },
    ],
  },
  {
    slug: "shipping",
    title: "Shipping",
    intro: "Where we ship, how long it takes and what it costs.",
    items: [
      { title: "Destinations", content: "We ship within Norway and to the rest of Europe. Other destinations are coming." },
      { title: "Delivery time", content: "Orders ship within two working days. Delivery takes 2–5 working days in Norway and 5–10 days elsewhere in Europe." },
      { title: "Cost", content: "Shipping is calculated at checkout based on your address. Orders over 1500 NOK ship free within Norway." },
      { title: "Tracking", content: "You will receive a tracking link by e-mail as soon as your parcel is on its way." },
    ],
  },
];

export function getPolicyPage(slug: string) {
  return POLICY_PAGES.find((page) => page.slug === slug);
}
