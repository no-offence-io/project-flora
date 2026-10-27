import "server-only";
import { createClient } from "next-sanity";
import { apiVersion, dataset, projectId } from "./env";

/**
 * The storefront's read client. Server-only, because it carries a token: the dataset holds orders,
 * customers and subscribers, so it is meant to be private, and every read goes through here with
 * a token. SANITY_READ_TOKEN (a Viewer-role token) is preferred; SANITY_TOKEN works as a fallback.
 * Neither ever reaches the browser — see live.ts, where browserToken stays off.
 */
const token = process.env.SANITY_READ_TOKEN || process.env.SANITY_TOKEN || undefined;

export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  token,
  // Authenticated reads skip the CDN; the Data Cache and tag revalidation do the caching instead.
  useCdn: !token,
  perspective: "published",
});
