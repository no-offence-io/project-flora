"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import RolloverText from "./rollover-text";

/** The checkout-steps line: current page black, the rest at 50%. */
export default function AccountNav({ links }: { links: { label: string; href: string }[] }) {
  const path = usePathname();
  const current = links.filter((l) => path === l.href || (l.href !== "/account" && path.startsWith(`${l.href}/`))).pop()?.href ?? "/account";
  return (
    <nav aria-label="My page" className="m-0 font-gotham text-paragraph leading-[2]">
      {links.map((l, i) => (
        <span key={l.href}>
          <Link href={l.href} aria-current={l.href === current ? "page" : undefined} className={l.href === current ? "text-black" : "text-black/50"}>
            <RolloverText text={l.label} />
          </Link>
          {i < links.length - 1 && <span className="text-black/50"> – </span>}
        </span>
      ))}
    </nav>
  );
}
