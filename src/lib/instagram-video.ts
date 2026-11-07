import * as THREE from "three";
import { ArrayBufferTarget, Muxer } from "mp4-muxer";
import { TREASURE_BACKGROUND, configureTreasureRenderer, createTreasureScene } from "@/components/treasure-scene";
import type { VintageCardSetting } from "./vintage-card-shared";

/*
 * "Export for Instagram": the treasure card turning exactly once, rendered frame by frame (not
 * recorded off the screen, so the timing is exact and the last frame leads straight into the first:
 * a seamless loop), with the piece's words laid over it, encoded in the browser to an H.264 MP4 that
 * Instagram accepts. Browser only: WebGL, WebCodecs (Chrome, Edge, Safari 16.4+) and the page's fonts.
 */
export const FORMATS = {
  reel: { label: "Reel · 9:16", width: 1080, height: 1920 },
  portrait: { label: "Post · 4:5", width: 1080, height: 1350 },
  square: { label: "Square · 1:1", width: 1080, height: 1080 },
} as const;
export type Format = keyof typeof FORMATS;
export const FPS = 30;
/** How many times larger than the video the 3D is rendered before being scaled down (see composer). */
const SUPERSAMPLE = 2;

export type ExportOptions = {
  src: string;
  setting: VintageCardSetting;
  dark: boolean;
  format: Format;
  /** One full turn takes this long; the video is exactly this long too. */
  seconds: number;
  /** The small line above the name, the name, the price: each only if given. */
  top?: string;
  title?: string;
  price?: string;
  grain: boolean;
};

export type Progress = { phase: "preparing" | "rendering" | "encoding" | "done"; done: number; total: number };

export const canExportVideo = () => typeof window !== "undefined" && typeof VideoEncoder !== "undefined" && typeof VideoFrame !== "undefined";

/** The page's own fonts, by the CSS variables next/font sets on <html>. */
function fontFamily(variable: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  return v ? `${v}, ${fallback}` : fallback;
}

