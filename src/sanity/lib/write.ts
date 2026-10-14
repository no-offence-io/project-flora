import "server-only";
import { createClient } from "next-sanity";
import { apiVersion, dataset, projectId } from "./env";

/**
 * The one client allowed to change content. Guarded by `server-only`, so importing it from any
 * client component fails the build rather than leaking the token. Used by the Stripe webhook to
 * record orders; nothing in the request path of a page should ever need it.
 */
export function getWriteClient() {
  const token = process.env.SANITY_TOKEN;
  if (!token) throw new Error("SANITY_TOKEN is not set. It is required to record orders in Sanity.");
  return createClient({ projectId, dataset, apiVersion, token, useCdn: false });
}
