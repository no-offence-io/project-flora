"use client";

import { useState } from "react";
import type { LocalizedString } from "@/lib/admin/localized";

/*
 * The product's colours, made for someone who has never heard of a hex code. Each colour is:
 *
 *   1. its photos: tap as many of the product's own photos as show this colour (no second upload);
 *      the first one tapped is the main one, shown when the swatch is hovered in the shop;
 *   2. a swatch: worked out from the main photo by itself, changeable with the system colour picker;
 *   3. a name: suggested from the swatch ("Blue" / "Blå"), changeable.
 *
 * It posts the same numbered fields the save action has always read (colorKey_i, colorName_i.en,
 * colorHex_i …), plus colorPhotos_i: the keys of the product photos picked, main first. The action
 * keeps those keys and copies the main photo, placement and name included, into the colour. A colour
 * saved before photos could be picked keeps its own photo until photos are picked for it. A colour
 * taken out of the list is simply not posted, and so not saved.
 */

export type ColourPhoto = { key: string; ref: string; url: string };
export type SavedColour = {
  _key: string;
  photoKeys?: string[] | null;
  name?: LocalizedString;
  hex?: string;
  image?: { _ref: string; url: string; alt?: LocalizedString | null; scale?: number | null; x?: number | null; y?: number | null } | null;
};

type Row = {
  id: string;
  key: string;
  en: string;
  no: string;
  hex: string;
  /** Keys of the product photos showing this colour, main first. */
  photos: string[];
  /** A photo of its own from before photos could be picked; kept until photos are picked or it is let go. */
  own: SavedColour["image"];
  /** Whether the name was typed by hand; a suggested name is replaced when the swatch changes. */
  named: boolean;
};

