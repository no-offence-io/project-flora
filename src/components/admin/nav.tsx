import Image from "next/image";
import Link from "next/link";
import { signOut } from "@/auth";

const LINKS = [
  { label: "Dashboard", href: "/admin" },
  { label: "Orders", href: "/admin/orders" },
  { label: "Products", href: "/admin/products" },
  { label: "Codes", href: "/admin/discounts" },
  { label: "Pages", href: "/admin/pages" },
  { label: "Media", href: "/admin/media" },
  { label: "Settings", href: "/admin/settings" },
  { label: "Setup", href: "/admin/setup" },
];

/**
 * The shop's navbar, reduced: wordmark left, the section links as the checkout-steps line (current
 * one black, the rest 50% black), and sign-out where the cart link would be.
 */
export default function AdminNav({ current, email }: { current: string; email: string }) {
  return (
    <header className="flex flex-col gap-[24px] px-[24px] pt-[24px] text-black md:flex-row md:items-center md:justify-between md:px-[42px] md:py-[12px]">
      <Link href="/admin" aria-label="Flöra admin">
        <Image src="/footer/flora-logo.svg" alt="Flöra" width={486.544} height={109.193} className="h-[20px] w-[89px] invert" />
      </Link>
      <nav aria-label="Admin" className="font-gotham text-paragraph whitespace-nowrap">
        {LINKS.map((link, i) => (
          <span key={link.href}>
            <Link href={link.href} aria-current={link.href === current ? "page" : undefined} className={`hover:opacity-70 transition-opacity ${link.href === current ? "text-black" : "text-black/50"}`}>
              {link.label}
            </Link>
            {i < LINKS.length - 1 && " – "}
          </span>
        ))}
      </nav>
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/admin/login" });
        }}
        className="flex items-center gap-[12px] font-gotham text-paragraph"
      >
        <span className="text-black/50">{email}</span>
        <button type="submit" className="text-black underline hover:opacity-70 transition-opacity">
          Sign out
        </button>
      </form>
    </header>
  );
}
