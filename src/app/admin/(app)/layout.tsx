import type { ReactNode } from "react";
import { headers } from "next/headers";
import { signOut } from "@/auth";
import AdminNav from "@/components/admin/nav";
import { GROUPS } from "@/components/admin/nav-links";
import { requireAdmin } from "@/lib/admin/session";
import { getLogoSrc } from "@/lib/brand";
import { unreadCount } from "@/lib/notices";
import { isDemoOn } from "@/lib/admin/demo";
import { toggleDemoMode } from "./actions";

export const metadata = { robots: { index: false, follow: false } };

/** Every page under here is behind requireAdmin(); the login page lives in a sibling group. */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const admin = await requireAdmin();
  const [path, unread, logo, demo] = await Promise.all([headers().then((h) => h.get("x-admin-path") ?? ""), unreadCount(), getLogoSrc(), isDemoOn()]);
  async function doSignOut() {
    "use server";
    await signOut({ redirectTo: "/admin/login" });
  }
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <AdminNav current={sectionOf(path)} email={admin.email} unread={unread} logo={logo} signOut={doSignOut} demo={demo} toggleDemo={toggleDemoMode} />
      <main className="flex min-w-0 flex-1 flex-col gap-[42px] overflow-x-hidden px-[24px] py-[42px] pb-[60px] md:px-[42px] md:pb-[120px]">
        {demo && (
          <p className="m-0 border-[0.5px] border-black px-[12px] py-[8px] font-gotham text-[11px] leading-normal tracking-[0.2em] uppercase text-black">
            Test mode — the orders, subscribers and notifications here are made up. Switch it off in the menu to remove them.
          </p>
        )}
        {children}
      </main>
    </div>
  );
}

/** The sidebar entry a path belongs to: the longest matching link. */
function sectionOf(path: string): string {
  const hrefs = GROUPS.flatMap((g) => g.links.map((l) => l.href)).filter((h) => h !== "/admin");
  const match = hrefs.filter((h) => path === h || path.startsWith(`${h}/`)).sort((a, b) => b.length - a.length)[0];
  return match ?? "/admin";
}