/** A tile of grain for the overlay, drawn once. */
function grainTile(): HTMLCanvasElement {
  const size = 240;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  const img = g.createImageData(size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 128 + Math.round((Math.random() + Math.random() - 1) * 90);
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return c;
}

/** Fits text on one line by shrinking the size (down to a floor) until it is narrower than maxWidth. */
function fitFont(ctx: CanvasRenderingContext2D, text: string, family: string, size: number, minSize: number, maxWidth: number): number {
  let s = size;
  ctx.font = `${s}px ${family}`;
  while (ctx.measureText(text).width > maxWidth && s > minSize) {
    s -= 2;
    ctx.font = `${s}px ${family}`;
  }
  return s;
}

/**
 * Everything needed to draw any moment of the video: the 3D scene on its own canvas and a 2D canvas
 * it is composited onto with grain and text. `scale` renders a smaller copy (for the preview).
 */
async function composer(opts: ExportOptions, scale = 1) {
  const { width: W0, height: H0 } = FORMATS[opts.format];
  const width = Math.round(W0 * scale);
  const height = Math.round(H0 * scale);
  const u = width / 1080; // one "design pixel"

  // The 3D is drawn at twice the video's size and scaled down onto it: smoother edges than the
  // renderer's own anti-aliasing alone gives, which matters on a phone screen at full size.
  const gl = document.createElement("canvas");
  const renderer = new THREE.WebGLRenderer({ canvas: gl, antialias: true, alpha: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(SUPERSAMPLE);
  renderer.setSize(width, height, false);
  configureTreasureRenderer(renderer, opts.dark);
  const built = createTreasureScene(renderer, { src: opts.src, dark: opts.dark, setting: opts.setting });

  // Layout: with words, the card sits in a box in the upper part and the words start lower down;
  // without, the card takes most of the frame.
  const hasText = Boolean(opts.top || opts.title || opts.price);
  const boxTop = Math.round(height * (hasText ? 0.05 : 0.1));
  const boxHeight = Math.round(height * (hasText ? 0.58 : 0.72));
  built.frame(width, height, boxTop, boxHeight);

  const out = document.createElement("canvas");
  out.width = width;
  out.height = height;
  const ctx = out.getContext("2d")!;
  const gotham = fontFamily("--font-gotham", "Arial, Helvetica, sans-serif");
  const americana = fontFamily("--font-americana", "'Times New Roman', serif");
  await Promise.all([document.fonts.load(`${Math.round(26 * u)}px ${gotham}`), document.fonts.load(`${Math.round(92 * u)}px ${americana}`), built.ready]);
  const tile = opts.grain ? grainTile() : null;

  const drawFrame = (t: number, frameIndex: number) => {
    // One full turn in exactly one video; the bob is one full wave too, so the loop is seamless.
    built.card.rotation.set(0.08, Math.PI * 2 * t, 0);
    built.card.position.y = Math.sin(Math.PI * 2 * t) * 0.12;
    renderer.render(built.scene, built.camera);

    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.fillStyle = TREASURE_BACKGROUND(opts.dark);
    ctx.fillRect(0, 0, width, height);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(gl, 0, 0, width, height);

    if (tile) {
      // Grain: the tile at a different offset each frame, like the moving grain on the page.
      ctx.globalCompositeOperation = "overlay";
      ctx.globalAlpha = opts.dark ? 0.1 : 0.07;
      const ox = -((frameIndex * 97) % tile.width);
      const oy = -((frameIndex * 61) % tile.height);
      for (let y = oy; y < height; y += tile.height) for (let x = ox; x < width; x += tile.width) ctx.drawImage(tile, x, y);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
    }

    if (hasText) {
      const muted = opts.dark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)";
      const strong = opts.dark ? "#ffffff" : "#000000";
      const soft = opts.dark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)";
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      const x = width / 2;
      let y = height * (opts.format === "square" ? 0.76 : 0.75);
      const spacing = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
      if (opts.top) {
        ctx.fillStyle = muted;
        ctx.font = `${Math.round(26 * u)}px ${gotham}`;
        if ("letterSpacing" in spacing) spacing.letterSpacing = `${Math.round(5.2 * u)}px`;
        ctx.fillText(opts.top.toUpperCase(), x, y + 26 * u);
        y += 26 * u + 34 * u;
      }
      if (opts.title) {
        ctx.fillStyle = strong;
        if ("letterSpacing" in spacing) spacing.letterSpacing = `${Math.round(3.7 * u)}px`;
        const size = fitFont(ctx, opts.title.toUpperCase(), americana, Math.round(92 * u), Math.round(48 * u), width * 0.86);
        ctx.fillText(opts.title.toUpperCase(), x, y + size * 0.9);
        y += size * 0.9 + 34 * u;
      }
      if (opts.price) {
        ctx.fillStyle = soft;
        ctx.font = `${Math.round(34 * u)}px ${gotham}`;
        if ("letterSpacing" in spacing) spacing.letterSpacing = "0px";
        ctx.fillText(opts.price, x, y + 34 * u);
      }
    }
  };

  const dispose = () => {
    built.dispose();
    renderer.dispose();
  };
  return { width, height, out, drawFrame, dispose };
}

/** The first frame as a picture, for the preview. */
export async function renderStill(opts: ExportOptions, scale = 0.4): Promise<string> {
  const c = await composer(opts, scale);
  try {
    c.drawFrame(0, 0);
    return c.out.toDataURL("image/jpeg", 0.9);
  } finally {
    c.dispose();
  }
}

/** The video, as an MP4 blob. Reports progress; the signal cancels. */
export async function recordVideo(opts: ExportOptions, onProgress: (p: Progress) => void, signal?: AbortSignal): Promise<Blob> {
  if (!canExportVideo()) throw new Error("This browser can't make videos. Use Chrome, Edge or Safari.");
  onProgress({ phase: "preparing", done: 0, total: 1 });
  const total = Math.round(opts.seconds * FPS);
  const c = await composer(opts, 1);
  const { width, height } = c;
  const muxer = new Muxer({ target: new ArrayBufferTarget(), video: { codec: "avc", width, height }, fastStart: "in-memory" });
  let failure: Error | null = null;
  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => {
      failure = e;
    },
  });
  try {
    // H.264 High profile; the level has to allow 1080 × 1920 at 30 frames a second (4.1 and up).
    let config: VideoEncoderConfig | null = null;
    for (const codec of ["avc1.640029", "avc1.64002a", "avc1.4d0029", "avc1.42e029"]) {
      const candidate: VideoEncoderConfig = { codec, width, height, bitrate: 12_000_000, framerate: FPS, latencyMode: "quality", avc: { format: "avc" } };
      if ((await VideoEncoder.isConfigSupported(candidate)).supported) {
        config = candidate;
        break;
      }
    }
    if (!config) throw new Error("This browser can't encode H.264 video at this size.");
    encoder.configure(config);

    for (let i = 0; i < total; i++) {
      if (signal?.aborted) throw new DOMException("Cancelled", "AbortError");
      if (failure) throw failure;
      c.drawFrame(i / total, i);
      const frame = new VideoFrame(c.out, { timestamp: Math.round((i * 1_000_000) / FPS), duration: Math.round(1_000_000 / FPS) });
      encoder.encode(frame, { keyFrame: i % (FPS * 2) === 0 });
      frame.close();
      onProgress({ phase: "rendering", done: i + 1, total });
      // Don't run ahead of the encoder, and give the page a moment to paint the progress.
      while (encoder.encodeQueueSize > 6) await new Promise<void>((r) => encoder.addEventListener("dequeue", () => r(), { once: true }));
      if (i % 2 === 0) await new Promise<void>((r) => setTimeout(r, 0));
    }
    onProgress({ phase: "encoding", done: total, total });
    await encoder.flush();
    if (failure) throw failure;
    encoder.close();
    muxer.finalize();
    onProgress({ phase: "done", done: total, total });
    return new Blob([muxer.target.buffer], { type: "video/mp4" });
  } finally {
    if (encoder.state !== "closed") encoder.close();
    c.dispose();
  }
}
