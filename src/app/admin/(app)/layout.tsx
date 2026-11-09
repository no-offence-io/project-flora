import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { signOut } from "@/auth";
import AdminNav from "@/components/admin/nav";
import { GROUPS } from "@/components/admin/nav-links";
import { requireAdmin } from "@/lib/admin/session";
import { getLogoSrc } from "@/lib/brand";
import { unreadCount } from "@/lib/notices";
import { isDemoOn } from "@/lib/admin/demo";
import { adminClient } from "@/lib/admin/sanity";
import { toggleDemoMode } from "./actions";
import PageTransition from "@/components/page-transition";

export const metadata = { robots: { index: false, follow: false } };

/** The browser's own bars follow the device setting; a pinned choice is set by the sidebar switch. */
export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#000000" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

/** Vintage pieces shown with the turning 3D card; with none, the "Vintage card" tool has nothing to set up and leaves the sidebar. */
async function countCardPieces(): Promise<number> {
  try {
    return await adminClient().fetch<number>(`count(*[_type == "product" && vintage == true && vintageLayout != "plain"])`);
  } catch {
    return 1;
  }
}

/** Every page under here is behind requireAdmin(); the login page lives in a sibling group. */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const admin = await requireAdmin();
  const [unread, logo, demo, jar, cardPieces] = await Promise.all([unreadCount(), getLogoSrc(), isDemoOn(), cookies(), countCardPieces()]);
  // "1" on, "0" off, anything else follows the device setting.
  const nightPref = jar.get("flora-admin-night")?.value;
  const night: "on" | "off" | "auto" = nightPref === "1" ? "on" : nightPref === "0" ? "off" : "auto";
  async function doSignOut() {
    "use server";
    await signOut({ redirectTo: "/admin/login" });
  }
  return (
    <>
    <div data-admin-root className={`flex min-h-screen flex-col md:flex-row ${night === "on" ? "admin-night" : night === "auto" ? "admin-night-auto" : ""}`}>
      <AdminNav email={admin.email} unread={unread} logo={logo} signOut={doSignOut} demo={demo} toggleDemo={toggleDemoMode} night={night} hidden={cardPieces > 0 ? [] : ["/admin/vintage-card"]} />
      <main className="flex min-w-0 flex-1 flex-col gap-[42px] overflow-x-hidden px-[24px] py-[42px] pb-[60px] md:px-[42px] md:pb-[120px]">
        {demo && (
          <p className="m-0 border-[0.5px] border-black px-[12px] py-[8px] font-gotham text-[11px] leading-normal tracking-[0.2em] uppercase text-black">
            Test mode — the orders, subscribers and notifications here are made up. Switch it off in the menu to remove them.
          </p>
        )}
        {children}
      </main>
    </div>
    {/* Outside the wrapper: night mode's filter there would pin "fixed" to the wrapper, not the screen. */}
    <PageTransition area="admin" />
    </>
  );
}

