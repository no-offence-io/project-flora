import { defineLive } from "next-sanity/live";
import { client } from "./client";

/**
 * Live Content API: `sanityFetch` for reads, `<SanityLive />` in the layout to subscribe.
 *
 * The server reads with the read token (the dataset is private; it holds orders and customers).
 * `browserToken` stays off: it would be shipped to every visitor and open the private documents
 * to them. Without it the browser can't subscribe to a private dataset, so edits reach the site
 * through the publish webhook (/api/revalidate) instead of live.
 */
const serverToken = process.env.SANITY_READ_TOKEN || process.env.SANITY_TOKEN || false;

export const { sanityFetch, SanityLive } = defineLive({
  client,
  serverToken,
  browserToken: false,
});
