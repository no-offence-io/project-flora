import { redirect } from "next/navigation";
import { auth, authConfigured, signIn } from "@/auth";

export const metadata = { title: "Sign in – Flöra" };

/** Customer sign-in. Same Google login as the admin; the allowlist only applies to /admin. */
export default async function AccountLoginPage() {
  if (authConfigured && (await auth())?.user) redirect("/account");
  return (
    <div className="flex flex-col gap-[24px] md:max-w-[521px]">
      <h1 className="m-0 font-americana text-big-header-mobile capitalize text-black md:text-big-header-desktop">Your account</h1>
      <p className="m-0 font-gotham text-paragraph text-black/70">
        Save your measurements once and we&apos;ll fill them in for you at checkout. See what you&apos;ve ordered and where it is.
      </p>
      {!authConfigured ? (
        <p className="m-0 font-gotham text-paragraph text-black/50">Accounts aren&apos;t switched on yet.</p>
      ) : (
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/account" });
          }}
        >
          <button type="submit" className="flex w-full items-center justify-center bg-black p-[12px] font-gotham text-paragraph text-white hover:opacity-80 transition-opacity">
            Continue with Google
          </button>
        </form>
      )}
      {process.env.NODE_ENV === "development" && (
        <form
          action={async () => {
            "use server";
            await signIn("preview", { redirectTo: "/account" });
          }}
        >
          <button type="submit" className="font-gotham text-paragraph text-black/50 underline hover:text-black transition-colors">
            Preview sign-in (local only)
          </button>
        </form>
      )}
      <p className="m-0 font-gotham text-paragraph text-black/50">
        We only store what you give us here. You can delete your account at any time from the overview.
      </p>
    </div>
  );
}