const text = (arr: LocalizedString | undefined, lang: string) => arr?.find((v) => v._key === lang)?.value ?? "";
const fullHex = (h: string) => (/^#[0-9a-f]{3}$/i.test(h) ? `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}` : h).toLowerCase();
const isHex = (h: string) => /^#([0-9a-f]{3}){1,2}$/i.test(h);

/* --- naming: the nearest of a short list of everyday colour words --- */
const NAMES: [string, string, [number, number, number]][] = [
  ["Black", "Svart", [20, 20, 20]],
  ["Charcoal", "Koksgrå", [64, 64, 66]],
  ["Grey", "Grå", [128, 128, 130]],
  ["Light grey", "Lysegrå", [195, 195, 197]],
  ["White", "Hvit", [245, 245, 243]],
  ["Cream", "Krem", [240, 230, 205]],
  ["Beige", "Beige", [215, 195, 160]],
  ["Sand", "Sand", [196, 170, 130]],
  ["Taupe", "Taupe", [128, 115, 105]],
  ["Brown", "Brun", [110, 70, 40]],
  ["Camel", "Kamel", [190, 140, 85]],
  ["Rust", "Rust", [170, 75, 40]],
  ["Red", "Rød", [190, 30, 40]],
  ["Burgundy", "Vinrød", [110, 25, 40]],
  ["Pink", "Rosa", [235, 160, 180]],
  ["Dusty pink", "Støvrosa", [200, 150, 150]],
  ["Orange", "Oransje", [240, 130, 40]],
  ["Yellow", "Gul", [240, 210, 60]],
  ["Olive", "Oliven", [110, 115, 60]],
  ["Green", "Grønn", [50, 130, 70]],
  ["Dark green", "Mørkegrønn", [30, 70, 45]],
  ["Sage", "Salvie", [160, 175, 145]],
  ["Turquoise", "Turkis", [60, 180, 180]],
  ["Light blue", "Lyseblå", [160, 195, 225]],
  ["Blue", "Blå", [50, 90, 170]],
  ["Navy", "Marineblå", [30, 40, 80]],
  ["Lilac", "Syrin", [190, 165, 210]],
  ["Purple", "Lilla", [110, 60, 130]],
];

function nameFor(hex: string): { en: string; no: string } {
  const h = fullHex(hex);
  const rgb = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  let best = NAMES[0];
  let bestD = Infinity;
  for (const n of NAMES) {
    // Red and blue weighted as the eye weighs them, roughly.
    const d = 2 * (rgb[0] - n[2][0]) ** 2 + 4 * (rgb[1] - n[2][1]) ** 2 + 3 * (rgb[2] - n[2][2]) ** 2;
    if (d < bestD) {
      bestD = d;
      best = n;
    }
  }
  return { en: best[0], no: best[1] };
}

/* --- the swatch from a photo: the commonest colour that isn't the backdrop --- */
async function colourOf(url: string): Promise<string | null> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  // Through the site's own image endpoint: same origin, so the pixels may be read (Sanity's CDN sends no CORS header).
  img.src = url.startsWith("/") ? url : `/_next/image?url=${encodeURIComponent(url)}&w=128&q=75`;
  try {
    await img.decode();
  } catch {
    return null;
  }
  const size = 80;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, size, size);
  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(0, 0, size, size).data;
  } catch {
    return null; // a picture from somewhere that doesn't allow reading its pixels
  }
  const at = (x: number, y: number) => {
    const i = (y * size + x) * 4;
    return [data[i], data[i + 1], data[i + 2], data[i + 3]];
  };
  // The backdrop: the corners, which on a product photo are floor, wall or studio paper.
  const corners = [at(1, 1), at(size - 2, 1), at(1, size - 2), at(size - 2, size - 2)];
  const backdrop = [0, 1, 2].map((c) => corners.reduce((t, p) => t + p[c], 0) / 4);
  const buckets = new Map<string, { n: number; r: number; g: number; b: number }>();
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = at(x, y);
      if (a < 128) continue;
      const fromBackdrop = Math.abs(r - backdrop[0]) + Math.abs(g - backdrop[1]) + Math.abs(b - backdrop[2]);
      if (fromBackdrop < 45) continue;
      // The middle of the picture counts double: that is where the piece usually is.
      const weight = Math.abs(x - size / 2) < size / 4 && Math.abs(y - size / 2) < size / 4 ? 2 : 1;
      const key = `${r >> 5}-${g >> 5}-${b >> 5}`;
      const cell = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
      cell.n += weight;
      cell.r += r * weight;
      cell.g += g * weight;
      cell.b += b * weight;
      buckets.set(key, cell);
    }
  }
  const top = [...buckets.values()].sort((a, b) => b.n - a.n)[0];
  if (!top) return null;
  const hex = (v: number) => Math.round(v / top.n).toString(16).padStart(2, "0");
  return `#${hex(top.r)}${hex(top.g)}${hex(top.b)}`;
}

let counter = 0;
const newId = () => `row-${Date.now().toString(36)}-${counter++}`;

