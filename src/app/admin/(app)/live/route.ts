import { auth, isAdminEmail } from "@/auth";
import { getLive, readablePropertyId } from "@/lib/admin/analytics";

/*
 * Who is on the site this minute, as JSON, for the dashboard's live panel to ask every few
 * seconds. Admins only: this is a data endpoint, so a missing session is a 401 for the panel to
 * read, not a redirect to the sign-in page. Never cached.
 */
const headers = { "Cache-Control": "no-store, max-age=0" };

export async function GET() {
  const session = await auth();
  if (!isAdminEmail(session?.user?.email)) return Response.json({ error: "signed-out" }, { status: 401, headers });
  const propertyId = await readablePropertyId();
  if (!propertyId) return Response.json({ error: "not-connected" }, { status: 200, headers });
  try {
    return Response.json(await getLive(propertyId), { headers });
  } catch (err) {
    return Response.json({ error: "analytics", message: err instanceof Error ? err.message.slice(0, 300) : "Google Analytics returned an error" }, { status: 200, headers });
  }
}
