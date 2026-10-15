import type { ReactNode } from "react";
import Link from "next/link";
import Navbar from "@/components/navbar";
import { auth, authConfigured } from "@/auth";

const LINKS = [
  { label: "Overview", href: "/account" },
  { label: "My measurements", href: "/account/measurements" },
  { label: "Orders", href: "/account/orders" },
];

/** Customer account pages: the shop's navbar, a steps-style sub-navigation, and the content. */
export default async function AccountLayout({ children }: { children: ReactNode }) {
  const session = authConfigured ? await auth() : null;
  return (
    <div className="flex flex-col gap-[60px] pb-[60px] md:gap-[120px] md:pb-[120px]">
      <div className="flex flex-col gap-[24px] md:gap-[42px]">
        <Navbar tone="dark" />
        <div className="flex flex-col gap-[42px] px-[24px] pb-[24px] md:px-[42px] md:pb-[42px]">
          {session?.user && (
            <p className="m-0 font-gotham text-paragraph text-black">
              {LINKS.map((l, i) => (
                <span key={l.href}>
                  <Link href={l.href} className="hover:opacity-70 transition-opacity">
                    {l.label}
                  </Link>
                  {i < LINKS.length - 1 && " – "}
                </span>
              ))}
            </p>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}
