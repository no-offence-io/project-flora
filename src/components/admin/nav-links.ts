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
      { label: "Icon", href: "/admin/icon" },
      { label: "Page transitions", href: "/admin/transitions" },
      { label: "Vintage card", href: "/admin/vintage-card" },
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


/** The sidebar entry a path belongs to: the longest matching link. */
export function sectionOf(path: string): string {
  const hrefs = GROUPS.flatMap((g) => g.links.map((l) => l.href)).filter((h) => h !== "/admin");
  const match = hrefs.filter((h) => path === h || path.startsWith(`${h}/`)).sort((a, b) => b.length - a.length)[0];
  return match ?? "/admin";
}
