import { Heading, Muted, Row } from "@/components/admin/ui";

const PAGES = [
  { href: "/admin/pages/front-page", title: "Front page", sub: "Top video, products title, the Values section" },
  { href: "/admin/pages/about", title: "About", sub: "Photo, title and text" },
  { href: "/admin/pages/vintage", title: "Vintage", sub: "Intro for the vintage page" },
  { href: "/admin/pages/faq", title: "FAQ", sub: "Questions and answers" },
  { href: "/admin/pages/policies/terms", title: "Terms", sub: "Policy page" },
  { href: "/admin/pages/policies/refunds-and-exchange", title: "Refunds & exchange", sub: "Policy page" },
  { href: "/admin/pages/policies/privacy", title: "Privacy", sub: "Policy page" },
  { href: "/admin/pages/policies/shipping", title: "Shipping", sub: "Policy page" },
];

export default function PagesIndex() {
  return (
    <>
      <div className="flex flex-col gap-[12px]">
        <Heading>Pages</Heading>
        <Muted>Every text on the site, in English and Norsk.</Muted>
      </div>
      <div className="flex flex-col gap-[12px] md:max-w-[640px]">
        {PAGES.map((p) => (
          <Row key={p.href} href={p.href}>
            <span className="flex-1">{p.title}</span>
            <span className="text-[11px] text-black/50">{p.sub}</span>
          </Row>
        ))}
      </div>
    </>
  );
}
