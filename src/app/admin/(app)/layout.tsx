import type { ReactNode } from "react";
import { headers } from "next/headers";
import AdminNav from "@/components/admin/nav";
import { requireAdmin } from "@/lib/admin/session";

export const metadata = { robots: { index: false, follow: false } };

/** Every page under here is behind requireAdmin(); the login page lives in a sibling group. */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const admin = await requireAdmin();
  const path = (await headers()).get("x-admin-path") ?? "";
  return (
    <div className="flex min-h-screen flex-col gap-[42px] pb-[60px] md:gap-[60px] md:pb-[120px]">
      <AdminNav current={sectionOf(path)} email={admin.email} />
      <main className="flex flex-col gap-[42px] px-[24px] md:px-[42px]">{children}</main>
    </div>
  );
}

function sectionOf(path: string): string {
  for (const s of ["/admin/orders", "/admin/products", "/admin/pages", "/admin/media", "/admin/settings"]) if (path.startsWith(s)) return s;
  return "/admin";
}
