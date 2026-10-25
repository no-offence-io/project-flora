import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "Flöra";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** The card shown when a link to the site is shared: the footer photo with the wordmark over it. */
export default async function OpenGraphImage() {
  const [photo, font] = await Promise.all([
    readFile(join(process.cwd(), "public/footer/footer-bg.jpg")),
    readFile(join(process.cwd(), "src/app/fonts/AmericanaStdRoman.otf")),
  ]);
  const src = `data:image/jpeg;base64,${photo.toString("base64")}`;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: "#000" }}>
        <img src={src} alt="" width={1200} height={630} style={{ objectFit: "cover", width: "100%", height: "100%", objectPosition: "50% 65%" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.6) 100%)" }} />
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: 72 }}>
          <span style={{ fontFamily: "Americana", fontSize: 160, color: "#fff", letterSpacing: 4 }}>FLÖRA</span>
        </div>
      </div>
    ),
    { ...size, fonts: [{ name: "Americana", data: font, style: "normal", weight: 400 }] },
  );
}
