import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

/** True once the server has what Auth.js needs. Pages check this before calling auth() so a
 * deployment without the variables shows a plain message instead of a 500. */
export const authConfigured = Boolean(process.env.AUTH_SECRET);

/** Emails allowed into /admin. Everyone else is refused at sign-in, before a session exists. */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const allowed = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.toLowerCase());
}

/**
 * Admin sign-in. Google only, no passwords anywhere in this codebase: Google proves who the person
 * is, and the allowlist decides whether they get in. Sessions are signed JWTs in an httpOnly cookie
 * (AUTH_SECRET); nothing is stored server-side, so there is no session table to protect.
 */
/**
 * Local-only preview sign-in. Exists so the screens can be looked at on localhost before Google
 * credentials are set up; it signs you in as the first allowlisted address with no password. The
 * guard is NODE_ENV, which Next sets to "production" for every deployed build, so this provider is
 * not part of the deployed app at all — not hidden, absent.
 */
const previewProvider =
  process.env.NODE_ENV === "development"
    ? [
        Credentials({
          id: "preview",
          name: "Preview (local only)",
          credentials: {},
          authorize: () => {
            const email = (process.env.ADMIN_EMAILS ?? "").split(",")[0]?.trim();
            return email ? { id: "preview", email, name: "Preview" } : null;
          },
        }),
      ]
    : [];

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google, ...previewProvider],
  trustHost: true,
  pages: { signIn: "/admin/login", error: "/admin/login" },
  callbacks: {
    signIn({ account, profile }) {
      if (account?.provider === "preview") return process.env.NODE_ENV === "development";
      if (account?.provider !== "google") return false;
      // Google vouches for the address only when email_verified is true; an unverified Google
      // account could otherwise claim any address.
      return Boolean(profile?.email_verified) && isAdminEmail(profile?.email);
    },
  },
});
