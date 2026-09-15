/**
 * Sanity connection details. The project id and dataset are public identifiers — they appear in
 * every request the browser makes — so they live in NEXT_PUBLIC_ vars. No secret belongs here.
 */

function required(value: string | undefined, name: string): string {
  if (!value) throw new Error(`${name} is not set. Copy .env.example to .env.local.`);
  return value;
}

export const projectId = required(process.env.NEXT_PUBLIC_SANITY_PROJECT_ID, "NEXT_PUBLIC_SANITY_PROJECT_ID");
export const dataset = required(process.env.NEXT_PUBLIC_SANITY_DATASET, "NEXT_PUBLIC_SANITY_DATASET");

/**
 * Pinned date, not "latest": the API behaves the way it did on this date, so a future Sanity change
 * can't alter query results under a deployed site. Bump it deliberately.
 */
export const apiVersion = "2026-02-01";
