import { defineLive } from "next-sanity/live";
import { client } from "./client";

/**
 * Live Content API: `sanityFetch` for reads, `<SanityLive />` in the root layout to subscribe.
 * Together they keep published content current without manual revalidation.
 *
 * Tokens are explicitly off. They are only needed for draft mode and Visual Editing, which aren't
 * set up yet — and `browserToken` is shipped to every visitor, so when that day comes it must be a
 * separate Viewer-role token. Never SANITY_TOKEN: that one can write and delete, and is used only
 * server-side (see src/sanity/lib/write.ts).
 */
export const { sanityFetch, SanityLive } = defineLive({
  client,
  serverToken: false,
  browserToken: false,
});
