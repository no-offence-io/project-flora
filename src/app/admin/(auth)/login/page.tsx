import Image from "next/image";
import { redirect } from "next/navigation";
import { auth, authConfigured, isAdminEmail, signIn } from "@/auth";
import { Button, Muted } from "@/components/admin/ui";
import { getLogoSrc } from "@/lib/brand";

export const metadata = { title: "Sign in – Flöra admin", robots: { index: false, follow: false } };

/**
 * One button. Google proves the identity; the allowlist in ADMIN_EMAILS decides who gets in. A
 * refused account lands back here with `?error=AccessDenied`.
 */
export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const logo = await getLogoSrc();
  const session = authConfigured ? await auth() : null;
  if (isAdminEmail(session?.user?.email)) redirect("/admin");
  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-[42px] px-[24px] py-[60px] text-black">
      <Image src={logo} alt="Flöra" width={486.544} height={109.193} className="h-auto w-[172px] invert" style={{ height: "auto" }} />
      <div className="flex w-full max-w-[360px] flex-col gap-[24px] md:border-[0.5px] md:border-black/25 md:p-[24px]">
        <div className="flex flex-col gap-[12px]">
          <h1 className="m-0 font-gotham text-paragraph text-black">Admin</h1>
          <Muted>Sign in with the Google account that has been given access.</Muted>
        </div>
        {error && (
          <p className="m-0 font-gotham text-paragraph text-[#b00020]" role="alert">
            {error === "AccessDenied" ? "That Google account isn't on the access list." : "Sign-in didn't complete. Please try again."}
          </p>
        )}
        {!authConfigured ? (
          <p className="m-0 font-gotham text-paragraph text-black/50">Sign-in isn&apos;t set up on this server yet (AUTH_SECRET and the Google client are missing).</p>
        ) : (
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/admin" });
            }}
          >
            <Button>Sign in with Google</Button>
          </form>
        )}
        {process.env.NODE_ENV === "development" && (
          <form
            action={async () => {
              "use server";
              await signIn("preview", { redirectTo: "/admin" });
            }}
          >
            <button type="submit" className="w-full font-gotham text-paragraph text-black/50 underline hover:text-black transition-colors">
              Preview sign-in (local only)
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
