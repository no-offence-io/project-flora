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
 * See the matcher below, which also lets static assets through so this page can render at all.
 */
export function proxy(request: NextRequest) {
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
    "/((?!_next/static|_next/image|favicon.ico|\\.well-known|api/webhooks|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|mp4|ico|woff|woff2|otf|ttf)$).*)",
  ],
};
