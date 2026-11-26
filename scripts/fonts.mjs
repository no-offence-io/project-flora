#!/usr/bin/env node
/*
 * Puts the two typefaces where the app expects them. Runs before `dev` and `build`.
 *
 * Flöra's brand typefaces are commercially licensed, so the files are not in this repository. The shop's
 * own builds fetch them from its Sanity project, where they sit next to the rest of the brand's files
 * (a document only a server token can read). Anyone else gets two open-licensed stand-ins (Source Serif 4
 * and Source Sans 3, SIL Open Font License), so the project runs out of the box, or can drop their own
 * files at the paths below.
 *
 * Nothing happens when the files are already there, so this costs nothing on a normal `npm run dev`.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Each face is used twice: by next/font for the site, and as a plain file the emails link to. */
const FACES = {
  heading: {
    paths: ["src/app/fonts/AmericanaStdRoman.otf", "public/email/fonts/americana.otf"],
    standIn: "https://github.com/adobe-fonts/source-serif/raw/release/OTF/SourceSerif4-Regular.otf",
    standInName: "Source Serif 4",
  },
  body: {
    paths: ["src/app/fonts/GothamBook.otf", "public/email/fonts/gotham.otf"],
    standIn: "https://github.com/adobe-fonts/source-sans/raw/release/OTF/SourceSans3-Regular.otf",
    standInName: "Source Sans 3",
  },
};

const abs = (p) => path.join(ROOT, p);
const missing = Object.values(FACES).flatMap((f) => f.paths).filter((p) => !fs.existsSync(abs(p)));
if (!missing.length) process.exit(0);

// `next` reads .env.local itself; a plain script has to ask.
for (const f of [".env.local", ".env"]) {
  try { process.loadEnvFile(abs(f)); } catch { /* not there, or already in the environment */ }
}

const isFont = (buf) => ["OTTO", "\u0000\u0001\u0000\u0000", "true", "wOFF", "wOF2"].includes(buf.subarray(0, 4).toString("latin1"));

async function download(url) {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`${res.status} from ${new URL(url).host}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (!isFont(buf)) throw new Error(`what ${new URL(url).host} returned is not a font file`);
  return buf;
}

/** The brand's own files, if this build belongs to a Sanity project that holds them. */
async function brandUrls() {
  const project = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
  const token = process.env.SANITY_TOKEN;
  if (!project || !token) return null;
  const query = encodeURIComponent(`*[_id == "private.brandFonts"][0]{ "heading": heading.asset->url, "body": body.asset->url }`);
  const res = await fetch(`https://${project}.api.sanity.io/v2024-01-01/data/query/${dataset}?query=${query}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Sanity answered ${res.status} when asked for the brand fonts`);
  const { result } = await res.json();
  return result?.heading && result?.body ? result : null;
}

function write(face, buf) {
  for (const p of face.paths) {
    fs.mkdirSync(path.dirname(abs(p)), { recursive: true });
    fs.writeFileSync(abs(p), buf);
  }
}

try {
  const brand = await brandUrls();
  if (brand) {
    for (const [key, face] of Object.entries(FACES)) write(face, await download(brand[key]));
    console.log("fonts: brand typefaces fetched.");
  } else if (process.env.VERCEL_ENV === "production") {
    // The real shop must never go live in the stand-ins by accident.
    throw new Error("the brand typefaces could not be found (SANITY_TOKEN, or the private.brandFonts document), and a production build will not fall back to stand-ins");
  } else {
    for (const face of Object.values(FACES)) write(face, await download(face.standIn));
    console.log(`fonts: using open-licensed stand-ins (${Object.values(FACES).map((f) => f.standInName).join(", ")}). Put your own .otf files at ${Object.values(FACES).map((f) => f.paths[0]).join(" and ")} to replace them.`);
  }
} catch (e) {
  console.error(`fonts: ${e.message}.\nPlace two .otf files at:\n${missing.map((p) => `  ${p}`).join("\n")}`);
  process.exit(1);
}
