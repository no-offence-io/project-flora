import { createClient } from "next-sanity";
import { apiVersion, dataset, projectId } from "./env";

export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  // Served from Sanity's CDN. Live updates come from sanityFetch in ./live, not from bypassing this.
  useCdn: true,
});