export default function ColourList({ photos, saved }: { photos: ColourPhoto[]; saved: SavedColour[] }) {
  const [rows, setRows] = useState<Row[]>(() =>
    saved.map((c) => {
      const known = (c.photoKeys ?? []).filter((k) => photos.some((p) => p.key === k));
      // Before photos could be picked a colour had one photo; if it is one of the product's photos, that becomes the pick.
      const match = !known.length && c.image ? photos.find((p) => p.ref === c.image!._ref) : undefined;
      const picked = known.length ? known : match ? [match.key] : [];
      return { id: c._key, key: c._key, en: text(c.name, "en"), no: text(c.name, "no"), hex: c.hex ?? "", photos: picked, own: picked.length ? null : (c.image ?? null), named: true };
    }),
  );
  const [busy, setBusy] = useState<string | null>(null);

  const update = (id: string, patch: Partial<Row>) => setRows((all) => all.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const setSwatch = (id: string, hex: string) =>
    setRows((all) =>
      all.map((r) => {
        if (r.id !== id) return r;
        // Fill in the name from the swatch until someone types their own.
        const suggested = !r.named || (!r.en && !r.no) ? nameFor(hex) : null;
        return { ...r, hex, ...(suggested ? { en: suggested.en, no: suggested.no, named: false } : {}) };
      }),
    );

  /** Tap to add a photo to the colour, tap again to take it off. The first one in becomes the main photo and sets the swatch. */
  const togglePhoto = async (row: Row, photo: ColourPhoto) => {
    const on = row.photos.includes(photo.key);
    const photos = on ? row.photos.filter((k) => k !== photo.key) : [...row.photos, photo.key];
    update(row.id, { photos, own: photos.length ? null : row.own });
    const newMain = photos[0] && photos[0] !== row.photos[0] ? photosByKey.get(photos[0]) : undefined;
    if (newMain && (!row.hex || !row.named || row.photos.length === 0)) {
      setBusy(row.id);
      const hex = await colourOf(newMain.url);
      setBusy(null);
      if (hex) setSwatch(row.id, hex);
    }
  };
  const makeMain = (row: Row, key: string) => update(row.id, { photos: [key, ...row.photos.filter((k) => k !== key)] });
  const photosByKey = new Map(photos.map((p) => [p.key, p]));
  const add = () => setRows((all) => [...all, { id: newId(), key: "", en: "", no: "", hex: "", photos: [], own: null, named: false }]);
  const remove = (id: string) => setRows((all) => all.filter((r) => r.id !== id));

  const label = "text-[11px] leading-normal text-black";
  const field = "w-full border border-black/20 bg-transparent p-[12px] font-gotham text-paragraph text-black outline-none placeholder:text-black/50 focus:border-black/60";

  return (
    <div className="flex flex-col gap-[24px] font-gotham text-paragraph text-black">
      <input type="hidden" name="colorCount" value={rows.length} />

      {rows.length === 0 && <p className="m-0 text-[11px] leading-normal text-black/50">No colours. That is fine for a piece that comes in one colour.</p>}

      {rows.map((row, i) => (
        <div key={row.id} className="flex flex-col gap-[18px] border-[0.5px] border-black/25 p-[12px] md:p-[18px]">
          <input type="hidden" name={`colorKey_${i}`} value={row.key} />
          <input type="hidden" name={`colorPhotos_${i}`} value={row.photos.join(",")} />
          {row.own && <input type="hidden" name={`colorImage_${i}.existing`} value={row.own._ref} />}

          <div className="flex items-center justify-between gap-[12px]">
            <span className="flex items-center gap-[10px]">
              <span aria-hidden className="inline-block h-[20px] w-[20px] rounded-full border border-black/20" style={{ backgroundColor: isHex(row.hex) ? row.hex : "transparent" }} />
              <span>{row.en || `Colour ${i + 1}`}</span>
            </span>
            <button type="button" onClick={() => remove(row.id)} className="text-[11px] leading-normal text-black/50 underline hover:text-black">
              Remove colour
            </button>
          </div>

          {/* 1. Photos */}
          <div className="flex flex-col gap-[8px]">
            <span className={label}>
              1. Which photos show this colour? <span className="text-black/50">Tap all that do. The first one is the main photo.</span>
            </span>
            {photos.length === 0 ? (
              <span className="text-[11px] leading-normal text-black/50">Add photos above and save first; then pick them here.</span>
            ) : (
              <div className="grid grid-cols-4 gap-[8px] md:grid-cols-6">
                {photos.map((p) => {
                  const at = row.photos.indexOf(p.key);
                  const on = at >= 0;
                  return (
                    <div key={p.key} className="flex flex-col gap-[4px]">
                      <button
                        type="button"
                        onClick={() => togglePhoto(row, p)}
                        aria-pressed={on}
                        aria-label={on ? "Take this photo off the colour" : "Add this photo to the colour"}
                        className={`relative aspect-[4/5] overflow-hidden bg-[#f7f7f7] outline-offset-2 transition-[outline-color,opacity] ${on ? "outline outline-2 outline-black" : "opacity-60 outline outline-1 outline-black/10 hover:opacity-100 hover:outline-black/40"}`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element -- small Sanity thumbnails, sized by the CDN */}
                        <img src={`${p.url}?w=200&q=70&auto=format`} alt="" className="absolute inset-0 h-full w-full object-contain p-[6px]" />
                        {on && <span className="absolute top-[4px] right-[4px] flex h-[18px] min-w-[18px] items-center justify-center bg-black px-[4px] text-[11px] text-white">{at === 0 ? "Main" : at + 1}</span>}
                      </button>
                      {on && at > 0 && (
                        <button type="button" onClick={() => makeMain(row, p.key)} className="text-[11px] leading-normal text-black/50 underline hover:text-black">
                          Make main
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {row.own && row.photos.length === 0 && (
              <div className="flex items-center gap-[10px] text-[11px] leading-normal text-black/50">
                {/* eslint-disable-next-line @next/next/no-img-element -- a small Sanity thumbnail */}
                <img src={`${row.own.url}?w=80&q=70&auto=format`} alt="" className="h-[50px] w-[40px] bg-[#f7f7f7] object-contain" />
                <span>
                  Uses a photo of its own from before. Tap photos above to use those instead, or{" "}
                  <button type="button" onClick={() => update(row.id, { own: null })} className="underline hover:text-black">
                    take it off
                  </button>
                  .
                </span>
              </div>
            )}
          </div>

          {/* 2. Swatch */}
          <div className="flex flex-col gap-[8px]">
            <span className={label}>2. The little colour dot in the shop</span>
            <div className="flex flex-wrap items-center gap-[12px]">
              <label className="relative h-[44px] w-[44px] shrink-0 cursor-pointer overflow-hidden rounded-full border border-black/20" style={{ backgroundColor: isHex(row.hex) ? fullHex(row.hex) : "#ffffff" }} title="Choose a colour">
                <input type="color" value={isHex(row.hex) ? fullHex(row.hex) : "#000000"} onChange={(e) => setSwatch(row.id, e.target.value)} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" aria-label="Choose the colour" />
              </label>
              <span className="flex min-w-0 flex-col gap-[2px] text-[11px] leading-normal text-black/50">
                {busy === row.id ? "Reading the colour from the photo…" : row.hex ? "Taken from the main photo. Tap the dot to change it." : "Pick a photo and it fills in by itself, or tap the dot."}
                <input
                  name={`colorHex_${i}`}
                  value={row.hex}
                  onChange={(e) => update(row.id, { hex: e.target.value.trim() })}
                  required
                  pattern="#([0-9a-fA-F]{3}){1,2}"
                  placeholder="#rrggbb"
                  aria-label="Colour code"
                  title="Pick a photo or tap the dot to choose the colour"
                  className="w-[96px] border-b border-black/20 bg-transparent py-[2px] font-gotham text-[11px] text-black/60 outline-none focus:border-black/60"
                />
              </span>
            </div>
          </div>

          {/* 3. Name */}
          <div className="flex flex-col gap-[8px]">
            <span className={label}>3. Its name {!row.named && row.en ? <span className="text-black/50">(suggested, change it if you like)</span> : null}</span>
            <div className="flex flex-col gap-[12px] md:flex-row md:gap-[24px]">
              <label className="flex min-w-0 flex-1 flex-col gap-[6px] text-[11px] leading-normal text-black">
                English
                <input name={`colorName_${i}.en`} value={row.en} onChange={(e) => update(row.id, { en: e.target.value, named: true })} required placeholder="e.g. Taupe" className={field} />
              </label>
              <label className="flex min-w-0 flex-1 flex-col gap-[6px] text-[11px] leading-normal text-black">
                Norsk
                <input name={`colorName_${i}.no`} value={row.no} onChange={(e) => update(row.id, { no: e.target.value, named: true })} placeholder="Leave empty to show English" className={field} />
              </label>
            </div>
          </div>
        </div>
      ))}

      <button type="button" onClick={add} className="flex items-center justify-center gap-[8px] border border-dashed border-black/40 py-[14px] text-black transition-colors hover:border-black">
        <span aria-hidden className="text-[18px] leading-none">+</span> Add a colour
      </button>
    </div>
  );
}
