import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** Name of the cookie that marks a browser as allowed past the gate. */
const PREVIEW_COOKIE = "flora-preview";

/**
 * Holds the whole site behind the coming-soon page until launch.
 *
 * Switched on by `COMING_SOON=true`; set it to anything else (or remove it) to open the site. To
 * look at the real site while it's closed, visit any URL with `?preview=<PREVIEW_TOKEN>` — that
 * swaps the token for a cookie and drops the token from the address bar, so the link can be shared
 * with the client without the token ending up in their browser history or screenshots.
 *
 * Two paths are deliberately never gated, and both matter:
 *   - `/api/webhooks/stripe`, which Stripe itself calls and which is the only thing that records an
 *     order. Blocking it would lose orders taken during a preview.
 *   - `/.well-known/…`, which Apple fetches to verify the domain for Apple Pay. Blocking it breaks
 *     the wallet buttons on this domain.
 *   - `/admin` and `/api/auth`, so the dashboard works while the shop is closed. It has its own login.
 *   - `/api/revalidate`, which Sanity calls after a publish; it has its own secret.
 * See the matcher below, which also lets static assets through so this page can render at all.
 */
export function proxy(request: NextRequest) {
  // The admin is never gated; it has its own login.
  if (request.nextUrl.pathname.startsWith("/admin")) return NextResponse.next();
  if (process.env.COMING_SOON !== "true") return NextResponse.next();

  const token = process.env.PREVIEW_TOKEN;
  const offered = request.nextUrl.searchParams.get("preview");

  // Trading the token for a cookie, then redirecting to the same URL without it.
  if (token && offered === token) {
    const clean = request.nextUrl.clone();
    clean.searchParams.delete("preview");
    const response = NextResponse.redirect(clean);
    response.cookies.set(PREVIEW_COOKIE, token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return response;
  }

  if (token && request.cookies.get(PREVIEW_COOKIE)?.value === token) return NextResponse.next();

  // A rewrite, not a redirect: every URL keeps its address and simply renders the placeholder,
  // so nothing about the real site's structure is revealed.
  return NextResponse.rewrite(new URL("/coming-soon", request.url));
}

export const config = {
  matcher: [
    // `api/auth` stays reachable while the shop is hidden; `/admin` is handled at the top of proxy().
    // robots, the sitemap and the share image answer for themselves (robots says "disallow all"
    // while the gate is up), so crawlers never see the placeholder page as those files. The icon
    // routes (icon0, icon1, apple-icon, pwa-icon, manifest) are pictures, not pages: let through too.
    "/((?!_next/static|_next/image|favicon.ico|\\.well-known|api/webhooks|api/auth|api/revalidate|robots.txt|sitemap.xml|opengraph-image|icon0|icon1|apple-icon|pwa-icon|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|mp4|ico|woff|woff2|otf|ttf)$).*)",
  ],
};
