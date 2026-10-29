/* The admin's sections, shared by the sidebar (a client component) and the layout (a server component). */
export const GROUPS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Sell",
    links: [
      { label: "Dashboard", href: "/admin" },
      { label: "Orders", href: "/admin/orders" },
      { label: "Customers", href: "/admin/customers" },
      { label: "Visits", href: "/admin/visits" },
      { label: "Payments", href: "/admin/payments" },
      { label: "Products", href: "/admin/products" },
      { label: "Discount codes", href: "/admin/discounts" },
    ],
  },
  {
    title: "Talk",
    links: [
      { label: "Newsletters", href: "/admin/newsletters" },
      { label: "Journal", href: "/admin/journal" },
      { label: "Subscribers", href: "/admin/subscribers" },
    ],
  },
  {
    title: "Site",
    links: [
      { label: "Pages", href: "/admin/pages" },
      { label: "Media", href: "/admin/media" },
      { label: "Settings & brand", href: "/admin/settings" },
    ],
  },
  {
    title: "System",
    links: [
      { label: "Notifications", href: "/admin/notifications" },
      { label: "Setup", href: "/admin/setup" },
    ],
  },
];

