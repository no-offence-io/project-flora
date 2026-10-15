import "server-only";
import { redirect } from "next/navigation";
import { auth, authConfigured, isAdminEmail } from "@/auth";

export type Admin = { email: string; name: string | null };

/**
 * The one gate every admin page and action passes through. It re-checks the allowlist on each
 * request rather than trusting the session alone, so removing an address from ADMIN_EMAILS locks
 * that person out immediately even if their cookie is still valid.
 */
export async function requireAdmin(): Promise<Admin> {
  if (!authConfigured) redirect("/admin/login");
  const session = await auth();
  const email = session?.user?.email;
  if (!email || !isAdminEmail(email)) redirect("/admin/login");
  return { email, name: session.user?.name ?? null };
}
