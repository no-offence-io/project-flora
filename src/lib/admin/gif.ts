import "server-only";
import { GIFEncoder, applyPalette, quantize } from "gifenc";
import sharp from "sharp";

/*
 * Animated GIFs of a product for the newsletter, made on the server from the product's own photos:
 * each photo is placed on white at the same size, and the frames cross-fade from one to the next
 * with a hold on each. With a single photo the frame instead breathes (a slow zoom in and out),
 * which still reads as alive. Output is sized for email: 360px wide, shown at 240px, which keeps a four-photo GIF around a megabyte.
 */
const W = 360;
const H = 450;
const HOLD_FRAMES = 12; // × 80 ms ≈ 1 s on each photo
const FADE_FRAMES = 8; // × 80 ms ≈ 0.6 s between photos
const DELAY_MS = 80;

async function fetchRgba(url: string, scale = 1): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not fetch ${url}: ${res.status}`);
  const input = Buffer.from(await res.arrayBuffer());
  const w = Math.round(W * scale);
  const h = Math.round(H * scale);
  // Fit inside the (possibly enlarged) frame on white, then crop back to the frame size.
  const fitted = await sharp(input).resize(w, h, { fit: "inside" }).flatten({ background: "#ffffff" }).toBuffer();
  return sharp({ create: { width: w, height: h, channels: 4, background: "#ffffff" } })
    .composite([{ input: fitted, gravity: "centre" }])
    .extract({ left: Math.round((w - W) / 2), top: Math.round((h - H) / 2), width: W, height: H })
    .ensureAlpha()
    .raw()
    .toBuffer();
}

function blend(a: Buffer, b: Buffer, t: number): Uint8Array {
  const out = new Uint8Array(a.length);
  const inv = 1 - t;
  for (let i = 0; i < a.length; i++) out[i] = (a[i] * inv + b[i] * t + 0.5) | 0;
  return out;
}

export async function makeProductGif(imageUrls: string[]): Promise<Buffer> {
  const urls = imageUrls.filter(Boolean).slice(0, 6);
  if (urls.length === 0) throw new Error("The product has no photos to animate");

  const frames: Uint8Array[] = [];
  if (urls.length === 1) {
    const steps = 24;
    const rendered: Buffer[] = [];
    for (let i = 0; i <= steps; i++) rendered.push(await fetchRgba(urls[0], 1 + 0.06 * (i / steps)));
    for (let i = 0; i <= steps; i++) frames.push(new Uint8Array(rendered[i]));
    for (let i = steps; i >= 0; i--) frames.push(new Uint8Array(rendered[i]));
  } else {
    const photos = await Promise.all(urls.map((u) => fetchRgba(u)));
    photos.forEach((photo, i) => {
      for (let k = 0; k < HOLD_FRAMES; k++) frames.push(new Uint8Array(photo));
      const next = photos[(i + 1) % photos.length];
      for (let k = 1; k <= FADE_FRAMES; k++) frames.push(blend(photo, next, k / (FADE_FRAMES + 1)));
    });
  }

  // One palette for the whole animation, sampled across the frames, keeps the fades free of flicker.
  const sample = new Uint8Array(frames[0].length);
  for (let i = 0; i < sample.length; i += 4) {
    const f = frames[Math.floor(i / 4) % frames.length];
    sample[i] = f[i];
    sample[i + 1] = f[i + 1];
    sample[i + 2] = f[i + 2];
    sample[i + 3] = 255;
  }
  const palette = quantize(sample, 256, { format: "rgb444" });
  const gif = GIFEncoder();
  for (const frame of frames) {
    const index = applyPalette(frame, palette, "rgb444");
    gif.writeFrame(index, W, H, { palette, delay: DELAY_MS, repeat: 0 });
  }
  gif.finish();
  return Buffer.from(gif.bytes());
}
