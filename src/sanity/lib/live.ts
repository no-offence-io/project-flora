import { defineLive } from "next-sanity/live";
import { client } from "./client";

/**
 * Live Content API: `sanityFetch` for reads, `<SanityLive />` in the root layout to subscribe.
 * Together they keep published content current without manual revalidation.
 *
 * The tokens are optional and only needed for draft mode and Visual Editing, which aren't set up
 * yet. SANITY_API_READ_TOKEN is a real secret: server-side only, never NEXT_PUBLIC_.
 */
export const { sanityFetch, SanityLive } = defineLive({
  client,
  serverToken: process.env.SANITY_API_READ_TOKEN,
  browserToken: process.env.SANITY_API_READ_TOKEN,
});
