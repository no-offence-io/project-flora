#!/usr/bin/env node
/*
 * Moves private documents to ids that anonymous readers cannot fetch.
 *
 * Sanity serves a document without a token only when its id has no dot in it. Orders, customers,
 * subscribers, discount codes, Vipps payments, newsletters and the dashboard's notes used to have
 * ids like `order-pi_123`; the app now writes `order.pi_123` (see src/lib/doc-ids.ts). This copies
 * each old document to its new id and deletes the old one, in one transaction per document, and
 * rewrites any stored mention of an old id. Sanity cannot rename a document, hence copy and delete.
 *
 *   node scripts/private-ids.mjs                      what would change (nothing is written)
 *   node scripts/private-ids.mjs --apply --backup <file.json>
 *
 * --backup is required with --apply: every document is written to that file first. Keep it out of
 * the repository; it holds customer data. Safe to run again: documents already moved are skipped.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
try { process.loadEnvFile(path.join(ROOT, ".env.local")); } catch { /* use the environment */ }

const project = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
const token = process.env.SANITY_TOKEN;
if (!project || !token) { console.error("Set NEXT_PUBLIC_SANITY_PROJECT_ID and SANITY_TOKEN (a token that can write)."); process.exit(1); }

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const backup = args.includes("--backup") ? args[args.indexOf("--backup") + 1] : null;
if (apply && !backup) { console.error("--apply needs --backup <file.json>."); process.exit(1); }

/** Private kinds and the prefix their old ids carried. */
const KINDS = {
  order: "order",
  vippsPayment: "vipps",
  customer: "customer",
  subscriber: "subscriber",
  notification: "notification",
  rateLimit: "ratelimit",
  pushSubscription: "pushSubscription",
  discount: "discount",
  newsletter: "newsletter",
};

const api = `https://${project}.api.sanity.io/v2024-01-01`;
const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

async function query(groq, auth = true) {
  const res = await fetch(`${api}/data/query/${dataset}?perspective=raw&query=${encodeURIComponent(groq)}`, auth ? { headers } : {});
  if (!res.ok) throw new Error(`Sanity answered ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()).result;
}

const newIdFor = (doc) => {
  const draft = doc._id.startsWith("drafts.");
  const id = draft ? doc._id.slice(7) : doc._id;
  if (id.includes(".")) return null; // already private
  const prefix = KINDS[doc._type];
  const rest = id.startsWith(`${prefix}-`) ? id.slice(prefix.length + 1) : id;
  return `${draft ? "drafts." : ""}${prefix}.${rest}`;
};

const types = Object.keys(KINDS);
const docs = await query(`*[_type in ${JSON.stringify(types)}]`);
const moves = docs.map((d) => ({ doc: d, to: newIdFor(d) })).filter((m) => m.to);
console.log(`${docs.length} private documents, ${moves.length} still at a public id.`);
if (!moves.length) process.exit(0);

// Whole ids only: `vipps-fl-1` must not be rewritten inside `order.vipps-fl-1`, nor `order-demo-1` inside `order-demo-10`.
const renames = moves.map((m) => [m.doc._id, m.to]).sort((a, b) => b[0].length - a[0].length);
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const rewrite = (value) => {
  let json = JSON.stringify(value);
  for (const [from, to] of renames) json = json.replace(new RegExp(`(?<![A-Za-z0-9_.-])${esc(from)}(?![A-Za-z0-9_-])`, "g"), to);
  return JSON.parse(json);
};

for (const m of moves) console.log(`  ${m.doc._type.padEnd(16)} ${m.doc._id}  →  ${m.to}`);
if (!apply) { console.log("\nNothing written. Run again with --apply --backup <file.json>."); process.exit(0); }

fs.writeFileSync(backup, JSON.stringify(docs, null, 2));
console.log(`\nBackup of all ${docs.length} documents: ${backup}`);

let moved = 0;
for (const m of moves) {
  const { _rev, _updatedAt, ...rest } = m.doc;
  const copy = { ...rewrite(rest), _id: m.to };
  const res = await fetch(`${api}/data/mutate/${dataset}`, { method: "POST", headers, body: JSON.stringify({ mutations: [{ createIfNotExists: copy }, { delete: { id: m.doc._id } }] }) });
  if (!res.ok) { console.error(`  ✗ ${m.doc._id}: ${res.status} ${(await res.text()).slice(0, 200)}`); process.exitCode = 1; continue; }
  moved++;
}
console.log(`Moved ${moved} of ${moves.length}.`);

const visible = await query(`count(*[_type in ${JSON.stringify(types)}])`, false);
console.log(visible === 0 ? "Checked without a token: none of them can be read." : `Checked without a token: ${visible} can still be read. Look into it.`);
if (visible !== 0) process.exitCode = 1;
